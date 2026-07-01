import { useCallback, useState } from 'react';
import { resolveApiUrl } from '../utils/url';
import { validateImageToLatexFile } from '../utils/imageToLatexValidation';

/**
 * @typedef {Object} ImageToLatexSuccess
 * @property {true} success
 * @property {string} latexText
 * @property {string} plainText
 * @property {string[]} warnings
 * @property {number} confidence
 */

/**
 * @typedef {Object} ImageToLatexFailure
 * @property {false} success
 * @property {string} error
 */

/** @typedef {ImageToLatexSuccess | ImageToLatexFailure} ImageToLatexResult */

export function useImageToLatex() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const convertImage = useCallback(async (file) => {
    setError(null);

    const validation = validateImageToLatexFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return { success: false, error: validation.error };
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(resolveApiUrl('/api/image-to-latex'), {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = data.error || '변환에 실패했습니다.';
        setError(message);
        return { success: false, error: message };
      }

      return data;
    } catch (err) {
      const message = err.message || '네트워크 오류가 발생했습니다.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { convertImage, loading, error, reset };
}
