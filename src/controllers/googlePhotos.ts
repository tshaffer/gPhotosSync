import { DbMediaItem, GoogleMediaItem } from '../types';

import { AuthService } from '../authService';
import request from 'request';

import Mediaitem from '../models/Mediaitem';

import { log } from '../log';
import { isArray, isNil } from 'lodash';

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
  const mediaItems: GoogleMediaItem[] = mediaItemResults.map( (mediaItemResult: any) => {
    return mediaItemResult.mediaItem;
  });
  
  return mediaItems;

  // let allResults: any[] = [];

  // const maxMediaItemsToFetch = 8;

  // const apiEndpoint = 'https://photoslibrary.googleapis.com/v1/mediaItems:batchGet?';

  // const processFetchMediaItemMetadataBatch = (index: number): any => {

  //   const numRemainingMediaItems = mediaItemIds.length - index;
  //   if (numRemainingMediaItems <= 0) {
  //     return Promise.resolve(allResults);
  //   }

  //   let numMediaItemsToFetch = numRemainingMediaItems;
  //   if (numMediaItemsToFetch > maxMediaItemsToFetch) {
  //     numMediaItemsToFetch = maxMediaItemsToFetch;
  //   }

  //   let endpoint = apiEndpoint;

  //   // tslint:disable-next-line: prefer-for-of
  //   while (numMediaItemsToFetch > 0) {
  //     const id = mediaItemIds[index];
  //     endpoint = endpoint + 'mediaItemIds=' + id;
  //     numMediaItemsToFetch -= 1;
  //     if (numMediaItemsToFetch > 0) {
  //       endpoint += '&';
  //     }
  //     index++;
  //   }

  //   const accessToken = oauth2Controller.getAccessToken();
  //   return requestPromise.get(endpoint, {
  //     headers: { 'Content-Type': 'application/json' },
  //     json: true,
  //     auth: { bearer: accessToken },
  //   }).then((results) => {
  //     allResults = allResults.concat(results.mediaItemResults);
  //     return processFetchMediaItemMetadataBatch(index);
  //   });
  
  // };

  // return processFetchMediaItemMetadataBatch(0);
};

