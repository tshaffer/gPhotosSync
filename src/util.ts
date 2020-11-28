import Moment from 'moment';

export function diffBetweenTwoDates(older: any, newer: any, timeItem = 'seconds') {
    // return Moment.utc(newer).diff(Moment.utc(older), timeItem);
    return Moment.utc(newer).diff(Moment.utc(older));
}

export function createGroups(items: any, groupSize: any) {
    const groups = [];

    const numOfGroups = Math.ceil(items.length / groupSize);
    for (let i = 0; i < numOfGroups; i++) {
        const startIdx = i * groupSize;
        const endIdx = i * groupSize + groupSize;

        const subItems = items.slice(startIdx, endIdx);
        groups.push(subItems);
    }

    return groups;
}
