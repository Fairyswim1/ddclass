import { splitIntoLatexSegments, LATEX_SEGMENT_REGEX } from './latexTextSegments';

export function isLatexSegmentText(text) {
    if (!text?.trim()) return false;
    const match = text.match(new RegExp(`^${LATEX_SEGMENT_REGEX.source}$`));
    return Boolean(match);
}

function findLatexSegmentFromTarget(textRoot, target) {
    let current = target;
    while (current && current !== textRoot) {
        if (current.dataset?.isLatex === 'true' && current.dataset?.offset !== undefined) {
            const startOffset = parseInt(current.dataset.offset, 10);
            const length = parseInt(current.dataset.length, 10);
            return {
                startOffset,
                endOffset: startOffset + length,
            };
        }
        current = current.parentNode;
    }
    return null;
}

function findOffsetSegment(root, node) {
    let current = node?.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (current && current !== root) {
        if (current.dataset?.offset !== undefined && current.dataset?.length !== undefined) {
            return {
                startOffset: parseInt(current.dataset.offset, 10),
                endOffset: parseInt(current.dataset.offset, 10) + parseInt(current.dataset.length, 10),
            };
        }
        current = current.parentNode;
    }
    return null;
}

function computeDomOffset(textRoot, container, offset) {
    let node = container;
    let relativeOffset = offset;

    while (node && node.parentNode !== textRoot && node !== textRoot) {
        let sibling = node.previousSibling;
        while (sibling) {
            if (sibling.dataset?.length) {
                relativeOffset += parseInt(sibling.dataset.length, 10);
            } else {
                relativeOffset += (sibling.textContent || '').length;
            }
            sibling = sibling.previousSibling;
        }
        node = node.parentNode;
    }

    if (node?.dataset?.offset !== undefined) {
        return parseInt(node.dataset.offset, 10) + relativeOffset;
    }

    if (node === textRoot) {
        let total = 0;
        for (let i = 0; i < offset; i += 1) {
            const child = textRoot.childNodes[i];
            if (child?.dataset?.length) {
                total += parseInt(child.dataset.length, 10);
            } else if (child?.dataset?.offset !== undefined && i + 1 < offset) {
                const nextNode = textRoot.childNodes[i + 1];
                if (nextNode?.dataset?.offset !== undefined) {
                    total = parseInt(nextNode.dataset.offset, 10);
                } else {
                    total += (child.textContent || '').length;
                }
            } else {
                total += (child?.textContent || '').length;
            }
        }
        return total;
    }

    return relativeOffset;
}

function expandRangeForLatex(startOffset, endOffset, sourceText) {
    let start = Math.min(startOffset, endOffset);
    let end = Math.max(startOffset, endOffset);

    splitIntoLatexSegments(sourceText).forEach((segment) => {
        if (!isLatexSegmentText(segment.text)) return;

        const segStart = segment.startOffset;
        const segEnd = segment.startOffset + segment.length;
        const overlaps = start < segEnd && end > segStart;
        if (!overlaps) return;

        start = Math.min(start, segStart);
        end = Math.max(end, segEnd);
    });

    return { startOffset: start, endOffset: end };
}

/**
 * 빈칸 선택 UI에서 드래그/클릭 선택을 원문 오프셋으로 변환합니다.
 * LaTeX 수식 클릭은 브라우저 selection 대신 data-offset을 우선 사용합니다.
 */
export function resolveBlankSelection(textRoot, sourceText, selection, eventTarget = null) {
    if (!textRoot || !sourceText) return null;

    const latexClick = eventTarget ? findLatexSegmentFromTarget(textRoot, eventTarget) : null;
    if (latexClick) {
        const selectedText = sourceText.slice(latexClick.startOffset, latexClick.endOffset).trim();
        if (!selectedText) return null;
        return {
            startOffset: latexClick.startOffset,
            endOffset: latexClick.endOffset,
            selectedText,
        };
    }

    if (!selection) return null;

    const range = selection.getRangeAt(0);
    if (!textRoot.contains(range.commonAncestorContainer)) return null;

    let startOffset;
    let endOffset;

    if (selection.isCollapsed) {
        const segment = findOffsetSegment(textRoot, range.startContainer);
        if (!segment) return null;

        const segmentText = sourceText.slice(segment.startOffset, segment.endOffset);
        if (!isLatexSegmentText(segmentText)) return null;

        startOffset = segment.startOffset;
        endOffset = segment.endOffset;
    } else {
        startOffset = computeDomOffset(textRoot, range.startContainer, range.startOffset);
        endOffset = computeDomOffset(textRoot, range.endContainer, range.endOffset);
        ({ startOffset, endOffset } = expandRangeForLatex(startOffset, endOffset, sourceText));
    }

    if (startOffset === endOffset) return null;

    const normalizedStart = Math.min(startOffset, endOffset);
    const normalizedEnd = Math.max(startOffset, endOffset);
    const selectedText = sourceText.slice(normalizedStart, normalizedEnd).trim();

    if (!selectedText) return null;

    return {
        startOffset: normalizedStart,
        endOffset: normalizedEnd,
        selectedText,
    };
}

export function hasBlankOverlap(blanks, startOffset, endOffset) {
    return blanks.some((blank) =>
        (startOffset >= blank.startOffset && startOffset < blank.endOffset)
        || (endOffset > blank.startOffset && endOffset <= blank.endOffset)
        || (startOffset <= blank.startOffset && endOffset >= blank.endOffset)
    );
}

/**
 * @returns {{ text: string, startOffset: number, length: number, isLatex: boolean }[]}
 */
export function buildSelectableSegments(text, baseOffset = 0) {
    if (!text) return [];

    return splitIntoLatexSegments(text).flatMap((segment) => {
        if (isLatexSegmentText(segment.text)) {
            return [{
                text: segment.text,
                startOffset: baseOffset + segment.startOffset,
                length: segment.length,
                isLatex: true,
            }];
        }

        const parts = segment.text.split(/(\n)/).filter((part) => part.length > 0);
        let localOffset = segment.startOffset;

        return parts.map((part) => {
            const item = {
                text: part,
                startOffset: baseOffset + localOffset,
                length: part.length,
                isLatex: false,
            };
            localOffset += part.length;
            return item;
        });
    });
}
