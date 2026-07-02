/**
 * 이미지 → LaTeX 변환 도구를 새 창(팝업)으로 엽니다.
 */
export function openImageToLatexWindow() {
  const url = `${window.location.origin}/teacher/image-to-latex`;
  const popup = window.open(
    url,
    'imageToLatex',
    'width=640,height=780,scrollbars=yes,resizable=yes'
  );
  popup?.focus();
}
