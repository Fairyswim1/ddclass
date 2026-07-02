import React, { useMemo } from 'react';
import { getTableCellLabel, normalizeTableConfig } from '../utils/tableBackground';
import './TableBackground.css';

const TableBackground = ({ config, className = '' }) => {
    const normalized = useMemo(() => normalizeTableConfig(config), [config]);
    const { rows, cols, headerRow, headerCol, rowWeights, colWeights } = normalized;

    const cells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const isHeaderCol = headerCol && col === 0;
            const isHeaderRow = headerRow && row === 0;
            const classNames = ['table-bg-cell'];
            if (isHeaderCol && isHeaderRow) classNames.push('is-header-corner');
            else if (isHeaderCol) classNames.push('is-header-col');
            else if (isHeaderRow) classNames.push('is-header-row');

            const label = getTableCellLabel(row, col, normalized);

            cells.push(
                <div key={`${row}-${col}`} className={classNames.join(' ')}>
                    {label ? (
                        <span className="table-bg-cell-label">{label}</span>
                    ) : null}
                </div>
            );
        }
    }

    return (
        <div
            className={`table-background ${className}`.trim()}
            style={{
                gridTemplateColumns: colWeights.map((w) => `${w}fr`).join(' '),
                gridTemplateRows: rowWeights.map((w) => `${w}fr`).join(' '),
            }}
            aria-hidden="true"
        >
            {cells}
        </div>
    );
};

export default TableBackground;
