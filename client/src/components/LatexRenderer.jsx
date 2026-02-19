import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

/**
 * LatexRenderer
 * $, \[, \], \(, \) 기호를 기준으로 텍스트를 분리하여 일반 텍스트와 LaTeX 수식을 혼합 렌더링합니다.
 */
const LatexRenderer = ({ text }) => {
    if (!text) return null;

    // LaTeX 구분자들을 포함하는 정규표현식
    // 1. \[(?:[\s\S]*?)\] : 디스플레이 수식
    // 2. \((?:[\s\S]*?)\) : 인라인 수식
    // 3. \$(?:[\s\S]*?)\$ : 인라인 수식 ($)
    // 4. \\begin\{([\s\S]*?)\}([\s\S]*?)\\end\{\1\} : LaTeX 환경 블록
    const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|\\$.*?\\$|\$.*?\$|\\begin\{[\s\S]*?\}[\s\S]*?\\end\{[\s\S]*?\})/g;

    const parts = text.split(regex);

    return (
        <span className="latex-renderer">
            {parts.map((part, index) => {
                if (!part) return null;

                if (part.startsWith('\\[')) {
                    const content = part.slice(2, -2);
                    return <BlockMath key={index} math={content} />;
                }
                if (part.startsWith('\\(')) {
                    const content = part.slice(2, -2);
                    return <InlineMath key={index} math={content} />;
                }
                if (part.startsWith('$')) {
                    const content = part.slice(1, -1);
                    return <InlineMath key={index} math={content} />;
                }
                if (part.startsWith('\\$')) {
                    const content = part.slice(2, -2);
                    return <InlineMath key={index} math={content} />;
                }
                if (part.startsWith('\\begin')) {
                    return <BlockMath key={index} math={part} />;
                }

                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

export default LatexRenderer;
