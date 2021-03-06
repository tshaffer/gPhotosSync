import { AuthService } from './authService';
import request from 'request';

import * as util from './util';
import { log } from './log';
import {
  DbMediaItem,
  GoogleMediaItem
} from './types';

import Mediaitem from './models/Mediaitem';

import {
  // Query, 
  Document,
  // Model, 
  // Schema,
} from 'mongoose';
import { add, isArray } from 'lodash';

export class GooglePhotos {

  authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  static photosApiReadOnlyScope() {
    return 'https://www.googleapis.com/auth/photoslibrary.readonly';
  }

  async listLibraryContents(nextPageToken: any = null) {

    let addedToDb = false;

    const googleMediaItems: GoogleMediaItem[] = [];

    let url = GooglePhotoAPIs.mediaItems;
    do {
      if (nextPageToken != null) {
        url = `${GooglePhotoAPIs.mediaItems}?pageToken=${nextPageToken}`;
      }

      try {
        const response: any = await this._getRequest(url);
        console.log(response);

        response.mediaItems.forEach((mediaItem: GoogleMediaItem) => {
          googleMediaItems.push(mediaItem);
        });

        if (googleMediaItems.length > 0 && !addedToDb) {
          addedToDb = true;
          const promise: Promise<any> = this.addGoogleMediaItemsToDb(googleMediaItems);
          // this.addGoogleMediaItemsToDb(googleMediaItems);
          promise
            .then(() => {
              console.log('Items added to the db: ');
            })
            .catch((err: any) => {
              console.log('Exception on adding google media items to db');
              console.log(err);
            })
        }

        // if (isArray(response.mediaItems) && response.mediaItems.length > 0) {
        //   let index = 0;
        //   do {
        //     const mediaItem: GoogleMediaItem = response.mediaItems[index];
        //     const promise = this.addMediaItemToDb(mediaItem);
        //     promise
        //       .then( (doc: Document) => {
        //         console.log('added mediaItem: ' + mediaItem);
        //         console.log('added Document: ' + doc);
        //       })
        //   }

        // }
        // else {
        //   debugger;
        // }
        // const promise: Promise<Document[]> = MediaItem.insertMany(mediaItems);
        // promise
        //   .then((promiseResults) => {
        //     console.log('all media items added to db');
        //   })
        //   .catch((err) => {
        //     console.log(err);
        //     debugger;
        //   });


        nextPageToken = response.nextPageToken;
        console.log('nextPageToken is: ' + nextPageToken);
      } catch (err) {
        log.error(err);
        nextPageToken = null;
      }

    } while (nextPageToken != null);

    return googleMediaItems;
  }

  addGoogleMediaItemsToDb(googleMediaItems: GoogleMediaItem[]): Promise<void> {

    const dbMediaItems: DbMediaItem[] = this.convertGoogleMediaItemsToDbMediaItems(googleMediaItems);

    const addNextMediaItem = (index: number): Promise<void> => {
      if (index >= dbMediaItems.length) {
        return Promise.resolve();
      }
      const dbMediaItem = dbMediaItems[index];
      console.log('add media item');
      const promise = Mediaitem.collection.insertOne(dbMediaItem);
      return promise
        .then(() => {
          console.log('added media item');
          return addNextMediaItem(index + 1);
        }).catch((error: Error) => {
          console.log(error);
          return Promise.reject();
        })
    };

    return addNextMediaItem(0);
  }

  convertGoogleMediaItemsToDbMediaItems(googleMediaItems: GoogleMediaItem[]): DbMediaItem[] {
    const dbMediaItems: DbMediaItem[] = [];
    googleMediaItems.forEach((googleMediaItem: GoogleMediaItem) => {
      const dbMediaItem: DbMediaItem = this.convertGoogleMediaItemToDbMediaItem(googleMediaItem);
      dbMediaItems.push(dbMediaItem);
    });
    return dbMediaItems;
  }

  convertGoogleMediaItemToDbMediaItem(googleMediaItem: GoogleMediaItem): DbMediaItem {
    const dbMediaItem: DbMediaItem = {
      id: googleMediaItem.id,
      baseUrl: googleMediaItem.baseUrl,
      fileName: googleMediaItem.filename,
      downloaded: false,
      filePath: '',
      productUrl: googleMediaItem.productUrl,
      mimeType: googleMediaItem.mimeType,
      creationTime: googleMediaItem.mediaMetadata.creationTime,
      width: Number(googleMediaItem.mediaMetadata.width),
      height: Number(googleMediaItem.mediaMetadata.height),
    }
    return dbMediaItem;
  }

  async batchGet(mediaItemIds: any) {
    const groups = util.createGroups(mediaItemIds, GooglePhotoAPIs.BATCH_GET_LIMIT);
    log.verbose(this, 'batchGet split', mediaItemIds.length, 'into', groups.length, 'groups');

    const results: any[] = [];

    const mediaItemGroups = await Promise.all(groups.map((sliceIds: any) => {
      return this._batchGet(sliceIds);
    }));

    mediaItemGroups.forEach((mediaItemGroup: any) => {
      mediaItemGroup.forEach((mediaItem: any) => results.push(mediaItem));
    });

    return results;
  }

