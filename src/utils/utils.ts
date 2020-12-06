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

export function createGroups(items: string[], groupSize: number): string[][] {
  
  const groups: string[][] = [];

  const numOfGroups = Math.ceil(items.length / groupSize);
  for (let i = 0; i < numOfGroups; i++) {
      const startIdx = i * groupSize;
      const endIdx = i * groupSize + groupSize;

      const subItems: string[] = items.slice(startIdx, endIdx);
      groups.push(subItems);
  }

  return groups;
}
