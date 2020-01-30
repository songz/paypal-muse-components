/* @flow */
import type {
  JetloreConfig
} from '../types';

import { logger } from './logger';
import Tracker from './jetloreTracker';

let jlEnabled = false;

const getJetlorePayload = (type : string, payload : Object) : Object => {
  const cartItems = payload.items || [];
  switch (type) {
    case 'setCart':
      return payload || {};
    case 'addToCart':
    case 'removeFromCart':
    case 'purchase':
      return cartItems.map((item => ({
        deal_id: item.id,
        item_group_id: item.groupId,
        count: item.quantity,
        price: item.price
      })));
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
        deal_id: payload.id,
        item_group_id: payload.groupId
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

const JL = {
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
  }
};

export const jlFunctions = {
  search: (data : {}) : null => {
    JL.trackActivity('search', data);
  },
  viewSection: (data : {}) : null => {
    JL.trackActivity('browse_section', data);
  },
  viewPromo: (data : {}) : null => {
    JL.trackActivity('browse_promo', data);
  },
  viewProduct: (data : {}) : null => {
    JL.trackActivity('browse_product', data);
  },
  addToWishList: (data : {}) : null => {
    JL.trackActivity('addToWishList', data);
  },
  removeFromWishList: (data : {}) : null => {
    JL.trackActivity('removeFromWishList', data);
  },
  setWishList: (data : {}) : null => {
    JL.trackActivity('setWishList', data);
  },
  addToFavorites: (data : {}) : null => {
    JL.trackActivity('addToFavorites', data);
  },
  removeFromFavorites: (data : {}) : null => {
    JL.trackActivity('removeFromFavorites', data);
  },
  setFavoriteList: (data : {}) : null => {
    JL.trackActivity('setFavoriteList', data);
  }
}

const initializeJL = (config = {}) => {

  const jetloreConfig = config.jetlore || config || {};
  if (jetloreConfig) {
    const {
      user_id,
      access_token,
      feed_id,
      div,
      lang
    } = jetloreConfig;
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

export const initializeJetlore = (config) => {
  const jetloreConfig = config.jetlore || config || {};
  if (!jetloreConfig) return
  const {
    access_token,
    feed_id,
    feedId,
    div,
    lang
  } = jetloreConfig;
  const trackingConfig : JetloreConfig = {
    cid: access_token,
    feed_id: feed_id || feedId
  };
  if (div) {
    trackingConfig.div = div;
  }
  if (lang) {
    trackingConfig.lang = lang;
  }
  JL.tracker = new Tracker(trackingConfig);
}

export default JL;
