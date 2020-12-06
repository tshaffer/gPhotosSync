import { Query } from 'mongoose';

import { GoogleMediaItem, DbMediaItem } from '../types';
import Mediaitem from '../models/Mediaitem';

export const upsertMediaItemInDb = async (dbMediaItem: DbMediaItem): Promise<any> => {

  const filter = {
    id: dbMediaItem.id,
  };
  const update = {
    $set: {
      downloaded: true,
      filePath: dbMediaItem.filePath
    },
  };

  const promise = Mediaitem.collection.findOneAndUpdate(
    filter,
    update,
    {
      upsert: true,
    }
  );

  return promise;
};

export const addMediaItemToDb = (dbMediaItem: DbMediaItem): Promise<any> => {
  return Mediaitem.collection.insertOne(dbMediaItem);
};

export const addMediaItemsToDb = (googleMediaItems: GoogleMediaItem[]): Promise<any> => {
  const dbMediaItems: DbMediaItem[] = convertGoogleMediaItemsToDbMediaItems(googleMediaItems);
  return Mediaitem.collection.insertMany(dbMediaItems);
};

const convertGoogleMediaItemsToDbMediaItems = (googleMediaItems: GoogleMediaItem[]): DbMediaItem[] => {
  const dbMediaItems: DbMediaItem[] = [];
  googleMediaItems.forEach((googleMediaItem: GoogleMediaItem) => {
    const dbMediaItem: DbMediaItem = convertGoogleMediaItemToDbMediaItem(googleMediaItem);
    dbMediaItems.push(dbMediaItem);
  });
  return dbMediaItems;
};

export const convertGoogleMediaItemToDbMediaItem = (googleMediaItem: GoogleMediaItem): DbMediaItem => {
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
