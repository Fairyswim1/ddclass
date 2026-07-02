import React from 'react';
import { X } from 'lucide-react';
import { normalizeTableConfig } from '../utils/tableBackground';
import './TableBackground.css';

const TableBackgroundConfig = ({ config, onChange, onClose }) => {
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

    const handleWeightChange = (field, index, rawValue) => {
        const parsed = parseInt(rawValue, 10);
        if (!Number.isFinite(parsed) || parsed < 1) return;
        const weights = [...normalized[field]];
        weights[index] = parsed;
        update({ [field]: weights });
    };

    const handleLabelChange = (field, index, value) => {
        const labels = [...normalized[field]];
        labels[index] = value;
        update({ [field]: labels });
    };

    const rowLabelStart = normalized.headerRow && normalized.headerCol ? 1 : 0;

    return (
        <div className="table-bg-config">
            <div className="table-bg-config-header">
                <p className="table-bg-config-title">📊 분류 표 설정</p>
                {onClose && (
                    <button
                        type="button"
                        className="table-bg-config-close"
                        onClick={onClose}
                        title="설정 닫기"
                        aria-label="설정 닫기"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

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

            <div className="table-bg-config-section">
                <p className="table-bg-config-section-title">행 높이 비율</p>
                <div className="table-bg-config-size-list">
                    {normalized.rowWeights.map((weight, index) => (
                        <div key={`row-weight-${index}`} className="table-bg-config-size-row">
                            <span className="table-bg-config-size-label">행 {index + 1}</span>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={weight}
                                onChange={(e) => handleWeightChange('rowWeights', index, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="table-bg-config-section">
                <p className="table-bg-config-section-title">열 너비 비율</p>
                <div className="table-bg-config-size-list">
                    {normalized.colWeights.map((weight, index) => (
                        <div key={`col-weight-${index}`} className="table-bg-config-size-row">
                            <span className="table-bg-config-size-label">열 {index + 1}</span>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={weight}
                                onChange={(e) => handleWeightChange('colWeights', index, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {normalized.headerRow && (
                <div className="table-bg-config-section">
                    <p className="table-bg-config-section-title">열 분류 기준 (첫 행)</p>
                    <div className="table-bg-config-label-list">
                        {normalized.colLabels.map((label, index) => (
                            <div key={`col-label-${index}`} className="table-bg-config-label-row">
                                <span className="table-bg-config-size-label">
                                    {normalized.headerCol && index === 0 ? '왼쪽 위' : `열 ${index + 1}`}
                                </span>
                                <input
                                    type="text"
                                    value={label}
                                    placeholder={normalized.headerCol && index === 0 ? '예: 동물' : '예: 포유류'}
                                    onChange={(e) => handleLabelChange('colLabels', index, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {normalized.headerCol && (
                <div className="table-bg-config-section">
                    <p className="table-bg-config-section-title">행 분류 기준 (첫 열)</p>
                    <div className="table-bg-config-label-list">
                        {normalized.rowLabels.map((label, index) => {
                            if (index < rowLabelStart) return null;
                            return (
                                <div key={`row-label-${index}`} className="table-bg-config-label-row">
                                    <span className="table-bg-config-size-label">행 {index + 1}</span>
                                    <input
                                        type="text"
                                        value={label}
                                        placeholder="예: 육식"
                                        onChange={(e) => handleLabelChange('rowLabels', index, e.target.value)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <p className="table-bg-config-hint">
                비율 숫자가 클수록 해당 행·열이 더 넓어집니다. 헤더 칸에 분류 기준을 적고, 나머지 칸에 카드를 배치하세요.
            </p>
        </div>
    );
};

export default TableBackgroundConfig;
