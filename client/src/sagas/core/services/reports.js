// services/reports.js
import reportsApi from '../../../api/reports';
import { getToken } from '../../../lib/hooks/token-auth-helper'; // a helper you write

function fetchClosedCardsLabels(boardId) {
  return reportsApi.getClosedCardsLabels(boardId, {
    Authorization: `Bearer ${getToken()}`,
  });
}

export default {
  fetchClosedCardsLabels,
};
