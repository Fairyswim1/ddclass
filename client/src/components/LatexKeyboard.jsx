import React, { useState } from 'react';
import './LatexKeyboard.css';

const LATEX_GROUPS = [
    {
        label: '기본 연산',
        symbols: [
            { label: 'xⁿ', insert: '^{}' },
            { label: 'x²', insert: '^{2}' },
            { label: 'x³', insert: '^{3}' },
            { label: 'xₙ', insert: '_{n}' },
            { label: '√x', insert: '\\sqrt{}' },
            { label: 'ⁿ√x', insert: '\\sqrt[n]{}' },
            { label: 'x/y', insert: '\\frac{}{}' },
            { label: '±', insert: '\\pm' },
            { label: '∓', insert: '\\mp' },
            { label: '×', insert: '\\times' },
            { label: '÷', insert: '\\div' },
            { label: '·', insert: '\\cdot' },
            { label: '=', insert: '=' },
            { label: '≠', insert: '\\neq' },
            { label: '≡', insert: '\\equiv' },
            { label: '≈', insert: '\\approx' },
            { label: '≤', insert: '\\leq' },
            { label: '≥', insert: '\\geq' },
            { label: '≪', insert: '\\ll' },
            { label: '≫', insert: '\\gg' },
            { label: '|x|', insert: '|{}|' },
            { label: '‖x‖', insert: '\\|{}\\|' },
            { label: '%', insert: '\\%' },
            { label: '∝', insert: '\\propto' },
        ]
    },
    {
        label: '그리스 문자',
        symbols: [
            { label: 'α', insert: '\\alpha' },
            { label: 'β', insert: '\\beta' },
            { label: 'γ', insert: '\\gamma' },
            { label: 'Γ', insert: '\\Gamma' },
            { label: 'δ', insert: '\\delta' },
            { label: 'Δ', insert: '\\Delta' },
            { label: 'ε', insert: '\\varepsilon' },
            { label: 'ζ', insert: '\\zeta' },
            { label: 'η', insert: '\\eta' },
            { label: 'θ', insert: '\\theta' },
            { label: 'Θ', insert: '\\Theta' },
            { label: 'κ', insert: '\\kappa' },
            { label: 'λ', insert: '\\lambda' },
            { label: 'Λ', insert: '\\Lambda' },
            { label: 'μ', insert: '\\mu' },
            { label: 'ν', insert: '\\nu' },
            { label: 'ξ', insert: '\\xi' },
            { label: 'π', insert: '\\pi' },
            { label: 'Π', insert: '\\Pi' },
            { label: 'ρ', insert: '\\rho' },
            { label: 'σ', insert: '\\sigma' },
            { label: 'Σ', insert: '\\Sigma' },
            { label: 'τ', insert: '\\tau' },
            { label: 'φ', insert: '\\phi' },
            { label: 'Φ', insert: '\\Phi' },
            { label: 'χ', insert: '\\chi' },
            { label: 'ψ', insert: '\\psi' },
            { label: 'Ψ', insert: '\\Psi' },
            { label: 'ω', insert: '\\omega' },
            { label: 'Ω', insert: '\\Omega' },
        ]
    },
    {
        label: '집합 / 논리',
        symbols: [
            { label: '∈', insert: '\\in' },
            { label: '∉', insert: '\\notin' },
            { label: '∋', insert: '\\ni' },
            { label: '⊂', insert: '\\subset' },
            { label: '⊆', insert: '\\subseteq' },
            { label: '⊃', insert: '\\supset' },
            { label: '⊇', insert: '\\supseteq' },
            { label: '∪', insert: '\\cup' },
            { label: '∩', insert: '\\cap' },
            { label: '∅', insert: '\\emptyset' },
            { label: 'ℕ', insert: '\\mathbb{N}' },
            { label: 'ℤ', insert: '\\mathbb{Z}' },
            { label: 'ℚ', insert: '\\mathbb{Q}' },
            { label: 'ℝ', insert: '\\mathbb{R}' },
            { label: 'ℂ', insert: '\\mathbb{C}' },
            { label: '∀', insert: '\\forall' },
            { label: '∃', insert: '\\exists' },
            { label: '¬', insert: '\\neg' },
            { label: '∧', insert: '\\wedge' },
            { label: '∨', insert: '\\vee' },
            { label: '→', insert: '\\rightarrow' },
            { label: '←', insert: '\\leftarrow' },
            { label: '↔', insert: '\\leftrightarrow' },
            { label: '⇒', insert: '\\Rightarrow' },
            { label: '⇔', insert: '\\Leftrightarrow' },
            { label: '∴', insert: '\\therefore' },
            { label: '∵', insert: '\\because' },
        ]
    },
    {
        label: '미적분',
        symbols: [
            { label: '∫', insert: '\\int' },
            { label: '∫ₐᵇ', insert: '\\int_{a}^{b}' },
            { label: '∬', insert: '\\iint' },
            { label: '∮', insert: '\\oint' },
            { label: '∑', insert: '\\sum_{i=1}^{n}' },
            { label: '∏', insert: '\\prod_{i=1}^{n}' },
            { label: 'lim', insert: '\\lim_{x \\to }' },
            { label: 'lim→∞', insert: '\\lim_{x \\to \\infty}' },
            { label: "f'", insert: "f'(x)" },
            { label: 'f″', insert: "f''(x)" },
            { label: 'd/dx', insert: '\\frac{d}{dx}' },
            { label: '∂/∂x', insert: '\\frac{\\partial}{\\partial x}' },
            { label: '∂', insert: '\\partial' },
            { label: '∇', insert: '\\nabla' },
            { label: '∞', insert: '\\infty' },
            { label: 'dy/dx', insert: '\\frac{dy}{dx}' },
        ]
    },
    {
        label: '기하 / 벡터',
        symbols: [
            { label: '⊥', insert: '\\perp' },
            { label: '∥', insert: '\\parallel' },
            { label: '∠', insert: '\\angle' },
            { label: '△', insert: '\\triangle' },
            { label: '□', insert: '\\square' },
            { label: '°', insert: '^{\\circ}' },
            { label: 'vec', insert: '\\vec{}' },
            { label: 'â', insert: '\\hat{}' },
            { label: 'ā', insert: '\\bar{}' },
            { label: 'ã', insert: '\\tilde{}' },
            { label: '→AB', insert: '\\overrightarrow{AB}' },
            { label: 'AB̄', insert: '\\overline{AB}' },
            { label: '|AB|', insert: '|\\overline{AB}|' },
            { label: '⌊x⌋', insert: '\\lfloor x \\rfloor' },
            { label: '⌈x⌉', insert: '\\lceil x \\rceil' },
        ]
    },
    {
        label: '행렬 / 괄호',
        symbols: [
            { label: '()', insert: '\\left( \\right)' },
            { label: '[]', insert: '\\left[ \\right]' },
            { label: '{}', insert: '\\left\\{ \\right\\}' },
            { label: '2×2', insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
            { label: 'det', insert: '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
            { label: 'cases', insert: '\\begin{cases}  &  \\\\  &  \\end{cases}' },
            { label: 'align', insert: '\\begin{aligned}  &=  \\\\  &=  \\end{aligned}' },
            { label: 'binom', insert: '\\binom{n}{k}' },
            { label: 'nCr', insert: '_{}C_{}' },
            { label: 'nPr', insert: '_{}P_{}' },
        ]
    },
    {
        label: '함수 / 삼각',
        symbols: [
            { label: 'sin', insert: '\\sin' },
            { label: 'cos', insert: '\\cos' },
            { label: 'tan', insert: '\\tan' },
            { label: 'sin⁻¹', insert: '\\sin^{-1}' },
            { label: 'cos⁻¹', insert: '\\cos^{-1}' },
            { label: 'tan⁻¹', insert: '\\tan^{-1}' },
            { label: 'log', insert: '\\log' },
            { label: 'logₐ', insert: '\\log_{a}' },
            { label: 'ln', insert: '\\ln' },
            { label: 'exp', insert: '\\exp' },
            { label: 'eˣ', insert: 'e^{}' },
            { label: 'max', insert: '\\max' },
            { label: 'min', insert: '\\min' },
            { label: 'gcd', insert: '\\gcd' },
            { label: 'mod', insert: '\\bmod' },
            { label: 'n!', insert: 'n!' },
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
