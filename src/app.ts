import express from 'express';

class App {
  public app: express.Application;

  constructor() {
    console.log('gPhotosSync: constructor invoked');

    this.app = express();

    this.app.set('port', 8000);

  }
}

export default new App().app;
