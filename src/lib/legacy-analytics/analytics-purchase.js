/* @flow */
import { legacyFpti } from './legacy-fpti';

export const analyticsPurchase = () => {
  legacyFpti({
    fltp: 'analytics',
    es: 'txnSuccess',
    website: 'muse',
    feature: 'offer',
    subfeature1: 'store-cash',
    subfeature2: 'sdk',
    flavor: 'txnSuccess'
  });
};
