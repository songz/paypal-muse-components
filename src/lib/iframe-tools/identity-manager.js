/* @flow */
import get from 'lodash/get';

import { setIdentity, getIdentity } from '../local-storage';
import { getDeviceInfo } from '../get-device-info';
import { logger } from '../logger';

// TODO: Delete
export const setupUserIdentity = () => {
  /* Do not fetch if identity data
    has recently be cached. */
  const cachedIdentity = getIdentity();
  if (cachedIdentity) {
    return;
  }

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

    const confidence = get(e, 'data.payload.confidenceScore', 0);
    if (parseInt(confidence, 10) !== 100) {
      return;
    }

    setIdentity(get(e, 'data.payload'));
  });

  // For future developers: QA did not work
  /*
 * Add ability to configure targeting url
  if (config.paramsToIdentityUrl) {
    iframeUrl = config.paramsToIdentityUrl();
 *
*/
  const queryHost = `https://www.sandbox.paypal.com`;

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
};

