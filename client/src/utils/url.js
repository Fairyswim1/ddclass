export const resolveApiUrl = (path) => {
    if (!path) return '';
    // 만약 이미 전체 URL(http...)로 저장되어 있다면 그대로 반환 (하위 호환성)
    if (path.startsWith('http')) return path;

    // 환경 변수에서 기본 서버 URL을 가져옴 (기본값 설정)
    const baseUrl = import.meta.env.VITE_API_URL || 'https://ddclass-server.onrender.com';

    // 경로가 /로 시작하지 않으면 추가해줌
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${normalizedPath}`;
};
