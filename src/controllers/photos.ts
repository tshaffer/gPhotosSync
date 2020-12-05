import Mediaitem from '../models/Mediaitem';
import {
  // Query, 
  Document,
  // Model, 
  // Schema,
} from 'mongoose';

export const findGoogleMediaItemsMissingFromDb = async () => {

  // async function must do an await somewhere or wait for a promise?

  // retrieve all media items from db
  const mediaItemsInDb: Document[] = await getAllMediaItemsFromDb();

  // retrieve media items from google
  
  // look for each google media item in the database

  // if not found, add it.

  console.log('done');
}

const getAllMediaItemsFromDb = async (): Promise<Document[]> => {
  const mediaItems = await Mediaitem.find({}).exec();
  return mediaItems;
}

