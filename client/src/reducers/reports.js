// src/reducers/reports.js
/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import EntryActionTypes from '../constants/EntryActionTypes';

const initialState = {
  closedCardsLabelsReport: null,
};

// eslint-disable-next-line default-param-last
export default (state = initialState, { type, payload }) => {
  switch (type) {
    case EntryActionTypes.CLOSED_CARDS_LABELS_FETCH_SUCCESS:
      console.log('--- REPORTS REDUCER DEBUG ---');
      console.log('Action Type:', type);
      console.log('Payload Content:', payload); 
      console.log('Current State before update:', state);
      console.log('--- END REPORTS REDUCER DEBUG ---');
      return {
        ...state,
        closedCardsLabelsReport: {
          items: payload.items,
          included: payload.included,
        },
      };

    case EntryActionTypes.CLOSED_CARDS_LABELS_FETCH:
      console.log('--- REPORTS REDUCER DEBUG ---');
      console.log('Action Type:', type);
      console.log('--- END REPORTS REDUCER DEBUG ---');
      return {
        ...state,
        closedCardsLabelsReport: null,
      };

    case EntryActionTypes.CLOSED_CARDS_LABELS_FETCH_FAILURE:
      console.log('--- REPORTS REDUCER DEBUG ---');
      console.error('Action Type:', type);
      console.error('Payload (error) received:', payload);
      console.log('--- END REPORTS REDUCER DEBUG ---');
      return {
        ...state,
        closedCardsLabelsReport: null,
      };
      
    default:
      return state;
  }
};
