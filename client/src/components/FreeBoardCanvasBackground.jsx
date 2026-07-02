import React from 'react';
import { resolveApiUrl } from '../utils/url';
import { getPresetBackgroundStyle } from '../utils/whiteboardPresets';
import TableBackground from './TableBackground';
import { normalizeTableConfig } from '../utils/tableBackground';

/**
 * 자유 보드 캔버스 배경 (이미지 / 프리셋 / 분류 표)
 */
const FreeBoardCanvasBackground = ({
    backgroundUrl,
    backgroundType = 'blank',
    tableConfig,
    bgScale = 1,
    aspectRatio = 16 / 9,
    minHeight = 300,
    className = '',
    style = {},
}) => {
    if (backgroundUrl) {
        return (
            <img
                src={resolveApiUrl(backgroundUrl)}
                alt="background"
                className={className}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    transform: `scale(${bgScale})`,
                    transformOrigin: 'center',
                    ...style,
                }}
            />
        );
    }

    if (backgroundType === 'table') {
        return (
            <div
                className={className}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight,
                    aspectRatio: `${aspectRatio}`,
                    background: '#ffffff',
                    ...style,
                }}
            >
                <TableBackground config={normalizeTableConfig(tableConfig)} />
            </div>
        );
    }

    return (
        <div
            className={className}
            style={{
                width: '100%',
                height: '100%',
                minHeight,
                aspectRatio: `${aspectRatio}`,
                ...getPresetBackgroundStyle(backgroundType),
                ...style,
            }}
        />
    );
};

export default FreeBoardCanvasBackground;
