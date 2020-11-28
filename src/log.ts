import Moment from 'moment';

export class Log {

  _verbose: boolean;

  constructor() {
    this._verbose = true;
  }

  error(who: any, ...what: any[]) {
    console.error(this._msg('ERR', who, ...what));
  }

  log(who: any, ...what: any[]) {
    console.log(this._msg('LOG', who, what));
  }

  info(who: any, ...what: any[]) {
    console.info(this._msg('INF', who, what));
  }

  verbose(who: any, ...what: any[]) {
    if (this._verbose) {
      console.log(this._msg('VER', who, what));
    }
  }

  setVerbose(value: boolean) {
    this._verbose = value;
  }

  _msg(type: any, who: any, ...what: any[]) {
    let str = '';
    what.forEach(item => {
      if (typeof item === 'object') {
        str += JSON.stringify(item) + ' ';
      } else {
        str += item.toString() + ' ';
      }
    });
    const pre = `${Moment().format('YYYY-MM-DD hh:mm:ss')} [${who.constructor.name}] ${type.toUpperCase()} > `.padEnd(55, ' ');
    return pre + str;
  }
}

export const log = new Log();
