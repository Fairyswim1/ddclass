export const TABLE_HEADER_ROW_WEIGHT = 1;
export const TABLE_BODY_ROW_WEIGHT = 9;
export const TABLE_HEADER_COL_WEIGHT = 1;
export const TABLE_BODY_COL_WEIGHT = 5;

export function buildDefaultRowWeights(rows) {
    const count = Math.max(1, rows);
    return Array.from({ length: count }, (_, index) => (
        index === 0 ? TABLE_HEADER_ROW_WEIGHT : TABLE_BODY_ROW_WEIGHT
    ));
}

export function buildDefaultColWeights(cols) {
    const count = Math.max(1, cols);
    return Array.from({ length: count }, (_, index) => (
        index === 0 ? TABLE_HEADER_COL_WEIGHT : TABLE_BODY_COL_WEIGHT
    ));
}

export const DEFAULT_TABLE_CONFIG = {
    rows: 2,
    cols: 4,
    headerRow: true,
    headerCol: true,
    rowWeights: buildDefaultRowWeights(2),
    colWeights: buildDefaultColWeights(4),
    colLabels: ['', '', '', ''],
    rowLabels: ['', ''],
    labelFontSize: 14,
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

    const rowWeights = config?.rowWeights?.length === safeRows
        ? normalizeWeights(config.rowWeights, safeRows)
        : buildDefaultRowWeights(safeRows);

    const colWeights = config?.colWeights?.length === safeCols
        ? normalizeWeights(config.colWeights, safeCols)
        : buildDefaultColWeights(safeCols);

    return {
        rows: safeRows,
        cols: safeCols,
        headerRow: config?.headerRow !== false,
        headerCol: config?.headerCol !== false,
        rowWeights,
        colWeights,
        colLabels: normalizeLabels(config?.colLabels, safeCols),
        rowLabels: normalizeLabels(config?.rowLabels, safeRows),
        labelFontSize: normalizeLabelFontSize(config?.labelFontSize),
    };
}

function normalizeLabelFontSize(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_TABLE_CONFIG.labelFontSize;
    return Math.min(32, Math.max(10, parsed));
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
    const rowWeights = buildDefaultRowWeights(rows);
    const colWeights = buildDefaultColWeights(cols);
    const totalRow = rowWeights.reduce((sum, w) => sum + w, 0);
    const totalCol = colWeights.reduce((sum, w) => sum + w, 0);

    const rowBounds = [0];
    rowWeights.forEach((w) => rowBounds.push(rowBounds[rowBounds.length - 1] + (w / totalRow) * 100));
    const colBounds = [0];
    colWeights.forEach((w) => colBounds.push(colBounds[colBounds.length - 1] + (w / totalCol) * 100));

    const lines = [];

    for (let c = 1; c < cols; c += 1) {
        const pos = colBounds[c];
        lines.push(`linear-gradient(to right, transparent ${pos - 0.4}%, #8B5A4A ${pos - 0.4}%, #8B5A4A ${pos + 0.4}%, transparent ${pos + 0.4}%)`);
    }
    for (let r = 1; r < rows; r += 1) {
        const pos = rowBounds[r];
        lines.push(`linear-gradient(to bottom, transparent ${pos - 0.4}%, #8B5A4A ${pos - 0.4}%, #8B5A4A ${pos + 0.4}%, transparent ${pos + 0.4}%)`);
    }

    return {
        backgroundColor: '#ffffff',
        backgroundImage: lines.join(', '),
        border: '1.5px solid #8B5A4A',
    };
}
