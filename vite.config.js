import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pagesで公開する場合、下の base を "/リポジトリ名/" に変更してください。
// 例: リポジトリ名が "spark-ai" なら base: "/spark-ai/"
export default defineConfig({
  plugins: [react()],
  base: './',
})
