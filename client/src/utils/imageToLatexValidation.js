export const IMAGE_TO_LATEX_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_TO_LATEX_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export const IMAGE_TO_LATEX_ACCEPT = '.png,.jpg,.jpeg,.webp';

export function validateImageToLatexFile(file) {
  if (!file) {
    return { valid: false, error: '파일을 선택해주세요.' };
  }

  if (!IMAGE_TO_LATEX_ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'png, jpg, jpeg, webp 형식만 지원합니다.',
    };
  }

  if (file.size > IMAGE_TO_LATEX_MAX_BYTES) {
    return {
      valid: false,
      error: '파일 크기는 5MB 이하여야 합니다.',
    };
  }

  return { valid: true, error: null };
}
