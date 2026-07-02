export const DEFAULT_TABLE_CONFIG = {
    rows: 2,
    cols: 4,
    headerRow: true,
    headerCol: true,
    rowWeights: [1, 1],
    colWeights: [1, 1, 1, 1],
    colLabels: ['', '', '', ''],
    rowLabels: ['', ''],
};

function ensureLength(arr, length, fill) {
    const result = Array.isArray(arr) ? [...arr] : [];
    while (result.length < length) result.push(fill);
    return result.slice(0, length);
}

function normalizeWeights(arr, length) {
    return ensureLength(arr, length, 1).map((w) => {
        const parsed = parseInt(w, 10);
        return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    });
}

function normalizeLabels(arr, length) {
    return ensureLength(arr, length, '').map((label) => (label == null ? '' : String(label)));
}

export function normalizeTableConfig(config) {
    const rows = parseInt(config?.rows, 10);
    const cols = parseInt(config?.cols, 10);

    const safeRows = Number.isFinite(rows) && rows >= 1 ? rows : DEFAULT_TABLE_CONFIG.rows;
    const safeCols = Number.isFinite(cols) && cols >= 1 ? cols : DEFAULT_TABLE_CONFIG.cols;

    return {
        rows: safeRows,
        cols: safeCols,
        headerRow: config?.headerRow !== false,
        headerCol: config?.headerCol !== false,
        rowWeights: normalizeWeights(config?.rowWeights, safeRows),
        colWeights: normalizeWeights(config?.colWeights, safeCols),
        colLabels: normalizeLabels(config?.colLabels, safeCols),
        rowLabels: normalizeLabels(config?.rowLabels, safeRows),
    };
}

export function getTableCellLabel(row, col, config) {
    const { headerRow, headerCol, colLabels, rowLabels } = normalizeTableConfig(config);
    const isHeaderCol = headerCol && col === 0;
    const isHeaderRow = headerRow && row === 0;

    if (isHeaderRow && isHeaderCol) {
        return colLabels[0] || '';
    }
    if (isHeaderRow) {
        return colLabels[col] || '';
    }
    if (isHeaderCol) {
        return rowLabels[row] || '';
    }
    return '';
}

/** 분류 표 프리셋 썸네일용 */
export function getTableThumbStyle(rows = 2, cols = 3) {
    const cellW = 100 / cols;
    const cellH = 100 / rows;
    const lines = [];

    for (let c = 1; c < cols; c += 1) {
        lines.push(`linear-gradient(to right, transparent ${c * cellW - 0.4}%, #8B5A4A ${c * cellW - 0.4}%, #8B5A4A ${c * cellW + 0.4}%, transparent ${c * cellW + 0.4}%)`);
    }
    for (let r = 1; r < rows; r += 1) {
        lines.push(`linear-gradient(to bottom, transparent ${r * cellH - 0.4}%, #8B5A4A ${r * cellH - 0.4}%, #8B5A4A ${r * cellH + 0.4}%, transparent ${r * cellH + 0.4}%)`);
    }

    return {
        backgroundColor: '#ffffff',
        backgroundImage: lines.join(', '),
        border: '1.5px solid #8B5A4A',
    };
}
