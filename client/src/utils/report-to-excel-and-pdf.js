import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoPath from '../assets/images/logo.png';

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

async function getLogoBase64() {
  const response = await fetch(logoPath);
  const blob = await response.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export function exportToExcel({
  closedCardsLabelsReport,
  allUsers,
}) {
  if (!closedCardsLabelsReport?.items?.length) {
    alert('No data available for export.');
    return;
  }

  const summaryRows = [];
  const userSummaryMap = {};

  closedCardsLabelsReport.items.forEach(item => {
    const userId = item.userId;
    const user = allUsers.find(u => u.id === userId);
    const userName = user?.name || `User ${userId}`;

    if (!userSummaryMap[userId]) {
      userSummaryMap[userId] = {
        userName,
        cards: new Map(),
        labelCounts: {},
      };
    }

    const cardKey = item.cardId;

    if (!userSummaryMap[userId].cards.has(cardKey)) {
      userSummaryMap[userId].cards.set(cardKey, {
        cardId: item.cardId,
        cardName: item.cardName || '-',
        createdAt: item.createdAt || '',
        closedAt: item.closedAt || '',
        labels: [],
      });
    }

    if (item.labelName) {
      userSummaryMap[userId].cards.get(cardKey).labels.push({
        name: item.labelName,
        count: item.count || 0,
      });

      if (!userSummaryMap[userId].labelCounts[item.labelName]) {
        userSummaryMap[userId].labelCounts[item.labelName] = 0;
      }
      userSummaryMap[userId].labelCounts[item.labelName] += item.count || 0;
    }
  });

  for (const userSummary of Object.values(userSummaryMap)) {
    let createdDates = [];
    let closedDates = [];

    for (const card of userSummary.cards.values()) {
      if (card.createdAt) createdDates.push(new Date(card.createdAt));
      if (card.closedAt) closedDates.push(new Date(card.closedAt));
    }

    const earliestCreatedAt = createdDates.length > 0
      ? new Date(Math.min(...createdDates)).toLocaleString()
      : '-';

    const latestClosedAt = closedDates.length > 0
      ? new Date(Math.max(...closedDates)).toLocaleString()
      : '-';

    summaryRows.push({
      User: userSummary.userName,
      Total_Closed_Cards: userSummary.cards.size,
      Earliest_Created_At: earliestCreatedAt,
      Latest_Closed_At: latestClosedAt,
      Label_Breakdown: Object.entries(userSummary.labelCounts)
        .map(([label, count]) => `${label}: ${count}`)
        .join('; '),
    });
  }

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

  const allCardsRows = [];

  for (const userSummary of Object.values(userSummaryMap)) {
    for (const [cardId, card] of userSummary.cards.entries()) {
      if (card.labels.length > 0) {
        for (const label of card.labels) {
          allCardsRows.push({
            User: userSummary.userName,
            Card_ID: cardId,
            Card_Name: card.cardName,
            Created_At: formatDate(card.createdAt),
            Closed_At: formatDate(card.closedAt),
            Label: label.name,
            Label_Count: label.count,
          });
        }
      } else {
        allCardsRows.push({
          User: userSummary.userName,
          Card_ID: cardId,
          Card_Name: card.cardName,
          Created_At: formatDate(card.createdAt),
          Closed_At: formatDate(card.closedAt),
          Label: 'No Label',
          Label_Count: 0,
        });
      }
    }
  }

  const allCardsSheet = XLSX.utils.json_to_sheet(allCardsRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, allCardsSheet, 'All Cards');

  const now = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Performance_Report_${now}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

export async function exportToPdf({
  closedCardsLabelsReport,
  allUsers,
}) {
  if (!closedCardsLabelsReport?.items?.length) {
    alert('No data available for export.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4',
  });

  const logoBase64 = await getLogoBase64();

  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Panamic ICT', 105, 50, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(70, 70, 70);
  doc.text('Performance Report', 105, 65, { align: 'center' });

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 75, 80, 60, 30);
  }

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Confidential - For Internal Use Only', 105, 120, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`© ${new Date().getFullYear()} Panamic ICT. All rights reserved.`, 105, 130, {
    align: 'center',
  });

  doc.setDrawColor(200, 200, 200);
  doc.line(20, 140, 190, 140);

  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Summary', 14, 20);

  const userSummaryMap = {};

  closedCardsLabelsReport.items.forEach(item => {
    const userId = item.userId;
    const user = allUsers.find(u => u.id === userId);
    const userName = user?.name || `User ${userId}`;

    if (!userSummaryMap[userId]) {
      userSummaryMap[userId] = {
        userName,
        cards: new Map(),
        labelCounts: {},
      };
    }

    const cardKey = item.cardId;

    if (!userSummaryMap[userId].cards.has(cardKey)) {
      userSummaryMap[userId].cards.set(cardKey, {
        cardId: item.cardId,
        cardName: item.cardName || '-',
        createdAt: formatDate(item.createdAt),
        closedAt: formatDate(item.closedAt),
        labels: [],
      });
    }

    if (item.labelName) {
      userSummaryMap[userId].cards.get(cardKey).labels.push({
        name: item.labelName,
        color: item.color || '-',
      });

      if (!userSummaryMap[userId].labelCounts[item.labelName]) {
        userSummaryMap[userId].labelCounts[item.labelName] = 0;
      }
      userSummaryMap[userId].labelCounts[item.labelName] += item.count || 0;
    }
  });

  let y = 30;

  for (const userSummary of Object.values(userSummaryMap)) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text(`${userSummary.userName}: ${userSummary.cards.size} cards closed`, 14, y);
    y += 6;

    const cardTableData = Array.from(userSummary.cards.values()).flatMap(card => {
      if (card.labels.length > 0) {
        return card.labels.map(label => [
          card.cardId,
          card.cardName,
          card.createdAt,
          card.closedAt,
          label.name,
        ]);
      } else {
        return [[
          card.cardId,
          card.cardName,
          card.createdAt,
          card.closedAt,
          'No Label',
        ]];
      }
    });

    if (cardTableData.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Card ID', 'Card Name', 'Created At', 'Closed At', 'Label']],
        body: cardTableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: 'left',
        },
        headStyles: {
          fillColor: [0, 102, 204],
          textColor: 255,
          fontStyle: 'bold',
        },
      });
      y = doc.lastAutoTable.finalY + 5;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No cards closed.', 18, y);
      y += 5;
    }

    const labelEntries = Object.entries(userSummary.labelCounts);
    if (labelEntries.length > 0) {
      const labelTableData = labelEntries.map(([label, count]) => [label, count.toString()]);

      autoTable(doc, {
        startY: y,
        head: [['Label', 'Count']],
        body: labelTableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 2,
          halign: 'left',
        },
        headStyles: {
          fillColor: [50, 50, 50],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No labels.', 18, y);
      y += 5;
    }

    y += 10;
  }

  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Details', 14, 20);

  const tableBody = closedCardsLabelsReport.items.map(item => {
    const user = allUsers.find(u => u.id === item.userId);
    const userName = user?.name || `User ${item.userId}`;
    return [
      userName,
      item.cardId,
      item.cardName || '-',
      formatDate(item.createdAt),
      formatDate(item.closedAt),
      item.labelName || 'No Label',
      item.count?.toString() || '0',
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['User', 'Card ID', 'Card Name', 'Created At', 'Closed At', 'Label', 'Label Count']],
    body: tableBody,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'left',
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [230, 240, 255],
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 20,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }

  const now = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `Performance_Report_${now}.pdf`;

  doc.save(filename);
}
