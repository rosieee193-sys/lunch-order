import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Supabase Vercel integration thường inject SUPABASE_URL / SUPABASE_ANON_KEY
// (không có prefix VITE_). Vite mặc định chỉ expose VITE_* → map lúc build.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  const supabaseAnon =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
        '/socket.io': {
          target: 'http://localhost:3001',
          ws: true,
        },
      },
    },
  }
})
