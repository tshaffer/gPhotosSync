import schedule from 'node-schedule';
import { Downloader } from './downloader';
import { AppController } from './app-controller';

import config from './config.json'
import { log } from './log';

export class Scheduler {

  downloader: Downloader;
  appController: AppController;
  jobs: any[];
  availableJobs: any;

  constructor(downloader: Downloader, appController: AppController) {
    this.downloader = downloader;
    this.appController = appController;
    this.jobs = [];

    this.availableJobs = {
      probeMediaItemRefresh: {
        fn: this._probeMediaItemRefreshFn,
        params: [Number, Number],
        description: 'renewIfOlderThanDays, numberOfItems'
      },
      downloadMediaItemFile: {
        fn: this._downloadMediaItemFilesJob,
        params: [Number],
        description: 'numberOfItems'
      },
      searchMediaItemsJob: {
        fn: this._searchMediaItemsJob,
        params: [Number, Number],
        description: 'numOfDaysBack, numOfItems'
      },
      refreshAlbums: {
        fn: this._refreshAlbums,
        params: [String],
        description: 'albumName'
      },
      appStartupJob: {
        fn: this._appStartupJob,
        params: [],
        description: '()'
      }
    }
  }

  scheduleJobs() {
    this.jobs.push(this._createMediaItemSearchJob());
    this.jobs.push(this._createProbeMediaItemRefreshJob());
    this.jobs.push(this._createDownloadMediaItemFilesJob());
  }

  _createMediaItemSearchJob() {
    const unlimitedItems = 0;

    return schedule.scheduleJob(
      config.mediaItemSearchRefresh.jobCron,
      this._searchMediaItemsJob.bind(this, config.mediaItemSearchRefresh.searchDaysBack, unlimitedItems)
    );
  }

  _createProbeMediaItemRefreshJob() {
    const { renewIfOlderThanDays, numberOfItems } = config.probeMediaItemsRefresh;
    return schedule.scheduleJob(
      config.probeMediaItemsRefresh.jobCron,
      this._probeMediaItemRefreshFn.bind(this, renewIfOlderThanDays, numberOfItems)
    );
  }

  _createDownloadMediaItemFilesJob() {
    return schedule.scheduleJob(
      config.mediaItemsDownload.jobCron,
      this._downloadMediaItemFilesJob.bind(this, config.mediaItemsDownload.numberOfItems)
    );
  }

  triggerNow(name: string, params: any[] = []) {
    const job = this.availableJobs[name];

    if (!job) {
      throw new Error(`Job ${name} does not exist. Try one of: ${Object.keys(this.availableJobs).join(',')}`);
    }

    if (params.length < job.params.length) {
      throw new Error(`Not all params have been provided, required: ${job.description}`);
    }

    const converted = [...params].slice(0, job.params.length).map((item, idx) => job.params[idx](item));
    return job.fn.apply(this, converted);
  }

  _probeMediaItemRefreshFn(renewIfOlderThanDays: any, numberOfItems: any) {
    log.info(this, '');
    log.info(this, '_probeMediaItemRefreshFn', renewIfOlderThanDays, numberOfItems);

    const mediaItemIdsToProbe = this.appController.findMediaItemIdsToProbe(
      renewIfOlderThanDays, numberOfItems
    );
    log.info(this, '_probeMediaItemRefreshFn mediaItemsToProbe', mediaItemIdsToProbe.length);

    this.downloader.probeMediaItems(mediaItemIdsToProbe).then((contentLengthMap: any) => {
      this.appController.onProbedMediaItems(contentLengthMap);
    }).catch((err: any) => console.error(err));
  }

  _downloadMediaItemFilesJob(numberOfItems: any) {
    log.info(this, '');
    log.info(this, '_downloadMediaItemFilesJob', numberOfItems);

    const mediaItemIdsToDownload = this.appController.findMediaItemsToDownload(numberOfItems);
    log.info(this, '_downloadMediaItemFilesJob found', mediaItemIdsToDownload.length);

    this.appController.renewMediaItems(mediaItemIdsToDownload).then(storedItems => {
      const mediaItems = storedItems.map((storedItem: any) => storedItem.mediaItem);
      return this.downloader.downloadMediaItemFiles(mediaItems).then((files: any) => {
        this.appController.onFilesDownloaded(files);
      });
    }).catch(err => console.error(err));
  }

  _searchMediaItemsJob(numOfDaysBack: number, numOfItems: number) {
    log.info(this, '');
    log.info(this, '_searchMediaItemsJob', numOfDaysBack, numOfItems);

    if (numOfItems === 0) {
      numOfItems = 9999999999;
    }

    this.downloader.searchMediaItems(numOfDaysBack, numOfItems).then((mediaItems: any) => {
      this.appController.onMediaItemsDownloaded(mediaItems);
    }).catch((err: any) => console.error(err));
  }

  _refreshAlbums() {
    // this.downloader.searchAlbums().then((albums: any) => {
    //     this.appController.onAlbums(albums);
    //   }).catch((err: any) => console.error(err));
  }

  _appStartupJob() {
    log.info(this, '');
    log.info(this, 'appStartupJob');

    const existingFiles = this.downloader.getExistingFiles();
    const storedItemsMap = this.appController.getStoredItemsByFilenameMap(
      existingFiles.map((file: any) => file.filename)
    );

    const files = existingFiles
      .filter((file: any) => storedItemsMap.hasOwnProperty(file.filename))
      .filter((file: any) => this.appController.hasStoredItemDiscrepancy(storedItemsMap[file.filename].storedItem));

    log.info(this, 'files with discrepancies', files.length);

    files.forEach((file: any) => {
      const mediaItem = storedItemsMap[file.filename].storedItem.mediaItem;
      return { valid: true, where: file.where, mediaItem };
    });

    const res = this.appController.onFilesDownloaded(files);
    log.info(this, 'updated info on', res.length, 'already downloaded items');
  }

}
