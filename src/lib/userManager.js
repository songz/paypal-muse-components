import get from 'lodash/get';
import { getDeviceInfo } from './get-device-info';
import generate from './generate-id';
import { logger } from './logger';
import { storage, oneHour, PP_PROD_URL } from './constants';

const userStore = {}
userStore.shopperId = window.localStorage.getItem(storage.paypalCrUser) || generate.generateId()
window.localStorage.setItem(storage.paypalCrUser, userStore.shopperId)

const userConfig = {
  paramsToIdentityUrl: () => {
    return PP_PROD_URL
  }
}

// Called in following places
//   1. tracker.setUser({...})
//   2. initializeUserConfig
export const setUserStore = (config) => {
  if (config.user) {
    userStore.merchant = {...config.user}
    if (config.user.id) {
      /*
        Bit of a tricky thing here. We allow the merchant to pass
        in { user: { id } }. However, we convert that property
        to config.user.merchantProvidedUserId instead of setting
        it as config.user.id. This is because config.user.id is a
        constant that we generate internally.
      */
      userStore.merchantProvidedUserId = config.user.id
    }
  }
}

// Called in following places
//   1. paypal.Tracker( {user...} )
export const initializeUserConfig = (config) => {
  if (typeof config.paramsToIdentityUrl === 'function') {
    userConfig.paramsToIdentityUrl = config.paramsToIdentityUrl
  }
  if (config.user) {
    setUserStore(config.user)
  }
  getIdentity()
}

const clearIdentity = () => {
  window.localStorage.removeItem(storage.paypalSDKIdentity);
};

const getIdentity = () => {
  let storedValue = window.localStorage.getItem(storage.paypalSDKIdentity);
  try {
    storedValue = JSON.parse(storedValue);
  } catch (err) {
    fetchPPUser();
    return null;
  }

  const now = Date.now();
  /* Discard identity information more than an hour old. */
  if (storedValue && (now - storedValue.createdAt) > oneHour) {
    fetchPPUser();
    return storedValue.identity;
  }

  return storedValue ? storedValue.identity : null;
};

// TODO: Perhaps we want to debounce this
// Called in following scenarios
//   1. When paypalSDKIdentity is corrupted
//   2. When paypalSDKIdentity data is old
//   fetchPPUser will always set paypalSDKIdentity localStorage
const fetchPPUser = () => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('src', 'https://www.paypalobjects.com/ppshopping/9ac/964d282/9ac/964d282b/index.html');
  document.body.appendChild(iframe);

  window.addEventListener('message', (e) => {
    if (e.source.window !== iframe.contentWindow) {
      return;
    }
    if (e.data.type === 'fetch_identity_error') {
      return logger.error('identity iframe error:', e.data.payload);
    }

    iframe.remove()
    const confidence = get(e, 'data.payload.confidenceScore', 0);
    let identity = get(e, 'data.payload')
    if (parseInt(confidence, 10) !== 100) {
      identity = false
    }

    // Always set a timestamp to prevent overloading service
    const storedValue = {
      identity,
      createdAt: Date.now()
    }
    window.localStorage.setItem(storage.paypalSDKIdentity, JSON.stringify(storedValue));
  });

  // For future developers: QA did not work
  const queryHost = userConfig.paramsToIdentityUrl()

  iframe.addEventListener('load', () => {
    const deviceInfo = getDeviceInfo();
    const country = 'US';

    iframe.contentWindow.postMessage({
      type: 'fetch_identity_request',
      payload: {
        deviceInfo,
        country,
        queryHost
      }
    }, 'https://www.paypalobjects.com');
  });
}
