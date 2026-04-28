import React, { useState } from 'react';
import './LatexKeyboard.css';

const LATEX_GROUPS = [
    {
        label: '기본 연산',
        symbols: [
            { label: 'x²', insert: '^{2}' },
            { label: 'xⁿ', insert: '^{}', cursor: 1 },
            { label: '√x', insert: '\\sqrt{}', cursor: 6 },
            { label: 'ⁿ√x', insert: '\\sqrt[n]{}', cursor: 9 },
            { label: 'x/y', insert: '\\frac{}{}', cursor: 6 },
            { label: '±', insert: '\\pm' },
            { label: '÷', insert: '\\div' },
            { label: '×', insert: '\\times' },
            { label: '≠', insert: '\\neq' },
            { label: '≤', insert: '\\leq' },
            { label: '≥', insert: '\\geq' },
            { label: '≈', insert: '\\approx' },
        ]
    },
    {
        label: '그리스 문자',
        symbols: [
            { label: 'α', insert: '\\alpha' },
            { label: 'β', insert: '\\beta' },
            { label: 'γ', insert: '\\gamma' },
            { label: 'δ', insert: '\\delta' },
            { label: 'θ', insert: '\\theta' },
            { label: 'λ', insert: '\\lambda' },
            { label: 'μ', insert: '\\mu' },
            { label: 'π', insert: '\\pi' },
            { label: 'σ', insert: '\\sigma' },
            { label: 'φ', insert: '\\phi' },
            { label: 'ω', insert: '\\omega' },
            { label: 'Σ', insert: '\\Sigma' },
        ]
    },
    {
        label: '집합 / 논리',
        symbols: [
            { label: '∈', insert: '\\in' },
            { label: '∉', insert: '\\notin' },
            { label: '⊂', insert: '\\subset' },
            { label: '⊃', insert: '\\supset' },
            { label: '∪', insert: '\\cup' },
            { label: '∩', insert: '\\cap' },
            { label: '∞', insert: '\\infty' },
            { label: '∀', insert: '\\forall' },
            { label: '∃', insert: '\\exists' },
            { label: '→', insert: '\\rightarrow' },
            { label: '↔', insert: '\\leftrightarrow' },
            { label: '⊥', insert: '\\perp' },
        ]
    },
    {
        label: '적분 / 미분',
        symbols: [
            { label: '∫', insert: '\\int_{}^{}', cursor: 5 },
            { label: '∑', insert: '\\sum_{}^{}', cursor: 5 },
            { label: '∏', insert: '\\prod_{}^{}', cursor: 6 },
            { label: 'lim', insert: '\\lim_{}', cursor: 5 },
            { label: "f'", insert: "f'(x)" },
            { label: 'd/dx', insert: '\\frac{d}{dx}' },
            { label: '∂', insert: '\\partial' },
        ]
    },
];

const LatexKeyboard = ({ onInsert }) => {
    const [activeGroup, setActiveGroup] = useState(0);

    return (
        <div className="latex-keyboard">
            <div className="latex-kb-tabs">
                {LATEX_GROUPS.map((g, i) => (
                    <button
                        key={i}
                        className={`latex-kb-tab ${activeGroup === i ? 'active' : ''}`}
                        onClick={() => setActiveGroup(i)}
                        type="button"
                    >
                        {g.label}
                    </button>
                ))}
            </div>
            <div className="latex-kb-symbols">
                {LATEX_GROUPS[activeGroup].symbols.map((sym, i) => (
                    <button
                        key={i}
                        className="latex-kb-sym"
                        onClick={() => onInsert(sym.insert)}
                        title={sym.insert}
                        type="button"
                    >
                        {sym.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LatexKeyboard;
