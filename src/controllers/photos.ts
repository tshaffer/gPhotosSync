import * as fse from 'fs-extra';
import * as path from 'path';

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
import {
  fsLocalFolderExists,
  fsCreateNestedDirectory
} from '../utilities';
import { mediaItemsDir } from '../app';

interface GoogleIdToDbMediaItemMap {
  [id: string]: DbMediaItem;
}

export const addGoogleMediaItemsToDb = async (authService: AuthService) => {

  // retrieve all media items from db
  const mediaItemsInDb: Document[] = await getAllMediaItemsFromDb();

  // retrieve media items from google
  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService, null);

  // look for each google media item in the database
  const googleMediaItemsNotInDb: GoogleMediaItem[] = getGoogleMediaItemsNotInDb(mediaItemsInDb, googleMediaItems);

  // de-dup google media items before adding
  const uniqueGoogleMediaItemsNotInDb: GoogleMediaItem[] = [];
  const idToNotInDb: any = {};
  googleMediaItemsNotInDb.forEach((gItemNotInDb: GoogleMediaItem) => {
    if (!idToNotInDb.hasOwnProperty(gItemNotInDb.id)) {
      idToNotInDb[gItemNotInDb.id] = gItemNotInDb;
      uniqueGoogleMediaItemsNotInDb.push(gItemNotInDb);
    }
    else {
      console.log('duplicate found: id is: ' + gItemNotInDb.id);
    }
  });

  // add all that were not found
  if (uniqueGoogleMediaItemsNotInDb.length > 0) {
    await addMediaItemsToDb(uniqueGoogleMediaItemsNotInDb);
  }
};

const getAllMediaItemsFromDb = async (): Promise<Document[]> => {
  const mediaItems = await Mediaitem.find({}).exec();
  return mediaItems;
};

const getGoogleMediaItemsNotInDb = (mediaItemsInDb: Document[], googleMediaItems: GoogleMediaItem[]): GoogleMediaItem[] => {

  const googleMediaItemsNotInDb: GoogleMediaItem[] = [];

  const mediaItemsById: GoogleIdToDbMediaItemMap = {};
  mediaItemsInDb.forEach((mediaItemInDb: Document) => {
    const dbMediaItem: DbMediaItem = mediaItemInDb.toObject();
    mediaItemsById[mediaItemInDb.id] = dbMediaItem;
  });

  googleMediaItems.forEach((googleMediaItem: GoogleMediaItem) => {
    if (!mediaItemsById.hasOwnProperty(googleMediaItem.id)) {
      googleMediaItemsNotInDb.push(googleMediaItem);
    }
  });

  return googleMediaItemsNotInDb;
};

let shardedDirectoryExistsByPath: any = {};

export const getGooglePhotosToDownload = async (): Promise<DbMediaItem[]> => {

  const mediaItemsNotDownloaded: DbMediaItem[] = [];

  // retrieve all media items from db
  const mediaItemsInDb: Document[] = await getAllMediaItemsFromDb();

  shardedDirectoryExistsByPath = {};

  for (const mediaItemInDb of mediaItemsInDb) {
    const dbMediaItem: DbMediaItem = mediaItemInDb.toObject();
    const dbMediaItemDownloaded: boolean = await isMediaItemDownloaded(dbMediaItem);
    if (!dbMediaItemDownloaded) {
      mediaItemsNotDownloaded.push(dbMediaItem);
    }
  }

  console.log(mediaItemsNotDownloaded);

  return mediaItemsNotDownloaded;
};

const isMediaItemDownloaded = async (dbMediaItem: DbMediaItem): Promise<boolean> => {
  const id: string = dbMediaItem.id;
  const shardedDirectory: string = await getShardedDirectory(id);
  const filePath: string = path.join(shardedDirectory, id + path.extname(dbMediaItem.fileName));
  const fileExists: boolean = fse.existsSync(filePath);
  return fileExists;
};

const getShardedDirectory = async (photoId: string): Promise<string> => {
  const numChars = photoId.length;
  const targetDirectory = path.join(
    mediaItemsDir,
    photoId.charAt(numChars - 2),
    photoId.charAt(numChars - 1),
  );

  if (shardedDirectoryExistsByPath.hasOwnProperty(targetDirectory)) {
    return Promise.resolve(targetDirectory);
  }
  return fsLocalFolderExists(targetDirectory)
    .then((dirExists: boolean) => {
      shardedDirectoryExistsByPath[targetDirectory] = true;
      if (dirExists) {
        return Promise.resolve(targetDirectory);
      }
      else {
        return fsCreateNestedDirectory(targetDirectory)
          .then(() => {
            return Promise.resolve(targetDirectory);
          });
      }
    })
    .catch((err: Error) => {
      console.log(err);
      return Promise.reject();
    });
};
