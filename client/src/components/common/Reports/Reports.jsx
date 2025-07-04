import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import socket from '../../../api/socket';
import { selectAllActivities } from '../../../selectors/activities.js';
import userSelectors from '../../../selectors/users.js';
import useFetchActivitiesForReports from '../../../hooks/useFetchActivitiesForReports.js';
import reportsActions from '../../../entry-actions/reports';
import { getToken } from '../../../lib/hooks/token-auth-helper';
import ActionTypes from '../../../constants/ActionTypes';
import { exportToExcel, exportToPdf } from '../../../utils/report-to-excel-and-pdf';

const Reports = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);

  const activities = useSelector(selectAllActivities);
  const allUsers = useSelector(userSelectors.selectActiveUsers);
  const closedCardsLabelsReport = useSelector(
    (state) => state.reports?.closedCardsLabelsReport
  );

  // Authenticate user first
  useEffect(() => {
    socket
      .get("/users/me", null, {
        Authorization: `Bearer ${getToken()}`
      })
      .then((data) => {
        const role = data?.item?.role;
        if (role !== "admin") {
          navigate("/not-authorized");
        } else {
          setAuthorized(true);
        }
      })
      .catch((err) => {
        console.error("[Reports] Failed to fetch user", err);
        navigate("/login");
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, [navigate]);

  // Load projects and boards
  useEffect(() => {
    if (!authorized || checkingAuth) return;

    socket
      .get("/projects", null, {
        Authorization: `Bearer ${getToken()}`
      })
      .then((data) => {
        const allBoards = data.included?.boards || [];
        const boardsList = allBoards.map((b) => ({
          id: b.id,
          name: b.name,
          projectId: b.projectId
        }));
        setBoards(boardsList);
        console.log("Boards loaded:", boardsList);
      })
      .catch((err) => {
        console.error("Failed to load projects and boards:", err);
      });
  }, [authorized, checkingAuth]);

  // Run activities hook only if a board is picked
  useFetchActivitiesForReports(
    selectedBoardId,
    authorized && !checkingAuth && !!selectedBoardId
  );

  // Fetch reports and activities
  useEffect(() => {
    if (!authorized || checkingAuth || !selectedBoardId) return;

    console.log('[Reports] Checking socket connection...');
    console.log('Socket connected?', socket.isConnected());

    socket.get(
      `/boards/${selectedBoardId}/reports/closed-cards-labels`,
      null,
      { Authorization: `Bearer ${getToken()}` }
    )
      .then((data) => {
        console.log('[Reports] Direct socket test success:', data);
        dispatch({
          type: ActionTypes.CLOSED_CARDS_LABELS_FETCH_SUCCESS,
          payload: data,
        });
      })
      .catch((err) => {
        console.error('[Reports] Direct socket test error:', err);
        dispatch({
          type: ActionTypes.CLOSED_CARDS_LABELS_FETCH_FAILURE,
          payload: err,
        });
      });

    socket.get(
      `/boards/${selectedBoardId}/actions`,
      null,
      { Authorization: `Bearer ${getToken()}` }
    )
      .then((data) => {
        console.log('[Reports] Activities fetched:', data);
        dispatch({
          type: ActionTypes.ACTIVITIES_IN_BOARD_FETCH__SUCCESS,
          payload: {
            boardId: selectedBoardId,
            activities: data.items,
            users: data.included.users || [],
          },
        });
      })
      .catch((err) => {
        console.error('[Reports] Error fetching activities:', err);
      });

    dispatch(reportsActions.fetchClosedCardsLabels(selectedBoardId));
  }, [authorized, checkingAuth, dispatch, selectedBoardId]);

  const handleExportToExcel = () => {
    exportToExcel({
      closedCardsLabelsReport,
      allUsers
    });
  };

  const handleExportToPDF = () => {
    exportToPdf({
      closedCardsLabelsReport,
      allUsers
    });
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#e0e0e0'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: '#2d3238',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          border: '1px solid #3a3f47'
        }}>
          Checking permissions...
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  // Prepare data for stats
  const cardsByUserId = {};
  const countsByUserId = {};

  if (closedCardsLabelsReport?.items?.length) {
    closedCardsLabelsReport.items.forEach(item => {
      const userId = item.userId;
      const cardId = item.cardId;
      if (!userId || !cardId) return;

      if (!cardsByUserId[userId]) {
        cardsByUserId[userId] = new Set();
      }
      cardsByUserId[userId].add(cardId);
    });
  }

  for (const [userId, cardSet] of Object.entries(cardsByUserId)) {
    countsByUserId[userId] = cardSet.size;
  }

  const totalClosedCards = Object.values(countsByUserId).reduce(
    (sum, count) => sum + count,
    0
  );

  const activeUsers = Object.keys(countsByUserId).length;

  // Group label data
  const userLabelData = {};

if (closedCardsLabelsReport?.items?.length) {
  closedCardsLabelsReport.items.forEach(record => {
    const userId = record.userId;
    if (!userLabelData[userId]) {
      userLabelData[userId] = {
        name:
          closedCardsLabelsReport.included.users.find(
            (u) => u.id === userId
          )?.name || `User ${userId}`,
        labels: []
      };
    }

    const labelName = record.labelName || 'No Label';
    const existingLabel = userLabelData[userId].labels.find(
      (l) => l.name === labelName
    );

    if (existingLabel) {
      existingLabel.count += record.count;
    } else {
      userLabelData[userId].labels.push({
        name: labelName,
        count: record.count,
      });
    }
  });
}
  // --- styles ---
  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '"Nunitoga", "Helvetica Neue", Arial, Helvetica, sans-serif'
  };

  const headerStyle = {
    marginBottom: '30px',
    textAlign: 'center',
    borderBottom: '3px solid #3a3f47',
    paddingBottom: '20px'
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '60px 0 10px 0',
    letterSpacing: '-0.5px'
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: '#b0b3b8',
    margin: '0'
  };

  const cardStyle = {
    backgroundColor: '#2d3238',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.2)',
    border: '1px solid #3a3f47'
  };

  const selectStyle = {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #3a3f47',
    borderRadius: '8px',
    backgroundColor: '#1c1f23',
    color: '#e0e0e0',
    outline: 'none',
    fontFamily: 'inherit'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#e0e0e0',
    textTransform: 'uppercase'
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  };

  const statItemStyle = {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#1c1f23',
    borderRadius: '8px',
    border: '1px solid #3a3f47'
  };

  const statNumberStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 5px 0'
  };

  const statLabelStyle = {
    fontSize: '12px',
    color: '#b0b3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600'
  };

  const sectionTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '16px',
    borderLeft: '4px solid #007bff',
    paddingLeft: '12px'
  };

  const userItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: '8px',
    backgroundColor: '#1c1f23',
    borderRadius: '6px',
    border: '1px solid #3a3f47'
  };

  const userNameStyle = {
    fontWeight: '600',
    color: '#ffffff'
  };

  const userStatsStyle = {
    color: '#b0b3b8',
    fontSize: '14px'
  };

  const progressBarStyle = {
    width: '100%',
    height: '6px',
    backgroundColor: '#3a3f47',
    borderRadius: '3px',
    marginTop: '6px',
    overflow: 'hidden'
  };

  const progressFillStyle = (percentage) => ({
    height: '100%',
    backgroundColor: '#007bff',
    width: `${percentage}%`,
    transition: 'width 0.3s ease-in-out'
  });

  const buttonContainerStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  };

  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textTransform: 'uppercase'
  };

  const excelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: '#ffffff'
  };

  const pdfButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: '#ffffff'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#b0b3b8',
    fontSize: '16px',
    backgroundColor: '#1c1f23',
    borderRadius: '8px',
    border: '2px dashed #3a3f47'
  };

  const userCardsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '16px'
  };

  const userCardStyle = {
    backgroundColor: '#2d3238',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    border: '1px solid #3a3f47',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
  };

  const userCardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #3a3f47'
  };

  const userAvatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '16px',
    marginRight: '12px'
  };

  const userCardNameStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#ffffff',
    margin: '0'
  };

  const labelsContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  };

  const labelTagStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#1c1f23',
    borderRadius: '6px',
    border: '1px solid #3a3f47'
  };

  const labelNameStyle = {
    fontSize: '14px',
    color: '#e0e0e0',
    fontWeight: '500'
  };

  const labelCountBadgeStyle = {
    backgroundColor: '#007bff',
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    minWidth: '24px',
    textAlign: 'center'
  };

  const responsiveStyle = `
    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .button-container {
        justify-content: center;
      }
      .user-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .user-cards-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 480px) {
      .user-cards-grid {
        gap: 16px;
      }
    }
  `;

  return (
    <div style={containerStyle}>
      <style>{responsiveStyle}</style>

      <div style={headerStyle}>
        <h1 style={titleStyle}>Performance Analytics</h1>
        <p style={subtitleStyle}>
          Comprehensive insights into team productivity and task completion
        </p>
      </div>

      <div style={cardStyle}>
        <label htmlFor="board-select" style={labelStyle}>
          Select Board
        </label>
        <select
          id="board-select"
          value={selectedBoardId || ""}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          style={selectStyle}
          onFocus={(e) => (e.target.style.borderColor = '#007bff')}
          onBlur={(e) => (e.target.style.borderColor = '#3a3f47')}
        >
          <option value="">-- Select a board --</option>
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </div>

      {selectedBoardId && (
        <>
          <div className="button-container" style={buttonContainerStyle}>
            <button
              style={excelButtonStyle}
              onClick={handleExportToExcel}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#218838')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#28a745')}
            >
              📊 Export to Excel
            </button>
            <button
              style={pdfButtonStyle}
              onClick={handleExportToPDF}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#c82333')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc3545')}
            >
              📄 Export to PDF
            </button>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Overview Statistics</h3>
            <div className="stats-grid" style={statsGridStyle}>
              <div style={statItemStyle}>
                <div style={statNumberStyle}>{totalClosedCards}</div>
                <div style={statLabelStyle}>Total Closed Cards</div>
              </div>
              <div style={statItemStyle}>
                <div style={statNumberStyle}>{activeUsers}</div>
                <div style={statLabelStyle}>Active Users</div>
              </div>
              <div style={statItemStyle}>
                <div style={statNumberStyle}>
                  {activeUsers > 0
                    ? (totalClosedCards / activeUsers).toFixed(1)
                    : 0}
                </div>
                <div style={statLabelStyle}>Average per User</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>User Performance Summary</h3>
            {Object.keys(countsByUserId).length === 0 ? (
              <div style={emptyStateStyle}>
                <p>No cards have been moved to closed lists yet.</p>
                <p>Start completing tasks to see performance metrics here.</p>
              </div>
            ) : (
              <div>
                {Object.entries(countsByUserId)
                  .sort(([, a], [, b]) => b - a)
                  .map(([userId, count]) => {
                    const user = allUsers.find((u) => u.id === userId);
                    const percentage =
                      totalClosedCards > 0
                        ? Math.round((count / totalClosedCards) * 100)
                        : 0;

                    return (
                      <div
                        key={userId}
                        className="user-item"
                        style={userItemStyle}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={userNameStyle}>
                            {user?.name || `User ${userId}`}
                          </div>
                          <div style={userStatsStyle}>
                            {count} cards closed ({percentage}%)
                          </div>
                          <div style={progressBarStyle}>
                            <div
                              style={progressFillStyle(percentage)}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}>Label Distribution by User</h3>
            {Object.keys(userLabelData).length === 0 ? (
              <div style={emptyStateStyle}>
                <p>No labels found for closed cards yet.</p>
                <p>Add labels to your cards to see distribution analytics here.</p>
              </div>
            ) : (
              <div className="user-cards-grid" style={userCardsGridStyle}>
                {Object.entries(userLabelData)
                  .sort(([, a], [, b]) => {
                    const totalA = a.labels.reduce(
                      (sum, label) => sum + label.count,
                      0
                    );
                    const totalB = b.labels.reduce(
                      (sum, label) => sum + label.count,
                      0
                    );
                    return totalB - totalA;
                  })
                  .map(([userId, userData]) => {
                    const totalLabels = userData.labels.reduce(
                      (sum, label) => sum + label.count,
                      0
                    );
                    const userInitials = userData.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <div
                        key={userId}
                        style={userCardStyle}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow =
                            '0 4px 12px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow =
                            '0 2px 8px rgba(0, 0, 0, 0.2)';
                        }}
                      >
                        <div style={userCardHeaderStyle}>
                          <div style={userAvatarStyle}>
                            {userInitials}
                          </div>
                          <div>
                            <h4 style={userCardNameStyle}>
                              {userData.name}
                            </h4>
                            <div style={{
                              fontSize: '12px',
                              color: '#b0b3b8',
                              fontWeight: '500'
                            }}>
                              {totalLabels} total labels
                            </div>
                          </div>
                        </div>
                        <div style={labelsContainerStyle}>
                          {userData.labels
                            .sort((a, b) => b.count - a.count)
                            .map((label, idx) => (
                              <div
                                key={idx}
                                style={labelTagStyle}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    '#3a3f47';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    '#1c1f23';
                                }}
                              >
                                <span style={labelNameStyle}>
                                  {label.name}
                                </span>
                                <span style={labelCountBadgeStyle}>
                                  {label.count}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
