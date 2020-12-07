import * as path from 'path';
import * as fse from 'fs-extra';

import { DbMediaItem, GoogleMediaItem } from '../types';

import { AuthService } from '../authService';
import request from 'request';

import { log } from '../log';
import { isArray, isNil } from 'lodash';
import { getShardedDirectory } from './photos';
import { addMediaItemToDb, convertGoogleMediaItemToDbMediaItem, upsertMediaItemInDb } from './dbInterface';

export const GooglePhotoAPIs = {
  mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems',
  albums: 'https://photoslibrary.googleapis.com/v1/albums',
  BATCH_GET_LIMIT: 49
};

export const getAllMediaItemsFromGoogle = async (authService: AuthService, nextPageToken: any = null): Promise<GoogleMediaItem[]> => {

  const googleMediaItems: GoogleMediaItem[] = [];

  let url = GooglePhotoAPIs.mediaItems;

  do {

    if (nextPageToken != null) {
      url = `${GooglePhotoAPIs.mediaItems}?pageToken=${nextPageToken}`;
    }

    try {

      const response: any = await getRequest(authService, url);

      console.log(response);

      if (!isNil(response)) {
        if (isArray(response.mediaItems)) {
          response.mediaItems.forEach((mediaItem: GoogleMediaItem) => {
            googleMediaItems.push(mediaItem);
          });
        }
        else {
          console.log('response.mediaItems is not array');
        }
        nextPageToken = response.nextPageToken;
      }
      else {
        console.log('response is nil');
      }

      console.log('number of googleMediaItems: ' + googleMediaItems.length);
      console.log('nextPageToken is: ' + nextPageToken);

    } catch (err) {
      log.error(err);
      nextPageToken = null;
    }

  } while (nextPageToken != null);

  return googleMediaItems;
};


const getRequest = async (authService: AuthService, url: string) => {

  const headers = await getHeaders(authService);

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
};


const getHeaders = async (authService: AuthService) => {
  const authToken = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken.access_token}`
  };
};

export const downloadMediaItemsMetadata = async (authService: AuthService, mediaItemIds: string[]): Promise<GoogleMediaItem[]> => {

  let url = `${GooglePhotoAPIs.mediaItems}:batchGet?`;

  mediaItemIds.forEach((mediaItemId: any) => {
    url += `mediaItemIds=${mediaItemId}&`;
  });

  const result: any = await getRequest(authService, url);

  const mediaItemResults: any[] = result.mediaItemResults;
  const mediaItems: GoogleMediaItem[] = mediaItemResults.map((mediaItemResult: any) => {
    return mediaItemResult.mediaItem;
  });

  return mediaItems;
};

export const downloadMediaItems = async (authService: AuthService, mediaItemGroups: GoogleMediaItem[][]): Promise<any> => {

  for (const mediaItemGroup of mediaItemGroups) {
    for (const mediaItem of mediaItemGroup) {
      const retVal: any = await (downloadMediaItem(authService, mediaItem));
      console.log(retVal);
      if (retVal.valid) {
          await addGoogleMediaItemToDb(retVal.mediaItem, retVal.where);
      } else {
        debugger;
      }
    }
  }
};

const addGoogleMediaItemToDb = async (mediaItem: GoogleMediaItem, targetFilePath: string) => {
  const dbMediaItem: DbMediaItem = convertGoogleMediaItemToDbMediaItem(mediaItem);
  dbMediaItem.downloaded = true;
  dbMediaItem.filePath = targetFilePath;
  await upsertMediaItemInDb(dbMediaItem);
};

const downloadMediaItem = async (authService: AuthService, mediaItem: GoogleMediaItem): Promise<any> => {

  const fileSuffix = path.extname(mediaItem.filename);
  const fileName = mediaItem.id + fileSuffix;

  const baseDir: string = await getShardedDirectory(false, mediaItem.id);
  const where = path.join(baseDir, fileName);

  const stream = await createDownloadStream(authService, mediaItem);
  return new Promise((resolve, reject) => {
    stream.pipe(fse.createWriteStream(where)
      .on('close', () => {
        // this._setFileTimestamp(where, mediaItem);
        resolve({ valid: true, where, mediaItem });
      }))
      .on('error', (err: any) => {
        log.error(this, 'error downloading a file', where, err);
        resolve({ valid: false, where, mediaItem });
      });
  });
};


const createDownloadStream = async (authService: AuthService, mediaItem: any) => {
  const headers = await getHeaders(authService);
  const url: string = await createDownloadUrl(mediaItem);

  return request(url, { headers });
};


const createDownloadUrl = async (mediaItem: GoogleMediaItem) => {

  let downloadParams = '';

  // TEDTODO
  if ((mediaItem.mediaMetadata as any).video) {
    downloadParams += 'dv';
  }

  if (mediaItem.mediaMetadata.photo) {
    const { width, height } = mediaItem.mediaMetadata;
    downloadParams += `w${width}-h${height}`;
  }

  return `${mediaItem.baseUrl}=${downloadParams}`;
};

// TEDTODO - deal with heif / heic files
const getSuffixFromMimeType = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'video/mp4':
      return '.mp4';
    case 'image/heif':
      return '.heic';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
};

