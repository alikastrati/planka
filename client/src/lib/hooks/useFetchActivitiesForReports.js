import { useEffect } from 'react';
import store from '../store';
import { fetchActivitiesInBoard } from '../sagas/core/services/activities';

export default function useFetchActivitiesForReports(boardId) {
  useEffect(() => {
    if (boardId) {
      store.runSaga(fetchActivitiesInBoard, boardId);
    }
  }, [boardId]);
}
