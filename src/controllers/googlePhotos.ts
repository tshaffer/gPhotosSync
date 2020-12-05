import { DbMediaItem, GoogleMediaItem } from '../types';

import { AuthService } from '../authService';
import request from 'request';

import Mediaitem from '../models/Mediaitem';

import { log } from '../log';

const GooglePhotoAPIs = {
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

      response.mediaItems.forEach((mediaItem: GoogleMediaItem) => {
        googleMediaItems.push(mediaItem);
      });
      
      nextPageToken = response.nextPageToken;

      // return early when testing
      if (googleMediaItems.length > 100) {
        nextPageToken = null;
      }
      
      console.log('nextPageToken is: ' + nextPageToken);
    } catch (err) {
      log.error(err);
      nextPageToken = null;
    }

  } while (nextPageToken != null);

  return googleMediaItems;
}

const addGoogleMediaItemsToDb = async (googleMediaItems: GoogleMediaItem[]): Promise<void> => {

  const dbMediaItems: DbMediaItem[] = convertGoogleMediaItemsToDbMediaItems(googleMediaItems);

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

  // return Mediaitem.collection.insertMany(dbMediaItems);

  // const promise = Mediaitem.collection.insertOne(dbMediaItems[2]);
  // promise
  //   .then((x: any) => {
  //     console.log('success');
  //   }).catch((err: any) => {
  //     console.log('failure');
  //     console.log(err);
  //   });
}

const convertGoogleMediaItemsToDbMediaItems = (googleMediaItems: GoogleMediaItem[]): DbMediaItem[] => {
  const dbMediaItems: DbMediaItem[] = [];
  googleMediaItems.forEach((googleMediaItem: GoogleMediaItem) => {
    const dbMediaItem: DbMediaItem = convertGoogleMediaItemToDbMediaItem(googleMediaItem);
    dbMediaItems.push(dbMediaItem);
  });
  return dbMediaItems;
}

const convertGoogleMediaItemToDbMediaItem = (googleMediaItem: GoogleMediaItem): DbMediaItem => {
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


const getRequest = async(authService: AuthService, url: string) => {
  
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
}


const getHeaders = async(authService: AuthService) => {
  const authToken = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken.access_token}`
  };
}
