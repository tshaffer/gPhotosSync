import * as fs from 'fs-extra';
import path from 'path';
import lo from 'lodash';

import Moment from 'moment';

import * as util from './util';
// import { log } from './log';

const __referenceStoredItem = {
  mediaItem: {},
  appData: {
    mediaItemGet: {
      at: Date.now()
    },
    probe: {
      at: Date.now(),
      contentLength: 123
    },
    download: {
      at: Date.now(),
      contentLength: 123
    }
  }
};

export class AppController {

  photoDb: any;
  albumDb: any;
  googlePhotos: any;
  downloadPath: any;

  constructor(photoDb: any, albumDb: any, googlePhotos: any, downloadPath: any) {
    this.photoDb = photoDb;
    this.albumDb = albumDb;
    this.googlePhotos = googlePhotos;
    this.downloadPath = downloadPath;
  }

  onAlbums(albums: any) {
    // log.info(this, 'onAlbums');
    console.log('onAlbums');

    const maxTitleStringLen = albums.reduce((prev: any, curr: any) => Math.max(prev, curr.title.length), 0);

    albums.forEach((album: any) => {
      album.items = [];
      this.albumDb.set(album.id, album);

      // log.info(this, album.title.padEnd(maxTitleStringLen), album.id)
      console.log(album.title.padEnd(maxTitleStringLen), album.id);
    });
  }

  onRefreshAlbum(album: any, items: any) {
    // log.info(this, 'onRefreshAlbum');

    album.items = items;
    const albums = [album];
    this.onAlbums(albums);
  }

  onMediaItemsDownloaded(mediaItems: any) {
    // log.info(this, 'onMediaItemsDownloaded', mediaItems.length);

    const storedItems = mediaItems.map((mediaItem: any) => {
      let storedItem = this.photoDb.get(mediaItem.id);

      if (storedItem == null) {
        storedItem = { mediaItem, appData: {} };
      } else {
        storedItem.mediaItem = mediaItem;
      }

      return this.photoDb.set(mediaItem.id, storedItem);
    });

    // log.info(this, 'onMediaItemsDownloaded total media items', this.photoDb.getAll().length);
    this._fixFilenamesForDuplicates();
    return storedItems;
  }

  _fixFilenamesForDuplicates() {
    const duplicates: any = this._getStoredItemsWithDuplicateFilenames();

    // log.info(this, 'fixFilenamesForDuplicates found duplicates', Object.keys(duplicates).length);

    for (const filename in duplicates) {
      if (Object.prototype.hasOwnProperty.call(duplicates, filename)) {
        const element = duplicates[filename];
        duplicates[filename].storedItems.forEach((storedItem: any, idx: any) => {
          storedItem.altFilename = `${idx}_${filename}`;
          this.photoDb.set(storedItem.mediaItem.id, storedItem);
        });
      }
    }
  }

  _getStoredItemsWithDuplicateFilenames() {
    const counts: any = {
      // 'filename': { count: 0, ids: [] }
    };

    this._getAllMediaItems()
      .filter((storedItem: any) => !storedItem.altFilename)
      .map((storedItem: any) => {
        const lowercaseFilename: any = storedItem.mediaItem.filename.toLowerCase();
        const count: any = counts[lowercaseFilename] || { count: 0, storedItems: [] };
        count.count++;
        count.storedItems.push(storedItem);

        counts[lowercaseFilename] = count;
      });

    const duplicates: any = {};
    Object.keys(counts)
      .filter(filename => counts[filename].count > 1)
      .forEach(filename => duplicates[filename] = counts[filename]);

    return duplicates;
  }

  _getAllMediaItems() {
    return this.photoDb.getByFilter((value: any) => value.mediaItem);
  }

  findMediaItemIdsToProbe(renewIfOlderThanDays: any, numberOfItems: any) {
    // log.verbose(this, 'findMediaItemIdsToProbe', renewIfOlderThanDays, numberOfItems);

    const storedItemsToProbe = this.photoDb.getByFilter(
      this._createProbeFilterFn(renewIfOlderThanDays)
    ).slice(0, numberOfItems);

    // log.verbose(this, 'storedItemsToProbe', storedItemsToProbe.length);

    return storedItemsToProbe.map((item: any) => item.mediaItem.id);
  }

  _createProbeFilterFn(renewIfOlderThanDays: any) {
    return (value: { appData: { probe: { at: any; }; }; }) => {
      let probeDataIsOld = true;

      if (value.appData.probe) {
        const diff = util.diffBetweenTwoDates(value.appData.probe.at, Date.now(), 'days');
        probeDataIsOld = diff >= renewIfOlderThanDays;
      }

      return probeDataIsOld;
    };
  }

