export const DEFAULT_TABLE_CONFIG = {
    rows: 2,
    cols: 4,
    headerRow: true,
    headerCol: true,
};

export function normalizeTableConfig(config) {
    const rows = parseInt(config?.rows, 10);
    const cols = parseInt(config?.cols, 10);

    return {
        rows: Number.isFinite(rows) && rows >= 1 ? rows : DEFAULT_TABLE_CONFIG.rows,
        cols: Number.isFinite(cols) && cols >= 1 ? cols : DEFAULT_TABLE_CONFIG.cols,
        headerRow: config?.headerRow !== false,
        headerCol: config?.headerCol !== false,
    };
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
