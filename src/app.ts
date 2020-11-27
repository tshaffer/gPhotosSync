// import express from 'express';

// class App {
//   // public app: express.Application;

//   constructor() {
//     console.log('gPhotosSync: constructor invoked');

//     // this.app = express();

//     // this.app.set('port', 8000);

//   }
// }

// export default new App().app;

import { AuthStorage } from './authStorage';
import { AuthService } from './authService';

async function main() {
  console.log('main invoked');

  const authStorage = new AuthStorage();
  const authService = new AuthService(authStorage);

  console.log('authStorage, authService created:');
  console.log(authStorage);
  console.log(authService);

}

main().catch(err => console.error(err));
