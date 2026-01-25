import axios from 'axios';

const api = axios.create({
  // 환경변수가 있으면 쓰고, 없으면 기본 Render 주소를 씁니다.
  baseURL: import.meta.env.VITE_API_URL 
});

// 인터셉터를 사용하면 모든 요청에 토큰을 자동으로 실어 보낼 수 있어 편리합니다.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // 혹은 토큰을 저장하는 변수
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;