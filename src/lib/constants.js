/* @flow */
export default {
  'oneHour': 1000 * 60 * 60,
  'sevenDays': 1000 * 60 * 60 * 24 * 7,
  'oneMonth': 1000 * 60 * 60 * 24 * 30,
  'cartLimit': 10,
  'accessTokenUrl': 'https://www.paypal.com/muse/api/partner-token',
  'storage': {
    'paypalCrUser': 'paypal-cr-user',
    'paypalCrCart': 'paypal-cr-cart',
    'paypalCrPropertyId': 'paypal-cr-propid',
    'paypalCrContainer': 'paypal-cr-container',
    'paypalSDKIdentity': 'paypal-sdk-identity'
  },
  'defaultTrackerConfig': {
    'user': {
      'id': '',
      'email': '',
      'name': '',
      'merchantProvidedUserId': ''
    }
  },
};

export const PP_PROD_URL = "https://www.paypal.com"
export const PP_PROPERTY_URL = 'https://www.paypal.com/tagmanager/containers/xo"
