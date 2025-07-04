import socket from '../api/socket';

function getClosedCardsLabels(boardId, headers) {
  return socket.get(`/boards/${boardId}/reports/closed-cards-labels`, null, headers);
}

export default {
  getClosedCardsLabels,
};
