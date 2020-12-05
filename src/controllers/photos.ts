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
import { addMediaItemsToDb } from './dbInterface';

interface GoogleIdToDbMediaItemMap  {
  [id: string]: DbMediaItem;
}

export const addGoogleMediaItemsToDb = async (authService: AuthService) => {

  // retrieve all media items from db
  const mediaItemsInDb: Document[] = await getAllMediaItemsFromDb();

  // retrieve media items from google
  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService, null);

  // look for each google media item in the database
  const googleMediaItemsNotInDb: GoogleMediaItem[] = getGoogleMediaItemsNotInDb(mediaItemsInDb, googleMediaItems);
  
  // add all that were not found
  await addMediaItemsToDb(googleMediaItemsNotInDb);
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
