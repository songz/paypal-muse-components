/* @flow */
import { getMerchantID } from '@paypal/sdk-client/src';

import type {
  Container,
  ContainerSummary
} from '../types';

import { logger } from './logger';
import { storage, oneHour, PP_PROPERTY_URL } from './constants';

const propertyConfig = {
  paramsToPropertyUrl: () => {
    return PP_PROPERTY_URL;
  }
};

let propertyStore = false;
let forcedPropertyId = false;

/* Takes the full container and transforms it into
a format better suited for use by the SDK */
const parseContainer = (container : Container) : ContainerSummary => {
  const offerTag = container.tags.filter(tag => tag.tag_definition_id === 'offers')[0];
  let programId;

  if (offerTag && offerTag.configuration) {
    programId = offerTag.configuration.filter(config => config.id === 'offer-program-id')[0];
    programId = programId ? programId.value : null;
  } else {
    programId = null;
  }

  return {
    id: container.id,
    integrationType: container.integration_type,
    mrid: container.owner_id,
    programId,
    jlAccessToken: container.jlAccessToken
  };
};

const emptyContainer : Container = {
  id: '',
  integration_type: '',
  owner_id: '',
  tags: [],
  jlAccessToken: ''
};

const fetchProperty = async () => {
  const merchantId = getMerchantID()[0];

  let containerSummary = emptyContainer;
  if (merchantId) {
    const currentLocation = `${ window.location.protocol }//${ window.location.host }`;
    try {
      const containerResponse = await fetch(`${ propertyConfig.paramsToPropertyUrl() }?mrid=${ merchantId }&url=${ encodeURIComponent(currentLocation) }&jlAccessToken=true`).then(res => res.json());
      containerSummary = parseContainer(containerResponse);
    } catch (err) {
      logger.error('fetchProperty', err);
    }
  }
  const storedValue = JSON.stringify({
    containerSummary,
    createdAt: Date.now()
  });
  window.localStorage.setItem(storage.paypalSDKIdentity, JSON.stringify(storedValue));
};

export const getProperty = () => {
  try {
    propertyStore = JSON.parse(window.localStorage.getItem(storage.paypalCrContainer));
  } catch (err) {
    fetchProperty();
    return {};
  }

  if (propertyStore && forcedPropertyId) {
    propertyStore.id = forcedPropertyId;
  }
  const now = Date.now();
  if (propertyStore && ((now - propertyStore.createdAt) > oneHour)) {
    fetchProperty();
    return propertyStore;
  }

  return propertyStore ? propertyStore : {};
};

export const setForcedPropertyId = (id) => {
  forcedPropertyId = id;
};

export const getPropertyId = () => {
  try {
    propertyStore = JSON.parse(window.localStorage.getItem(storage.paypalCrContainer));
  } catch (err) {
    fetchProperty();
    return null;
  }

  if (propertyStore && forcedPropertyId) {
    propertyStore.id = forcedPropertyId;
  }

  const now = Date.now();
  if (propertyStore && ((now - propertyStore.createdAt) > oneHour)) {
    fetchProperty();
    return propertyStore.id;
  }

  return propertyStore ? propertyStore.id : null;
};

// Called in following places
//   1. paypal.Tracker( {user...} )
export const initializeProperty = (config) => {
  if (typeof config.paramsToPropertyUrl === 'function') {
    propertyConfig.paramsToPropertyUrl = config.paramsToPropertyUrl;
  }
  getPropertyId();
};

/*
export const fetchPropertyId = ({ paramsToPropertyIdUrl, propertyId } : Config) : Promise<string> => {
  const cachedPropertyId = getPropertyId();

  if (cachedPropertyId) {
    return Promise.resolve(cachedPropertyId.propertyId);
  }

  return getContainer(paramsToPropertyIdUrl)
    .then(parseContainer)
    .then(containerSummary => {
      // save to localstorage
      setContainer(containerSummary);

      if (propertyId) {
        setPropertyId(propertyId);
      } else {
        setPropertyId(containerSummary.id);
      }

      return containerSummary.id;
    })
    .catch((err) => {
      return '';
    });
};

export const fetchContainerSettings = ({ paramsToPropertyIdUrl, propertyId } : Config) : Promise<ContainerSummary> => {
  const cachedContainer = getValidContainer();

  if (cachedContainer) {
    return Promise.resolve(cachedContainer);
  }

  return getContainer(paramsToPropertyIdUrl)
    .then(parseContainer)
    .then(containerSummary => {
      // save to localstorage
      setContainer(containerSummary);

      if (propertyId) {
        setPropertyId(propertyId);
      } else {
        setPropertyId(containerSummary.id);
      }

      return containerSummary;
    })
    .catch((err) => {
      logger.error('getContainer', err);
      // $FlowFixMe
      return '';
    });
};
*/

