const IMPORTABLE_TYPES = ['fill-blanks', 'order-matching', 'free-drop'];

function deepClone(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}

export function isImportableProblemType(type) {
    return IMPORTABLE_TYPES.includes(type);
}

/** Firestore 보관함 문제 → 수업꾸러미 슬라이드 객체 */
export function problemToSlide(problem) {
    if (!problem?.type || !isImportableProblemType(problem.type)) {
        throw new Error(`가져올 수 없는 문제 유형입니다: ${problem?.type}`);
    }

    const base = {
        id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: problem.type,
        title: problem.title || '',
    };

    switch (problem.type) {
        case 'fill-blanks':
            return {
                ...base,
                originalText: problem.originalText || '',
                blanks: deepClone(problem.blanks) || [],
                allowDuplicates: problem.allowDuplicates ?? false,
            };
        case 'order-matching':
            return {
                ...base,
                steps: deepClone(problem.steps) || [],
            };
        case 'free-drop':
            return {
                ...base,
                backgroundUrl: problem.backgroundUrl ?? null,
                backgroundType: problem.backgroundType ?? null,
                tableConfig: problem.tableConfig ? deepClone(problem.tableConfig) : null,
                items: (problem.items || []).map((item) => ({
                    ...deepClone(item),
                    isPlaced: false,
                    x: 0,
                    y: 0,
                })),
                aspectRatio: problem.aspectRatio ?? 16 / 9,
                baseWidth: problem.baseWidth ?? 1000,
                allowReuse: problem.allowReuse ?? false,
                bgScale: problem.bgScale ?? 1,
                question: problem.question || '',
            };
        default:
            return base;
    }
}
