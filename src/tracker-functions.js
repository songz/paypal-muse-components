/* @flow */
import 'whatwg-fetch'; // eslint-disable-line import/no-unassigned-import

import { getClientID, getMerchantID } from '@paypal/sdk-client/src';

import { accessTokenUrl } from './lib/constants';
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
  cartEventNormalizer,
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
import { getUserIds, setUserStore } from './lib/userManager';
import { setConfigCurrency, getConfig } from './config-manager';
import JL from './lib/jetlore';

let trackEventQueue = [];

const sendTokenRequest = (url, body) => {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  }).then(r => r.json());
};

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
  try {
    const data = cartEventNormalizer(trackingData);
    trackEvent('cartEvent', { ...data, cartEventType });
  } catch (err) {
    logger.error(cartEventType, err);
  }
};

export const trackerFunctions = {
  addToCart: (data : CartData) => {
    return trackCartEvent('addToCart', data)
  },
  removeFromCart: (data : RemoveFromCartData) => {
    return trackCartEvent('removeFromCart', data);
  },
  setCart: (data : CartData) => {
    return trackCartEvent('setCart', data);
  },
  purchase: (data : PurchaseData) => {
    try {
      data = cartEventNormalizer(data);
      JL.trackActivity('purchase', data);
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
      const userData = setUserNormalizer(data);
      setUserStore({user: userData});
    } catch (err) {
      logger.error('setUser', err);
      
    }
  },
  setPropertyId: (id : string) => {
    setForcedPropertyId(id);
  },

  customEvent: (eventName : string, data? : Object) => {
    try {

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
    // JL.trackActivity(type, data);
    if (typeof trackerFunctions[type] === 'function' && type !== 'track') {
      try {
        trackerFunctions[type](data)
      } catch (err) {
        logger.error('deprecated_track', err);
      }
    }
  },

  getIdentity: (data : IdentityData, url? : string = accessTokenUrl) : Promise<Object> => {
    let errHandler = () => {};
    if (data.onError && typeof data.onError === 'function') {
      errHandler = data.onError;
    }
    return sendTokenRequest(url, JSON.stringify({
      mrid: data.mrid,
      clientId: getClientID()
    })).then(accessToken => {
      if (accessToken.data && data.onIdentification && typeof data.onIdentification === 'function') {
        data.onIdentification({ getAccessToken: () => accessToken.data });
      } else {
        errHandler({
          message: 'No token could be created',
          error: accessToken
        });
      }
      return accessToken;
    }).catch(err => {
      errHandler({
        message: 'No token could be created',
        error: err
      });
      return {};
    });
  },

  getUserAccessToken: (cb? : function) => {
    const url = getConfig().paramsToTokenUrl();
    return sendTokenRequest(url, JSON.stringify({
      merchantId: getMerchantID()[0],
      clientId: getClientID()
    })).then(data => {
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
