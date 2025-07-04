module.exports = {
  inputs: {
    boardId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const moveActions = await Action.find({
      boardId: inputs.boardId,
      type: Action.Types.MOVE_CARD,
    });

const latestMoveByCardId = {};

for (const action of moveActions) {
  const cardId = action.cardId;
  if (!latestMoveByCardId[cardId] || action.createdAt > latestMoveByCardId[cardId].createdAt) {
    latestMoveByCardId[cardId] = action;
  }
}

const closedMoves = [];

for (const moveAction of Object.values(latestMoveByCardId)) {
  const { toList } = moveAction.data;
  if (toList?.type === 'closed') {
    closedMoves.push(moveAction);
  }
}
    const cardIds = _.uniq(closedMoves.map((a) => a.cardId));
    const userIds = _.uniq(closedMoves.map((a) => a.userId));

    if (cardIds.length === 0) {
      return [];
    }

    const createActions = await Action.find({
      boardId: inputs.boardId,
      type: Action.Types.CREATE_CARD,
      cardId: cardIds,
    });

    const cardLabels = await CardLabel.find({
      cardId: cardIds,
    });

    const labelIds = _.uniq(cardLabels.map((cl) => cl.labelId));
    const labels = await Label.find({
      id: labelIds,
    });

    const resultsByUser = {};

    closedMoves.forEach((moveAction) => {
      const userId = moveAction.userId;
      const cardId = moveAction.cardId;
      const closedAt = moveAction.createdAt;
      const cardName = moveAction.data?.card?.name || '';

      const createdAction = createActions.find(
        (a) => a.cardId === cardId
      );

      const createdAt = createdAction?.createdAt || null;

      if (!resultsByUser[userId]) {
        resultsByUser[userId] = {};
      }

      if (!resultsByUser[userId][cardId]) {
        resultsByUser[userId][cardId] = {
          userId,
          cardId,
          cardName,
          createdAt,
          closedAt,
          labelCounts: {},
        };
      }

      const labelsForCard = cardLabels
        .filter((cl) => cl.cardId === cardId)
        .map((cl) => cl.labelId);

      labelsForCard.forEach((labelId) => {
        if (!resultsByUser[userId][cardId].labelCounts[labelId]) {
          resultsByUser[userId][cardId].labelCounts[labelId] = 0;
        }
        resultsByUser[userId][cardId].labelCounts[labelId] += 1;
      });
    });

    const result = [];

for (const userId of Object.keys(resultsByUser)) {
  for (const cardId of Object.keys(resultsByUser[userId])) {
    const entry = resultsByUser[userId][cardId];

    if (_.isEmpty(entry.labelCounts)) {
      result.push({
        userId,
        cardId,
        cardName: entry.cardName,
        createdAt: entry.createdAt,
        closedAt: entry.closedAt,
        labelId: null,
        labelName: 'No Label',
        color: null,
        count: 1,
      });
    } else {
      for (const [labelId, count] of Object.entries(entry.labelCounts)) {
        const label = labels.find((l) => l.id === labelId);
        result.push({
          userId,
          cardId,
          cardName: entry.cardName,
          createdAt: entry.createdAt,
          closedAt: entry.closedAt,
          labelId,
          labelName: label?.name || null,
          color: label?.color || null,
          count,
        });
      }
    }
  }
}
    return result;
  },
};
