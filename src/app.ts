import { AuthStorage } from './authStorage';
import { AuthService } from './authService';
import { GooglePhotos } from './google-photos';

import config from './config.json'

async function main() {
  console.log('main invoked');

  const authStorage = new AuthStorage();
  const authService = new AuthService(authStorage);
  const googlePhotos = new GooglePhotos(authService);
  const downloadPath = config.photosPath;
  // const downloader = new Downloader(photoDb, googlePhotos, downloadPath);
  // const appController = new AppController(photoDb, albumDb, googlePhotos, downloadPath);
  // const scheduler = new Scheduler(downloader, appController);

  console.log('authStorage, authService created:');
  console.log(authStorage);
  console.log(authService);

}

main().catch(err => console.error(err));
