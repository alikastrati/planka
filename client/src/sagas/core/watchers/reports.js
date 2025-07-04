import { takeEvery, call, put } from 'redux-saga/effects';
import reportsServices from '../services/reports';
import EntryActionTypes from '../../../constants/EntryActionTypes';

function* handleFetchClosedCardsLabels(action) {
  const result = yield call(reportsServices.fetchClosedCardsLabels, action.payload.boardId);
  if (result) {
    yield put({
      type: `${EntryActionTypes.CLOSED_CARDS_LABELS_FETCH}_SUCCESS`,
      payload: result,
    });
  }
}

export default function* watchFetchClosedCardsLabels() {
  yield takeEvery(
    EntryActionTypes.CLOSED_CARDS_LABELS_FETCH,
    handleFetchClosedCardsLabels,
  );
}
