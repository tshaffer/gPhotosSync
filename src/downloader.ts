import * as fs from 'fs-extra';
import path from 'path';
import Moment from 'Moment';

import mkdirp from 'mkdirp';

import { log } from './log';
import * as util from './util';
import { SearchFilters, DateFilter } from './googlePhotos';

import config from './config.json'

export class Downloader {

  photoDb: any;
  googlePhotos: any;
  downloadPath: string;
  pageSize: number;

  constructor(photoDb: any, googlePhotos: any, downloadPath: any) {
    this.photoDb = photoDb;
    this.googlePhotos = googlePhotos;

    this.downloadPath = downloadPath;
    mkdirp(downloadPath);
    this.pageSize = 100;
  }

  async searchAlbums(albumId: any, hintNumOfItemsLimit: any) {
    log.info(this, 'searchAlbums');
    albumId = 'AEEKk93B2V5NL7n5cYRF4wGVdxMX86WI1VHAvzljmtvJSR26MJbJwPSowN3bbG2jXWw9cqBGX5pc';
    const searchFilters = { albumId };

    return this._search(searchFilters, hintNumOfItemsLimit);
  }

  async searchMediaItems(numOfDaysBack: any, hintNumOfItemsLimit: any) {
    log.info(this, 'searchMediaItems', numOfDaysBack, hintNumOfItemsLimit);
    const searchFilters = this._createSearchFilters(numOfDaysBack);

    return this._search(searchFilters, hintNumOfItemsLimit);
  }

  _createSearchFilters(numOfDaysBack: any) {
    const today = Moment().format('YYYY MM DD').split(' ');
    const prev = Moment().subtract(numOfDaysBack, 'days').format('YYYY MM DD').split(' ');

    const includeArchived = true;
    const searchFilters = new SearchFilters(includeArchived);
    const dateFilter = new DateFilter();
    dateFilter.addRangeFilter({
      startDate: {
        year: prev[0], month: prev[1], day: prev[2]
      },
      endDate: {
        year: today[0], month: today[1], day: today[2]
      }
    });

    searchFilters.setDateFilter(dateFilter);
    return searchFilters;
  }

  async _search(searchFilters: any, hintNumOfItemsLimit: any) {
    const mediaItems: any[] = [];
    let nextPageToken = null;

    const pageSize = Math.min(this.pageSize, hintNumOfItemsLimit);
    do {
      const body: any = await this.googlePhotos.search(searchFilters, pageSize, nextPageToken);
      nextPageToken = body.nextPageToken;
      body.mediaItems.forEach((mediaItem: any) => mediaItems.push(mediaItem));

      log.verbose(this, `searchMediaItems found: ${body.mediaItems.length} total found: ${mediaItems.length} next page: ${!!nextPageToken}`);
    } while (nextPageToken && mediaItems.length < hintNumOfItemsLimit);

    return mediaItems;
  }

  async downloadMediaItemFiles(mediaItems: any) {
    log.verbose(this, 'downloadMediaItemFiles', mediaItems.length);

    const groups = util.createGroups(mediaItems, config.downloader.maxDownloadFilesAtOnce);
    log.verbose(this, 'downloadMediaItemFiles created groups', groups.length, mediaItems.length);

    const files: any[] = [];

    for (const group of groups) {
      const filesDownloaded = await Promise.all(this._downloadMediaItemFiles(group));
      filesDownloaded.forEach(file => files.push(file));
    }

    return files;
  }

  _downloadMediaItemFiles(mediaItems: any) {
    log.verbose(this, '_downloadMediaItemFiles downloading items num:', mediaItems.length);

    return mediaItems.map(async (mediaItem: any) => {
      log.info(this, 'Downloading ', mediaItem.filename);
      const filename = this._getFilenameForMediaItem(mediaItem);
      const where = path.join(this.downloadPath, filename);
      const stream = await this.googlePhotos.createDownloadStream(mediaItem);

      return new Promise((resolve, reject) => {
        stream.pipe(fs.createWriteStream(where)
          .on('close', () => {
            this._setFileTimestamp(where, mediaItem);
            resolve({ valid: true, where, mediaItem });
          }))
          .on('error', (err: any) => {
            log.error(this, 'error downloading a file', where, err);
            resolve({ valid: false, where, mediaItem });
          });
      });
    });
  }

  _setFileTimestamp(where: any, mediaItem: any) {
    const date = Moment(mediaItem.mediaMetadata.creationTime).toDate();
    fs.utimesSync(where, date, date);
  }

  _getFilenameForMediaItem(mediaItem: any) {
    let filename = mediaItem.filename;

    const storedItem = this.photoDb.get(mediaItem.id);
    if (storedItem && storedItem.altFilename) {
      filename = storedItem.altFilename;
    }

    return filename;
  }

  async probeMediaItems(mediaItemIds: any) {
    const mediaItems = await this.googlePhotos.batchGet(mediaItemIds);

    const contentLengthMap: any = {};

    await Promise.all(mediaItems.map(async (mediaItem: any) => {
      const { statusCode, headers } = await this.googlePhotos.probeUrlForContentLength(mediaItem);

      if (statusCode >= 200 && statusCode < 300) {
        contentLengthMap[mediaItem.id] = headers['content-length'];
      } else {
        log.error(this, `${mediaItem.id} status code is ${statusCode}`);
      }
    }));

    return contentLengthMap;
  }

  getExistingFiles() {
    const filenames = fs.readdirSync(this.downloadPath);

    return filenames.map(filename => {
      const where = path.join(this.downloadPath, filename);
      const stats = fs.statSync(where);

      return { where, filename, fileSize: stats.size };
    });
  }
}
