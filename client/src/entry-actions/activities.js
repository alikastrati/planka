import EntryActionTypes from '../constants/EntryActionTypes';

const fetchActivitiesInCurrentBoard = () => ({
  type: EntryActionTypes.ACTIVITIES_IN_CURRENT_BOARD_FETCH,
  payload: {},
});

const fetchActivitiesInCurrentCard = () => ({
  type: EntryActionTypes.ACTIVITIES_IN_CURRENT_CARD_FETCH,
  payload: {},
});

const handleActivityCreate = (activity) => ({
  type: EntryActionTypes.ACTIVITY_CREATE_HANDLE,
  payload: {
    activity,
  },
});

const fetchActivitiesForReports = (boardId) => ({
  type: EntryActionTypes.ACTIVITIES_IN_BOARD_FETCH_FOR_REPORTS,
  payload: { boardId },
});

const fetchActivitiesForReportsSuccess = (activities) => ({
  type: EntryActionTypes.ACTIVITIES_IN_BOARD_FETCH_FOR_REPORTS_SUCCESS,
  payload: { activities },
});

export default {
  fetchActivitiesInCurrentBoard,
  fetchActivitiesInCurrentCard,
  handleActivityCreate,
  fetchActivitiesForReports,
  fetchActivitiesForReportsSuccess,
};
