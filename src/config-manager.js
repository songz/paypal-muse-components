/* @flow */
import 'whatwg-fetch'; // eslint-disable-line import/no-unassigned-import

import _ from 'lodash';
import { getCurrency } from '@paypal/sdk-client/src';

import { fetchContainerSettings } from './lib/get-property-id';
import constants from './lib/constants';
import getJetlore, {initializeJetlore} from './lib/jetlore';
import { setupUserIdentity } from './lib/iframe-tools/identity-manager';
import type {
  Config
} from './types';
import { logger } from './lib/logger';
import {
  createNewCartId,
  getOrCreateValidCartId,
  setGeneratedUserId,
  getOrCreateValidUserId,
  setMerchantProvidedUserId
} from './lib/local-storage';
import { installTrackerFunctions, clearTrackQueue } from './tracker-functions';

const encodeData = data => encodeURIComponent(btoa(JSON.stringify(data)));

// paramsToBeaconUrl is a function that gives you the ability to override the beacon url
// to whatever you want it to be based on the trackingType string and data object.
// This can be useful for testing purposes, this feature won't be used by merchants.
const configInfo = {
  paramsToBeaconUrl: ({ trackingType, data }) => {
    return `https://www.paypal.com/targeting/track/${ trackingType }?data=${ encodeData(data) }`;
  },
  paramsToTokenUrl: () => {
    return 'https://paypal.com/muse/api/partner-token';
  }
};

export const initializeConfigManager = (config) => {
  const newConfig = { ...config };
  if (config.paramsToBeaconUrl && typeof config.paramsToBeaconUrl === 'function') {
    newConfig.paramsToBeaconUrl = config.paramsToBeaconUrl;
  }
  if (config.paramsToTokenUrl && typeof config.paramsToTokenUrl === 'function') {
    newConfig.paramsToTokenUrl = config.paramsToTokenUrl;
  }
  initializeJetlore(config)
};

export const setConfigCurrency = (currencyCode) => {
  configInfo.currencyCode = currencyCode;
};

export const getConfig = () => {
  return configInfo;
};

export const createConfigManager = (config? : Config) : any => {
  const configStore /* (:config) */ = { ...constants.defaultTrackerConfig, ...config };

  const configHelper = {};

  const JL = getJetlore(configStore);
  installTrackerFunctions(configHelper, configStore, JL);

  // Todo: Delete
  configHelper.setupConfigUser = () => {
    /*
      Bit of a tricky thing here. We allow the merchant to pass
      in { user: { id } }. However, we convert that property
      to config.user.merchantProvidedUserId instead of setting
      it as config.user.id. This is because config.user.id is a
      constant that we generate internally.
      */
    const merchantUserId = _.get(config, 'user.id');
    if (merchantUserId) {
      configStore.user.merchantProvidedUserId = merchantUserId;
      delete configStore.user.id;
    }
  };

  configHelper.setupJL = (tracker : Object) => {
    JL.addJLFunctionsToSDK(tracker);
  };

  configHelper.checkDebugMode = () => {
    const currentUrl = new URL(window.location.href);
    // use the param ?ppDebug=true to see logs
    const debug = currentUrl.searchParams.get('ppDebug');

    if (debug) {
      // eslint-disable-next-line no-console
      console.log('PayPal Shopping: debug mode on.');
    }
  };

  configHelper.setupUserAndCart = () => {
    let userId;

    try {
      setupUserIdentity(configStore);
      getOrCreateValidCartId();
      userId = getOrCreateValidUserId().userId;

      const merchantUserId = _.get(configStore, 'user.merchantProvidedUserId', false);
      if (merchantUserId) {
        setMerchantProvidedUserId(merchantUserId);
      }
    } catch (err) {
      logger.error('cart_or_shopper_id', err);
      createNewCartId();
      userId = setGeneratedUserId().userId;
    }

    configStore.user = configStore.user || {};
    configStore.user.id = userId;
    configStore.currencyCode = configStore.currencyCode || getCurrency();
  };

  configHelper.setImplicitPropertyId = () => {
    fetchContainerSettings(configStore).then(containerSummary => {
      /* this is used for backwards compatibility we do not want to overwrite
    a propertyId if propertyId has already been set using the SDK */
      if (!configStore.propertyId) {
        configStore.propertyId = containerSummary.id;
      }

      configStore.containerSummary = containerSummary;

      clearTrackQueue(configStore);
    });
  };

  return configHelper;
};

