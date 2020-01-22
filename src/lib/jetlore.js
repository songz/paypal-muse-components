/* @flow */
import type {
  JetloreConfig
} from '../types';

import { logger } from './logger';
import Tracker from './jetloreTracker';

let JL;
let jlEnabled = false;

const validFn = (fn) => {
  return (...args) => {
    if (!jlEnabled || !JL || !JL.trackActivity || (typeof JL.trackActivity !== 'function')) {
      return;
    }
    fn(...args);
  };
};

function addJLFunctionsToSDK(tracker = {}) : null {
  // This will add JL specific functions to trackers object
  //   This function will have a side effect, which is necessary.
  //   Since tracking SDK don't support these functions, they should
  //   be handled directly by JL instead of going through trackers (more error prone)
  try {
    tracker.search = validFn((data : {}) : null => {
      JL.trackActivity('search', { payload: data });
    });
    tracker.viewSection = validFn((data : {}) : null => {
      JL.trackActivity('browse_section', { payload: data });
    });
    tracker.viewPromo = validFn((data : {}) : null => {
      JL.trackActivity('browse_promo', { payload: data });
    });
    tracker.viewProduct = validFn((data : {}) : null => {
      JL.trackActivity('browse_product', { payload: data });
    });
    tracker.addToWishList = validFn((data : {}) : null => {
      JL.trackActivity('addToWishList', { payload: data });
    });
    tracker.removeFromWishList = validFn((data : {}) : null => {
      JL.trackActivity('removeFromWishList', { payload: data });
    });
    tracker.setWishList = validFn((data : {}) : null => {
      JL.trackActivity('setWishList', { payload: data });
    });
    tracker.addToFavorites = validFn((data : {}) : null => {
      JL.trackActivity('addToFavorites', { payload: data });
    });
    tracker.removeFromFavorites = validFn((data : {}) : null => {
      JL.trackActivity('removeFromFavorites', { payload: data });
    });
    tracker.setFavoriteList = validFn((data : {}) : null => {
      JL.trackActivity('setFavoriteList', { payload: data });
    });
  } catch (err) {
    logger.error('JL.addJLFunctionsToSDK', err);
  }
}

const initializeJL = (config = {}) => {
  const getJetlorePayload = (type : string, options : Object) : Object => {
    const { payload } = options;
    switch (type) {
    case 'setCart':
      return payload || {};
    case 'addToCart':
    case 'removeFromCart':
      return {
        deal_id: payload.deal_id,
        option_id: payload.option_id,
        count: payload.count,
        price: payload.price
      };
    case 'purchase':
      return {
        deal_id: payload.deal_id,
        option_id: payload.option_id,
        count: payload.count
      };
    case 'search':
      return {
        text: payload.text
      };
    case 'addToWishList':
    case 'removeFromWishList':
    case 'setWishList':
    case 'addToFavorites':
    case 'setFavoriteList':
    case 'removeFromFavorites':
    case 'browse_product':
      return {
        deal_id: payload.dealId,
        item_group_id: payload.itemGroupId
      };
    case 'browse_section':
      return {
        name: payload.name,
        refinements: payload.refinements
      };
    case 'browse_promo':
      return {
        name: payload.name,
        id: payload.id
      };
    case 'track':
      return payload;
    default:
      return {};
    }
  };

  JL = {
    trackActivity(type, data) : null {
      try {
        const jlData = getJetlorePayload(type, data);
        if (type === 'setCart') {
          return JL.tracker.setCart && JL.tracker.setCart(data);
        }
        JL.tracker[type] && JL.tracker[type](jlData);
        return null;
      } catch (err) {
        logger.error('JL.trackActivity', err);
      }
    },
    addJLFunctionsToSDK
  };

  if (config.jetlore) {
    const {
      user_id,
      access_token,
      feed_id,
      div,
      lang
    } = config && config.jetlore;
    const trackingConfig : JetloreConfig = {
      cid: access_token,
      user_id,
      feed_id
    };
    if (!div) {
      trackingConfig.div = div;
    }
    if (!lang) {
      trackingConfig.lang = lang;
    }
    JL.tracker = new Tracker(trackingConfig);
    jlEnabled = true;
  }

  return JL;
};

// This function should never throw an error,
// no matter what the circumstances are
const getJetlore = (config = {}) => {
  if (JL) {
    return JL;
  }

  try {
    JL = initializeJL(config);
    return JL;
  } catch (err) {
    logger.error('initializeJL', err);
    JL = {
      trackActivity() : null {
        return null;
      },
      tracker: {},
      addJLFunctionsToSDK
    };
    return JL;
  }
};

export default getJetlore;
