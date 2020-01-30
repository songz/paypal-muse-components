/* @flow */
export default {
  'oneMonth': 1000 * 60 * 60 * 24 * 30,
  'cartLimit': 10,
  'defaultTrackerConfig': {
    'user': {
      'id': '',
      'email': '',
      'name': '',
      'merchantProvidedUserId': ''
    }
  }
};

export const accessTokenUrl = 'https://www.paypal.com/muse/api/partner-token';
export const PP_PROD_URL = 'https://www.paypal.com';
export const PP_PROPERTY_URL = 'https://www.paypal.com/tagmanager/containers/xo';
export const storage = {
  'paypalCrUser': 'paypal-cr-user',
  'paypalCrCart': 'paypal-cr-cart',
  'paypalCrPropertyId': 'paypal-cr-propid',
  'paypalCrContainer': 'paypal-cr-container',
  'paypalSDKIdentity': 'paypal-sdk-identity'
};
export const oneHour = 1000 * 60 * 60;
export const sevenDays = 1000 * 60 * 60 * 24 * 7;
