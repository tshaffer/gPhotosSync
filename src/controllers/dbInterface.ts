import { GoogleMediaItem, DbMediaItem } from '../types';
import Mediaitem from '../models/Mediaitem';

export const addMediaItemsToDb = (googleMediaItems: GoogleMediaItem[]): Promise<any> => {

  const dbMediaItems: DbMediaItem[] = convertGoogleMediaItemsToDbMediaItems(googleMediaItems);

  // const addNextMediaItem = (index: number): Promise<void> => {
  //   if (index >= dbMediaItems.length) {
  //     return Promise.resolve();
  //   }
  //   const dbMediaItem = dbMediaItems[index];
  //   console.log('add media item');
  //   const promise = Mediaitem.collection.insertOne(dbMediaItem);
  //   return promise
  //     .then(() => {
  //       console.log('added media item');
  //       return addNextMediaItem(index + 1);
  //     }).catch((error: Error) => {
  //       console.log(error);
  //       return Promise.reject();
  //     });
  // };

  // return addNextMediaItem(0);

  return Mediaitem.collection.insertMany(dbMediaItems);

  // const promise = Mediaitem.collection.insertOne(dbMediaItems[2]);
  // promise
  //   .then((x: any) => {
  //     console.log('success');
  //   }).catch((err: any) => {
  //     console.log('failure');
  //     console.log(err);
  //   });
};

const convertGoogleMediaItemsToDbMediaItems = (googleMediaItems: GoogleMediaItem[]): DbMediaItem[] => {
  const dbMediaItems: DbMediaItem[] = [];
  googleMediaItems.forEach((googleMediaItem: GoogleMediaItem) => {
    const dbMediaItem: DbMediaItem = convertGoogleMediaItemToDbMediaItem(googleMediaItem);
    dbMediaItems.push(dbMediaItem);
  });
  return dbMediaItems;
};

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
  };
  return dbMediaItem;
};