  async _batchGet(mediaItemIds: any) {
    let url = `${GooglePhotoAPIs.mediaItems}:batchGet?`;

    mediaItemIds.forEach((mediaItemId: any) => {
      url += `mediaItemIds=${mediaItemId}&`;
    });

    const result: any = await this._getRequest(url);
    return this._filterMediaItemResultsByStatus(result.mediaItemResults);
  }

  async listAlbums(nextPageToken: any = null) {
    const albums: any[] = [];

    let url = GooglePhotoAPIs.albums;
    do {
      if (nextPageToken != null) {
        url = `${GooglePhotoAPIs.albums}?pageToken=${nextPageToken}`;
      }

      try {
        const response: any = await this._getRequest(url);
        response.albums.forEach((album: any) => albums.push(album));
        nextPageToken = response.nextPageToken;
      } catch (err) {
        log.error(err);
        nextPageToken = null;
      }

    } while (nextPageToken != null);

    return albums;
  }

  async _getRequest(url: string) {
    const headers = await this._getHeaders();

    return new Promise((resolve, reject) => {
      request(url, { headers }, (err, resp, body) => {
        if (err) {
          return reject(`Error when GET ${url} ${err}`);
        }
        try {
          body = JSON.parse(body);
        } catch (err) {
          return reject(`Error parsing response body ${err}`);
        }
        if (!!body.error) {
          const { code, message, status } = body.error;
          return reject(`Error _getRequest ${url} ${code} ${message} ${status}`);
        }
        resolve(body);
      });
    });
  }

  _filterMediaItemResultsByStatus(mediaItemResults: any) {
    const mediaItems = mediaItemResults
      .filter((result: any) => !result.status)
      .map((result: any) => result.mediaItem);

    if (mediaItems.length !== mediaItemResults.length) {
      const numOfErrorStatus = mediaItemResults.filter((result: any) => !!result.status);
      console.error(`There are ${numOfErrorStatus} items with error`);
    }

    return mediaItems;
  }

  async search(searchFilter: any, numOfItems: any, pageToken: any = null) {
    const requestBody: any = {
      pageSize: numOfItems
    };

    if (searchFilter.albumId) {
      requestBody.albumId = searchFilter.albumId;
    } else {
      requestBody.filters = {};
      searchFilter.populateFilters(requestBody.filters);
    }

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    // return this._search(requestBody, numOfItems);
    return this._search(requestBody);
  }

  async _search(requestBody: any) {
    const url = `${GooglePhotoAPIs.mediaItems}:search`;
    const headers = await this._getHeaders();

    return new Promise((resolve, reject) => {
      request.post({ url, headers, json: requestBody }, (err, res, body) => {
        if (err) {
          return reject(`Error with POST:search ${url} ${err}`);
        }

        if (body.error) {
          const { code, message, status } = body.error;
          return reject(`Error with POST:search ${url} ${code} ${message} ${status}`);
        }

        if (!body.mediaItems) {
          body.mediaItems = [];
        }

        const { mediaItems, nextPageToken } = body;
        resolve({ mediaItems, nextPageToken });
      });
    });
  }

  async probeUrlForContentLength(mediaItem: any) {
    const headers = this._getHeaders();

    return new Promise((resolve, reject) => {
      const url = this._createDownloadUrl(mediaItem);
      const probeReq = request(url, { headers });

      probeReq.on('response', (res) => {
        res.on('data', (data) => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers
          });
          probeReq.abort();
        });
      });

      probeReq.on('error', (err) => {
        console.error(err);
        probeReq.abort();
        reject(err);
      });
    });
  }

  async createDownloadStream(mediaItem: any) {
    const headers = await this._getHeaders();
    const url = this._createDownloadUrl(mediaItem);

    return request(url, { headers });
  }

  _createDownloadUrl(mediaItem: any) {
    let downloadParams = "";

    if (mediaItem.mediaMetadata.video) {
      downloadParams += "dv";
    }

    if (mediaItem.mediaMetadata.photo) {
      const { width, height } = mediaItem.mediaMetadata;
      downloadParams += `w${width}-h${height}`;
    }

    return `${mediaItem.baseUrl}=${downloadParams}`;
  }

  async _getHeaders() {
    const authToken = await this.authService.getToken();
    return this._headers(authToken.access_token);
  }

  _headers(access_token: any) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    };
  }

}

const GooglePhotoAPIs = {
  mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems',
  albums: 'https://photoslibrary.googleapis.com/v1/albums',
  BATCH_GET_LIMIT: 49
};

export class SearchFilters {

  includeArchivedMedia: any;
  dateFilter: any;
  filters: any;

  constructor(includeArchivedMedia: any) {
    this.includeArchivedMedia = includeArchivedMedia;
  }

  setDateFilter(dateFilter: any) {
    this.dateFilter = dateFilter;
  }

  populateFilters(filters: any) {
    filters.includeArchivedMedia = this.includeArchivedMedia;
    if (this.dateFilter) {
      filters.dateFilter = {
        dates: this.dateFilter.dates,
        ranges: this.dateFilter.ranges
      };
    }
  }
}

export class DateFilter {

  dates: any[];
  ranges: any[];

  constructor() {
    this.dates = [];
    this.ranges = [];
  }

  addDateFilter(date: any) {
    this.dates.push(date);
  }

  addRangeFilter(dateSpec: any) {
    this.ranges.push({
      startDate: dateSpec.startDate,
      endDate: dateSpec.endDate
    });
  }
}
