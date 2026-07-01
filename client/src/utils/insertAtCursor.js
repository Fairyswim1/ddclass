/**
 * Insert text at cursor in a textarea/input without overwriting existing content.
 * @returns {{ newValue: string, cursorPos: number }}
 */
export function insertTextAtCursor(element, currentValue, textToInsert) {
  const value = currentValue ?? '';
  const insert = textToInsert ?? '';

  if (!insert) {
    return { newValue: value, cursorPos: value.length };
  }

  if (!element) {
    const separator = value && !value.endsWith('\n') ? '\n' : '';
    const newValue = value + separator + insert;
    return { newValue, cursorPos: newValue.length };
  }

  const start = element.selectionStart ?? value.length;
  const end = element.selectionEnd ?? value.length;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const newValue = before + insert + after;
  const cursorPos = start + insert.length;

  return { newValue, cursorPos };
}

export function focusWithCursor(element, cursorPos) {
  if (!element) return;
  setTimeout(() => {
    element.focus();
    try {
      element.setSelectionRange(cursorPos, cursorPos);
    } catch {
      /* input type may not support selection */
    }
  }, 0);
}
