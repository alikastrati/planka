import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import reportsActions from '../entry-actions/reports';

export default function useFetchActivitiesForReports(boardId, enabled = true) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return;

    dispatch(reportsActions.fetchClosedCardsLabels(boardId));
  }, [boardId, dispatch, enabled]);
}
