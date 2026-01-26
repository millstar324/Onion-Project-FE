import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  // 🌟 [수정] 배포 시에는 브라우저가 직접 서버(Render)로 요청을 보내므로 proxy가 필요 없습니다.
  server: {
    allowedHosts: [
      '.ngrok-free.app', // 로컬 테스트용 ngrok 허용 유지
    ]
  },
  resolve: {
    alias: {
      // 🌟 @ 경로를 src 폴더로 매핑 (코드 작성이 훨씬 편해집니다)
      "@": path.resolve(__dirname, "./src"),
    },
  },
})