import React from 'react';
import { normalizeTableConfig } from '../utils/tableBackground';
import './TableBackground.css';

const TableBackgroundConfig = ({ config, onChange }) => {
    const normalized = normalizeTableConfig(config);

    const update = (patch) => onChange(normalizeTableConfig({ ...normalized, ...patch }));

    const handleCountChange = (field, rawValue) => {
        if (rawValue === '') {
            onChange({ ...normalized, [field]: '' });
            return;
        }
        const parsed = parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 1) return;
        update({ [field]: parsed });
    };

    return (
        <div className="table-bg-config">
            <p className="table-bg-config-title">📊 분류 표 설정</p>
            <div className="table-bg-config-grid">
                <div className="table-bg-config-field">
                    <label htmlFor="table-rows">행 개수</label>
                    <input
                        id="table-rows"
                        type="number"
                        min={1}
                        value={config?.rows ?? normalized.rows}
                        onChange={(e) => handleCountChange('rows', e.target.value)}
                    />
                </div>
                <div className="table-bg-config-field">
                    <label htmlFor="table-cols">열 개수</label>
                    <input
                        id="table-cols"
                        type="number"
                        min={1}
                        value={config?.cols ?? normalized.cols}
                        onChange={(e) => handleCountChange('cols', e.target.value)}
                    />
                </div>
            </div>
            <div className="table-bg-config-toggles">
                <label className="table-bg-config-toggle">
                    <input
                        type="checkbox"
                        checked={normalized.headerRow}
                        onChange={(e) => update({ headerRow: e.target.checked })}
                    />
                    첫 행 헤더
                </label>
                <label className="table-bg-config-toggle">
                    <input
                        type="checkbox"
                        checked={normalized.headerCol}
                        onChange={(e) => update({ headerCol: e.target.checked })}
                    />
                    첫 열 헤더
                </label>
            </div>
            <p className="table-bg-config-hint">
                헤더 칸은 분류 기준을 적고, 나머지 칸에 카드를 배치하면 됩니다.
            </p>
        </div>
    );
};

export default TableBackgroundConfig;
