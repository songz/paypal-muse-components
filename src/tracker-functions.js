/* @flow */
import 'whatwg-fetch'; // eslint-disable-line import/no-unassigned-import

import _ from 'lodash';
import { getClientID, getMerchantID } from '@paypal/sdk-client/src';

import constants from './lib/constants';
import type {
  CartData,
  EventType,
  RemoveFromCartData,
  IdentityData,
  PurchaseData,
  CartEventType,
  FptiInput,
  UserData
} from './types';
import {
  validateRemoveItems,
  addToCartNormalizer,
  setCartNormalizer,
  removeFromCartNormalizer,
  purchaseNormalizer,
  validateAddItems,
  validatePurchase,
  validateUser,
  validateCustomEvent,
  setUserNormalizer
} from './lib/validation';
import {
  getOrCreateValidCartId
} from './lib/local-storage/cart';
import { logger } from './lib/logger';
import {
  createNewCartId,
  setCartId
} from './lib/local-storage';
import {
  getPropertyId,
  getProperty,
  setForcedPropertyId
} from './lib/propertyManager';
import {
  analyticsInit,
  merchantUserEvent,
  analyticsPurchase
} from './lib/legacy-analytics';
import { trackFpti } from './lib/fpti';
import { track } from './lib/track';
import { getUserIds } from './lib/userManager';
import { setConfigCurrency } from './config-manager';

const getAccessToken = (url : string, mrid : string) : Promise<Object> => {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mrid,
      clientId: getClientID()
    })
  }).then(r => r.json()).then(data => {
    return data;
  });
};

let trackEventQueue = [];

export const trackEvent = (trackingType : EventType, trackingData : any) : void => {
  // CartId can be set by any event if it is provided
  if (trackingData.cartId) {
    setCartId(trackingData.cartId);
  }

  if (trackingData.currencyCode) {
    setConfigCurrency(trackingData.currencyCode);
  }

  // Events cannot be fired without a propertyId. We add events
  // to a queue if a propertyId has not yet been returned.
  if (!getPropertyId()) {
    trackEventQueue.push([ trackingType, trackingData ]);
    return;
  }

  const programExists = getProperty().programId;

  switch (trackingType) {
  case 'view':
  case 'customEvent':
    if (programExists) {
      switch (trackingData.eventName) {
      case 'analytics-init':
        analyticsInit();
        break;
      case 'analytics-cancel':
        merchantUserEvent();
        break;
      }
    }

    trackFpti(trackingData);
    break;
  case 'purchase':
    if (programExists) {
      analyticsPurchase();
    }
  default:
    track(trackingType, trackingData);
    break;
  }
};

const trackCartEvent = (cartEventType : CartEventType, trackingData : CartData | RemoveFromCartData) => {
  trackEvent('cartEvent', { ...trackingData, cartEventType });
};

export const trackerFunctions = {
  addToCart: (data : CartData) => {
    try {
      data = addToCartNormalizer(data);
      JL.trackActivity('addToCart', data);
      validateAddItems(data);
      return trackCartEvent('addToCart', data);
    } catch (err) {
      logger.error('addToCart', err);
    }
  },
  setCart: (data : CartData) => {
    try {
      data = setCartNormalizer(data);
      JL.trackActivity('setCart', data);
      validateAddItems(data);
      return trackCartEvent('setCart', data);
    } catch (err) {
      logger.error('setCart', err);
    }
  },
  removeFromCart: (data : RemoveFromCartData) => {
    try {
      data = removeFromCartNormalizer(data);
      JL.trackActivity('removeFromCart', data);
      validateRemoveItems(data);
      return trackCartEvent('removeFromCart', data);
    } catch (err) {
      logger.error('removeFromCart', err);
    }
  },
  purchase: (data : PurchaseData) => {
    try {
      data = purchaseNormalizer(data);
      JL.trackActivity('purchase', data);
      validatePurchase(data);
      return trackEvent('purchase', data);
    } catch (err) {
      logger.error('purchase', err);
    }
  },
  setCartId: (cartId : string) => setCartId(cartId),
  cancelCart: () => {
    const event = trackEvent('cancelCart', {});
    // a new id can only be created AFTER the 'cancel' event has been fired
    createNewCartId();
    return event;
  },

  setUser: (data : { user : UserData } | UserData) => {
    try {
      data = setUserNormalizer(data);
      validateUser(data);
    } catch (err) {
      logger.error('setUser', err);
      
    }
    /*
    if (merchantProvidedUserId !== undefined || userEmail || userName) {
      trackEvent(configHelper.getConfig(), 'setUser', { prevMerchantProvidedUserId });
    }
    */
  },
  setPropertyId: (id : string) => {
    setForcedPropertyId(id);
  },

  getIdentity: (data : IdentityData, url? : string = accessTokenUrl) : Promise<Object> => {
    const {
      accessTokenUrl
    } = constants;
    return getAccessToken(url, data.mrid).then(accessToken => {
      if (accessToken.data) {
        if (data.onIdentification) {
          data.onIdentification({ getAccessToken: () => accessToken.data });
        }
      } else {
        if (data.onError) {
          data.onError({
            message: 'No token could be created',
            error: accessToken
          });
        }
      }
      return accessToken;

    }).catch(err => {
      if (data.onError) {
        data.onError({
          message: 'No token could be created',
          error: err
        });
      }

      return {};
    });
  },

  customEvent: (eventName : string, data? : Object) => {
    try {
      validateCustomEvent(eventName, data);

      const fptiInput : FptiInput = {
        eventName,
        eventType: 'customEvent'
      };

      if (data) {
        fptiInput.eventData = data;
      }

      trackEvent('customEvent', fptiInput);
    } catch (err) {
      logger.error('customEvent', err);
    }
  },

  viewPage: () => {
    // $FlowFixMe
    const { merchantProvidedUserId, shopperId, ppId } = getUserIds();

    const cartId = getOrCreateValidCartId();

    const data : FptiInput = {
      eventName: 'pageView',
      eventType: 'view',
      shopperId,
      merchantProvidedUserId,
      encryptedAccountNumber: ppId,
      cartId
    };

    trackEvent('view', data);
  },

  track: (type : string, data : Object) => {
    // To future developers. This is only for supporting an undocumented
    // Tracker.track function call.
    JL.trackActivity(type, data);
    if (typeof configHelper[type] === 'function') {
      try {
        configHelper[type](data);
      } catch (err) {
        logger.error('deprecated_track', err);
      }
    }
  },

  getUserAccessToken: (cb? : function) => {
    const getUrl = _.get(configStore, 'paramsToTokenUrl');
    let url = 'https://paypal.com/muse/api/partner-token';
    if (typeof getUrl === 'function') {
      url = getUrl();
    }

    return window.fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        merchantId: getMerchantID()[0],
        clientId: getClientID()
      })
    }).then(res => {
      if (res.status !== 200) {
        return false;
      }
      return res.json();
    }).then(data => {
      if (!data) {
        const failurePayload = { success: false };
        return cb ? cb(failurePayload) : failurePayload;
      }
      const identityPayload = {
        ...data,
        success: true
      };
      return cb ?  cb(identityPayload) : identityPayload;
    }).catch(err => {
      logger.error('identity', err);
    });
  }
};

export const clearTrackQueue = () => {
  trackEventQueue.forEach(([ trackingType, trackingData ]) => {
    trackEvent(trackingType, trackingData);
  });
  trackEventQueue = [];
};

export const installTrackerFunctions = (configHelper : Object, configStore : Object) => {
  configHelper.getConfig = () => {
    return configStore;
  };
};