  onProbedMediaItems(contentLengthMap: any) {
    // log.info(this, 'onProbedMediaItems', Object.keys(contentLengthMap).length);

    const keys = Object.keys(contentLengthMap);
    const storedItems = keys.map(key => {
      const storedItem = this.photoDb.get(key);

      const probeData = storedItem.appData.probe || { at: 0, contentLength: 0 };
      probeData.at = Date.now();
      probeData.contentLength = Number(contentLengthMap[key]);
      storedItem.appData.probe = probeData;

      this.photoDb.set(storedItem.mediaItem.id, storedItem);
      return storedItem;
    });

    // const forDownload = this._chooseFilesForDownload(storedItems, contentLengthMap);
    const forDownload = this._chooseFilesForDownload(storedItems);
    // log.verbose(this, 'onProbedMediaItems for download', forDownload.length);

    forDownload
      .map((storedItem: any) => {
        storedItem.appData.download = null;
        return storedItem;
      })
      .map((storedItem: any) => this.photoDb.set(storedItem.mediaItem.id, storedItem));
  }

  _chooseFilesForDownload(storedItems: any) {
    return storedItems.filter((storedItem: any) => {
      if (storedItem.appData.probe && storedItem.appData.download) {
        const pcl = storedItem.appData.probe.contentLength;
        const dcl = storedItem.appData.download.contentLength;

        return pcl !== dcl;
      }

      return false;
    });
  }

  async renewMediaItems(mediaItemIds: any) {
    // log.info(this, 'renewMediaItems', mediaItemIds.length);
    const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);
    return this.onMediaItemsDownloaded(mediaItems);
  }

  findMediaItemsToDownload(numberOfItems: any) {
    // log.verbose(this, 'findMediaItemsToDownload', numberOfItems);

    const storedItemsToDownload = this.photoDb.getByFilter(
      this._createDownloadFilterFn(), numberOfItems
    ).slice(0, numberOfItems);

    // log.verbose(this, 'findMediaItemsToDownload stored items', storedItemsToDownload.length);

    return storedItemsToDownload.map((storedItem: any) => storedItem.mediaItem.id);
  }

  _createDownloadFilterFn() {
    return (value: any) => {
      let isContentLengthSame = false;
      let isFileExists = false;
      let isFileSizeSame = false;

      if (value.mediaItem) {
        if (value.appData.download && value.appData.probe) {
          isContentLengthSame = value.appData.probe.contentLength === value.appData.download.contentLength;
        } else {
          isContentLengthSame = true;
        }

        const filename = this._getStoredItemFilename(value);
        const filepath = path.join(this.downloadPath, filename);
        isFileExists = fs.existsSync(filepath);

        if (isFileExists) {
          const contentLength = lo.get(value.appData, 'probe.contentLength') || lo.get(value.appData, 'download.contentLength');
          const stat = fs.statSync(filepath);
          isFileSizeSame = stat.size === contentLength;
        }
      }

      return !(isContentLengthSame && isFileExists && isFileSizeSame);
    };
  }

  getStoredItemsByFilenameMap(filenames: any) {
    const filenamesSet: any = new Set(filenames);

    const map: any = {};

    this.photoDb.getAll().forEach((storedItem: any) => {
      const filename: any = this._getStoredItemFilename(storedItem);

      if (filenamesSet.has(filename)) {
        map[filename] = {
          filename,
          storedItem
        };
      }
    });

    return map;
  }

  _getStoredItemFilename(storedItem: any) {
    return storedItem.altFilename || storedItem.mediaItem.filename;
  }

  onFilesDownloaded(files: any[]) {
    // file = { where: String, mediaItem }

    return files.map(({ valid, where, mediaItem }) => {
      if (!valid) {
        return;
      }

      const stat = fs.statSync(where);
      const download = {
        at: Date.now(),
        contentLength: stat.size
      };

      const date = Moment(mediaItem.mediaMetadata.creationTime).toDate();
      fs.utimesSync(where, date, date);

      const storedItem = this.photoDb.get(mediaItem.id);
      storedItem.appData.download = download;
      return this.photoDb.set(mediaItem.id, storedItem);
    });
  }

  hasStoredItemDiscrepancy(storedItem: any) {
    if (storedItem.appData.probe && storedItem.appData.download) {
      const pcl = storedItem.appData.probe.contentLength;
      const dcl = storedItem.appData.download.contentLength;

      return pcl !== dcl;
    }

    return true;
  }
}
