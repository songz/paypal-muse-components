/* @flow */
import { legacyFpti } from './legacy-fpti';

export const analyticsInit = () => {
  legacyFpti({
    fltp: 'store-cash',
    es: 'connectionStarted',
    website: 'muse',
    feature: 'offer',
    subfeature1: 'store-cash',
    subfeature2: 'sdk',
    flavor: 'connectionStarted'
  });
};
