import { GoogleMediaItem, DbMediaItem } from '../types';
import Mediaitem from '../models/Mediaitem';

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
