// 화이트보드 기본 배경 프리셋 정의
// SVG 패턴을 CSS backgroundImage로 인코딩

export const WHITEBOARD_PRESETS = [
    { id: 'blank',      label: '빈 배경',     emoji: '⬜' },
    { id: 'lined',      label: '줄노트',       emoji: '📝' },
    { id: 'lined-wide', label: '넓은 줄노트',  emoji: '📄' },
    { id: 'grid',       label: '모눈종이 (소)', emoji: '⊞' },
    { id: 'grid-large', label: '모눈종이 (대)', emoji: '⧠' },
    { id: 'dotted',     label: '점 격자',      emoji: '∷' },
    { id: 'cornell',    label: '코넬노트',     emoji: '📋' },
    { id: 'music',      label: '오선지',       emoji: '🎵' },
    { id: 'isometric',  label: '등각 격자',    emoji: '◈' },
    { id: 'custom',     label: '이미지 업로드', emoji: '🖼️' },
];

const enc = (str) => encodeURIComponent(str);

const svgUrl = (svgStr) => `url("data:image/svg+xml,${enc(svgStr)}")`;

export const getPresetBackgroundStyle = (type) => {
    switch (type) {
        case 'blank':
            return { backgroundColor: '#ffffff' };

        case 'lined':
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="32"><line x1="0" y1="31.5" x2="1" y2="31.5" stroke="#93c5fd" stroke-width="0.7"/></svg>`),
                backgroundSize: '100% 32px',
            };

        case 'lined-wide':
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="48"><line x1="0" y1="47.5" x2="1" y2="47.5" stroke="#93c5fd" stroke-width="0.7"/></svg>`),
                backgroundSize: '100% 48px',
            };

        case 'grid':
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#93c5fd" stroke-width="0.5"/></svg>`),
                backgroundSize: '20px 20px',
            };

        case 'grid-large':
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">` +
                    `<path d="M 40 0 L 0 0 0 40" fill="none" stroke="#93c5fd" stroke-width="0.6"/>` +
                    `<path d="M 20 0 L 20 40" fill="none" stroke="#dbeafe" stroke-width="0.4"/>` +
                    `<path d="M 0 20 L 40 20" fill="none" stroke="#dbeafe" stroke-width="0.4"/>` +
                    `</svg>`
                ),
                backgroundSize: '40px 40px',
            };

        case 'dotted':
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="0.5" cy="0.5" r="1.2" fill="#94a3b8"/></svg>`),
                backgroundSize: '20px 20px',
            };

        case 'cornell':
            // 코넬 노트: 왼쪽 28%에 빨간 세로선, 아래 20%에 가로선
            return {
                backgroundColor: '#fffef0',
                backgroundImage: [
                    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="36"><line x1="0" y1="35.5" x2="1" y2="35.5" stroke="#bfdbfe" stroke-width="0.6"/></svg>`),
                    svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="1"><line x1="28%" y1="0" x2="28%" y2="1" stroke="#fca5a5" stroke-width="2"/></svg>`),
                ].join(', '),
                backgroundSize: '100% 36px, 2px 80%',
                backgroundPosition: '0 0, 28% 0',
                backgroundRepeat: 'repeat-y, no-repeat',
            };

        case 'music':
            // 오선지: 5줄씩 묶음 (한 세트 = 60px)
            return {
                backgroundColor: '#fffef7',
                backgroundImage: svgUrl(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="60">` +
                    [8, 16, 24, 32, 40].map(y =>
                        `<line x1="0" y1="${y}.5" x2="1" y2="${y}.5" stroke="#475569" stroke-width="0.6"/>`
                    ).join('') +
                    `</svg>`
                ),
                backgroundSize: '100% 60px',
            };

        case 'isometric': {
            // 등각 격자 (60도 각도)
            const s = 20;
            const h = Math.round(s * Math.sqrt(3));
            return {
                backgroundColor: '#ffffff',
                backgroundImage: svgUrl(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="${s * 2}" height="${h}">` +
                    `<line x1="0" y1="0" x2="${s * 2}" y2="0" stroke="#bfdbfe" stroke-width="0.5"/>` +
                    `<line x1="0" y1="${h}" x2="${s * 2}" y2="${h}" stroke="#bfdbfe" stroke-width="0.5"/>` +
                    `<line x1="${s / 2}" y1="0" x2="${s * 2}" y2="${h}" stroke="#bfdbfe" stroke-width="0.5"/>` +
                    `<line x1="0" y1="0" x2="${s * 3 / 2}" y2="${h}" stroke="#bfdbfe" stroke-width="0.5"/>` +
                    `<line x1="${s * 3 / 2}" y1="0" x2="${s / 2}" y2="${h}" stroke="#bfdbfe" stroke-width="0.5"/>` +
                    `</svg>`
                ),
                backgroundSize: `${s * 2}px ${h}px`,
            };
        }

        default:
            return { backgroundColor: '#ffffff' };
    }
};

// 미리보기 섬네일 배경 스타일 (작은 크기 버전)
export const getPresetThumbStyle = (id) => {
    const full = getPresetBackgroundStyle(id);
    if (!full.backgroundSize) return full;
    // 섬네일은 backgroundSize를 그대로 쓰면 너무 크니까 scale down
    return full;
};
