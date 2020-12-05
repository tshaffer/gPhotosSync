import { AuthService } from '../authService';

import Mediaitem from '../models/Mediaitem';
import {
  // Query, 
  Document,
  // Model, 
  // Schema,
} from 'mongoose';
import { getAllMediaItemsFromGoogle } from './googlePhotos';
import { DbMediaItem, GoogleMediaItem } from '../types';

interface GoogleIdToDbMediaItemMap  {
  [id: string]: DbMediaItem;
}

export const addGoogleMediaItemsToDb = async (authService: AuthService) => {

  // async function must do an await somewhere or wait for a promise?

  // retrieve all media items from db
  const mediaItemsInDb: Document[] = await getAllMediaItemsFromDb();

  // retrieve media items from google
  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService, null);

  // look for each google media item in the database
  const googleMediaItemsNotInDb: GoogleMediaItem[] = getGoogleMediaItemsNotInDb(mediaItemsInDb, googleMediaItems);
  console.log(googleMediaItemsNotInDb);
  
  // add all that were not found

  console.log('done');
};

const getAllMediaItemsFromDb = async (): Promise<Document[]> => {
  const mediaItems = await Mediaitem.find({}).exec();
  return mediaItems;
};

const getGoogleMediaItemsNotInDb = (mediaItemsInDb: Document[], googleMediaItems: GoogleMediaItem[]): GoogleMediaItem[] => {
  
  const googleMediaItemsNotInDb: GoogleMediaItem[] = [];

  const mediaItemsById: GoogleIdToDbMediaItemMap = {};
  mediaItemsInDb.forEach( (mediaItemInDb: Document) => {
    const dbMediaItem: DbMediaItem = mediaItemInDb.toObject();
    mediaItemsById[mediaItemInDb.id] = dbMediaItem;
  });

  googleMediaItems.forEach( (googleMediaItem: GoogleMediaItem) => {
    if (!mediaItemsById.hasOwnProperty(googleMediaItem.id)) {
      googleMediaItemsNotInDb.push(googleMediaItem);
    }
  });

  return googleMediaItemsNotInDb;
};
