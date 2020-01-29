/* @flow */
import { getClientID, getMerchantID } from '@paypal/sdk-client/src';

import type {
  EventType,
  CartData,
  RemoveFromCartData,
  PurchaseData
} from '../types';
import { getConfig } from '../config-manager';

import { getOrCreateValidCartId } from './local-storage';
import { getDeviceInfo } from './get-device-info';
import { getPropertyId } from './propertyManager';
import { getUserIds } from './userManager';


const createTrackingImg = src => {
  const beaconImage = new window.Image();
  beaconImage.src = src;
};

export const track = (
  trackingType : EventType,
  trackingData : CartData | RemoveFromCartData | PurchaseData
) => {
  const cartId = getOrCreateValidCartId();
  const currencyCode = getConfig().currencyCode;
  const propertyId = getPropertyId();
  const { ppId, merchantProvidedUserId, shopperId } = getUserIds();

  const user = {
    id: ppId, merchantProvidedUserId, shopperId
  };

  const deviceInfo = getDeviceInfo();
  const data = {
    ...trackingData,
    currencyCode,
    cartId,
    user,
    propertyId,
    trackingType,
    clientId: getClientID(),
    merchantId: getMerchantID().join(','),
    deviceInfo,
    version: 'TRANSITION_FLAG'
  };

  const config = getConfig();
  const src = config.paramsToBeaconUrl({ trackingType, data });

  // Send tracking info via image url
  createTrackingImg(src);
};
