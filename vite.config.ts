import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ============================================
  // SECURITY: HTTP Headers
  // Melindungi dari XSS, clickjacking, dan sniffing
  // ============================================
  server: {
    headers: {
      // Cegah browser menebak-nebak tipe konten (MIME sniffing)
      'X-Content-Type-Options': 'nosniff',
      // Cegah halaman dimuat dalam iframe (clickjacking)
      'X-Frame-Options': 'DENY',
      // Paksa HTTPS di browser (HSTS) — aktif di production
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      // Batasi info referrer yang dikirim ke server lain
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Batasi akses fitur browser yang tidak perlu
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },

  // ============================================
  // SECURITY: Preview server (vite preview) juga pakai headers yang sama
  // ============================================
  preview: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.ts',
        'dist/',
      ],
    },
  },
})