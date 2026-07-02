import React, { useMemo } from 'react';
import { normalizeTableConfig } from '../utils/tableBackground';
import './TableBackground.css';

const TableBackground = ({ config, className = '' }) => {
    const { rows, cols, headerRow, headerCol } = useMemo(
        () => normalizeTableConfig(config),
        [config]
    );

    const cells = [];
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const isHeaderCol = headerCol && col === 0;
            const isHeaderRow = headerRow && row === 0;
            const classNames = ['table-bg-cell'];
            if (isHeaderCol && isHeaderRow) classNames.push('is-header-corner');
            else if (isHeaderCol) classNames.push('is-header-col');
            else if (isHeaderRow) classNames.push('is-header-row');

            cells.push(
                <div
                    key={`${row}-${col}`}
                    className={classNames.join(' ')}
                />
            );
        }
    }

    return (
        <div
            className={`table-background ${className}`.trim()}
            style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
            aria-hidden="true"
        >
            {cells}
        </div>
    );
};

export default TableBackground;
