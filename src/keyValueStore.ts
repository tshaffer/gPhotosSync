import * as fs from 'fs-extra';
import path from 'path';

import mkdirp from 'mkdirp';

export class Store {

  filePath: string;
  opts: any;
  data: any;
  saveTimeout: any;
  savingInProgress: any;
  self: any;

  constructor(filePath: string, opts: any) {

    opts = opts || this.getDefaultOpts();
    this.opts = opts;
    this.opts.timespanInMs = opts.timespanInMs || this.getDefaultOpts().timespanInMs;

    this.filePath = filePath;
    this.data = {};
    this.saveTimeout = null;
    this.savingInProgress = false;

    this.prepare();
  }

  set(key: any, value: any) {
    if (typeof key === 'object' || key.indexOf('Object') >= 0) {
      throw new Error(`Can't use object as a key ${key} ${value}`);
    }

    key = key.toString();
    this.data[key] = value;

    if (!this.saveTimeout) {
      this.saveTimeout = setTimeout(this._writeFile.bind(this), this.opts.timespanInMs);
    }

    return value;
  }

  get(key: any) {
    key = key.toString();

    const value = this.data[key];

    if (!value) {
      return null;
    }

    return JSON.parse(JSON.stringify(value));
  }

  getAll() {
    return Object.values(this.data);
  }

  count() {
    return this.getAll().length;
  }

  getByFilter(filterFn: any, limit: any) {
    const selected = Object.keys(this.data);

    const items = [];

    limit = limit || selected.length;
    for (
      let i = 0;
      items.length < limit && i < selected.length;
      i++
    ) {
      const key = selected[i];
      const value = this.data[key];

      if (filterFn(value, key)) {
        items.push(value);
      }
    }

    return JSON.parse(JSON.stringify(items));
  }

  _writeFile() {
    if (!this.savingInProgress) {
      const jsonData = JSON.stringify(this.data, null, 2);
      fs.writeFile(this.filePath, jsonData, { mode: 0o0600 }, (err) => {
        if (err) {
          console.error(err);
        }
        this.saveTimeout = null;
        this.savingInProgress = false;
      });
      this.savingInProgress = true;
    }
  }

  load() {
    try {
      return (this.data = JSON.parse(fs.readFileSync(this.filePath).toString()));
    } catch (err) {
      if (err.code === 'EACCES') {
        err.message += '\ndata-store does not have permission to load this file\n';
        throw err;
      }
      if (err.code === 'ENOENT' || err.name === 'SyntaxError') {
        this.data = {};
        return {};
      }
      if (err) {
        console.error(err);
      }
    }
  }

  prepare() {
    mkdirp.sync(path.dirname(this.filePath));
    this.load();
  }

  getDefaultOpts() {
    return {
      timespanInMs: 5000
    }
  }

}
