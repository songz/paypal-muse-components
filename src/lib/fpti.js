/* @flow */
import { getClientID, getMerchantID, getPartnerAttributionID } from '@paypal/sdk-client/src';

import type {
  FptiInput,
  FptiVariables,
  LegacyVariables,
  Config
} from '../types';
import { getConfig } from '../config-manager';

import { getDeviceInfo } from './get-device-info';
import { getIdentity } from './local-storage';

export const sendBeacon = (src : string, data : FptiVariables | LegacyVariables) => {
  let query = Object.keys(data).map(key => {
    // $FlowFixMe
    return `${ encodeURIComponent(key) }=${ encodeURIComponent(data[key]) }`;
  });

  query = query.join('&');

  const beaconImage = document.createElement('img');
  beaconImage.src = `${ src }?${ query }`;
};

// removes empty strings, `undefined`, `null`, and `NaN` from fpti event
export const filterFalsyValues = (source : Object) : FptiVariables | LegacyVariables => {
  Object.keys(source).forEach(key => {
    const val = source[key];

    if (val === '' || val === undefined || val === null || Number.isNaN(val)) {
      delete source[key];
    }
  });

  return source;
};

const resolveTrackingData = (data : FptiInput) : any => {
  const deviceInfo = getDeviceInfo();
  const identity = getIdentity() || {};
  const config = getConfig();

  return {
    product: 'ppshopping',
    e: 'im',
    comp: 'ppshoppingsdk',
    page: `ppshopping:${ data.eventName }`,
    t: new Date().getTime(),
    g: new Date().getTimezoneOffset(),
    ...deviceInfo,
    ...config,
    ...data,
    ...identity
  };
};

const resolveTrackingVariables = (data : any) : FptiVariables => ({
  // Device height
  dh: data.deviceHeight,

  // Device width
  dw: data.deviceWidth,

  // Browser height
  bh: data.browserHeight,

  // Browser width
  bw: data.browserWidth,

  // Color depth
  cd: data.colorDepth,

  // Screen height
  sh: data.screenHeight,

  // Screen width
  sw: data.screenWidth,

  // Device type
  dvis: data.deviceType,

  // Browser type
  btyp: data.browserType,

  // Rosetta language
  rosetta_language: data.rosettaLanguage,

  // Page domain & path
  ru: data.location,

  // Identification confidence score
  confidence_score: data.confidenceScore,

  // Identification type returned by VPNS
  identifier_used: data.identificationType,

  // Unverified encrypted customer account number
  unverified_cust_id: data.encryptedAccountNumber,

  // Analytics identifier associated with the merchant site. XO container id.
  item: data.propertyId,

  // Merchant encrypted account number
  mrid: getMerchantID()[0],

  // ClientID
  client_id: getClientID(),
    
  // Partner AttributionId
  bn_code: getPartnerAttributionID(),

  // Event Name
  event_name: data.eventName,

  // Event Type
  event_type: data.eventType,

  // Event Data
  sinfo: JSON.stringify(data.eventData),

  // Legacy value for filtering events in Herald
  page: data.page,

  // Legacy value for filtering events in Herald
  pgrp: data.page,

  // Application name
  comp: data.comp,

  // Legacy impression event
  // TODO: currently hard-coded to 'im'. When additional events (add-to-cart, purchase, etc)
  // are moved to fpti this value will need to be updated.
  e: data.e,

  // Timestamp
  t: data.t,

  // Timestamp relative to user
  g: data.g,

  external_id: data.merchantProvidedUserId,

  shopper_id: data.shopperId,

  merchant_cart_id: data.cartId,

  product: data.product
});

export const trackFpti = (data : FptiInput) => {
  const fptiServer = 'https://t.paypal.com/ts';
  const trackingVariables = resolveTrackingVariables(resolveTrackingData(data));

  sendBeacon(fptiServer, filterFalsyValues(trackingVariables));
};
