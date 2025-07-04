import EntryActionTypes from '../constants/EntryActionTypes';

const fetchClosedCardsLabels = (boardId) => ({
  type: EntryActionTypes.CLOSED_CARDS_LABELS_FETCH,
  payload: { boardId },
});

export default {
  fetchClosedCardsLabels,
};
