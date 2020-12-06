import * as fse from 'fs-extra';

export function fsLocalFolderExists(fullPath: string): Promise<boolean> {
  return Promise.resolve(fse.existsSync(fullPath))
    .then((exists) => {
      if (exists) {
        return fsLocalFileIsDirectory(fullPath);
      }
      return false;
    });
}

export function fsCreateNestedDirectory(dirPath: string) {
  return fse.mkdirp(dirPath);
}

function fsLocalFileIsDirectory(fullPath: string) {
  return fse.stat(fullPath)
    .then((stat) => stat.isDirectory());
}
