import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/user'로 시작하는 요청을 백엔드 주소로 전달
      '/user': {
        target: 'http://localhost:8080', // 실제 백엔드 서버 주소로 수정하세요!
        changeOrigin: true,
        secure: false,
      },
    },
    allowedHosts: [
      'https://2525d27212aa.ngrok-free.app', // 현재 에러난 특정 주소 허용
      '.ngrok-free.app',              // 모든 ngrok 주소를 허용 (추천)
      
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})