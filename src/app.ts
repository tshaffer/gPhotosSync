import dotenv from 'dotenv';
import connectDB from './config/db';

import { DbMediaItem } from './types';

import { Store } from './keyValueStore';
import { AuthStorage } from './authStorage';
import { AuthService } from './authService';
import { GooglePhotos } from './googlePhotos';
import { Downloader } from './downloader';
import args from 'command-line-args';

import config from './config.json';
import { AppController } from './app-controller';
import { Scheduler } from './jobs';

import { log } from './log';
import {
  // addGoogleMediaItemsToDb,
  getGooglePhotosToDownload,
} from './controllers';

export let mediaItemsDir: string = '';

async function main() {
  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });
  console.log('port env: ' + process.env.PORT);
  mediaItemsDir = process.env.MEDIA_ITEMS_DIR;
  console.log('mediaItemsDir: ' + mediaItemsDir);

  // connect to db
  await connectDB();

  // setup authorization
  const authStorage = new AuthStorage();
  const authService = new AuthService(authStorage);

  // authenticate with google
  const scopes = [GooglePhotos.photosApiReadOnlyScope()];
  await authService.authenticate(scopes);

  // get command, parameters from command line

  // Command: add google media items that are not already in the db to the db
  // await addGoogleMediaItemsToDb(authService);

  // Command: get a list of the media items that are in the db that are not on the specified storage device
  const photosToDownload: DbMediaItem[] = await getGooglePhotosToDownload();
  console.log(photosToDownload);
  
  return;

  const googlePhotos = new GooglePhotos(authService);

  const mediaItemList = await googlePhotos.listLibraryContents();
  console.log(mediaItemList);

  const photoDb = new Store('secrets/photos.data', {});
  const albumDb = new Store('secrets/albums.db', {});


  const downloadPath = config.photosPath;
  const downloader = new Downloader(photoDb, googlePhotos, downloadPath);
  const appController = new AppController(photoDb, albumDb, googlePhotos, downloadPath);
  const scheduler = new Scheduler(downloader, appController);

  console.log('authStorage, authService created:');
  console.log(authStorage);
  console.log(authService);
  console.log(process.argv);

  const options = args([
    { name: 'job', type: String },
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'albums', type: Boolean },
    { name: 'download-album', type: String },
    { name: 'params', type: String, multiple: true },
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'count', alias: 'c', type: Boolean }
  ]);

  options.verbose = true;
  options.albums = true;
  // options.job = 'refreshAlbums';
  // options.params = 'Toilet';

  if (options.help) {
    log.info(this, 'help');
    return;
  }

  // const scopes = [GooglePhotos.photosApiReadOnlyScope()];
  // await authService.authenticate(scopes);

  if (options.albums) {
    const albums = await googlePhotos.listAlbums();
    appController.onAlbums(albums);
    return;
  }

  log.setVerbose(options.verbose);

  // const scopes = [GooglePhotos.photosApiReadOnlyScope()];
  // await authService.authenticate(scopes);

  console.log('options');
  console.log('job: ', options.job);
  console.log('params: ', options.params);
  if (options.count) {
    log.info(this, 'all media items', photoDb.count());
    console.log('all media items', photoDb.count());
  } else if (options.job) {
    log.info(this, ' asdfdf ', options.job);
    console.log(' asdfdf ', options.job);
    scheduler.triggerNow(options.job, options.params);
  } else {
    log.info(this, '===== App Started =====');
    console.log('===== App Started =====');
    scheduler.scheduleJobs();
    scheduler.triggerNow('appStartupJob', []);
  }

}

main().catch(err => console.error(err));
