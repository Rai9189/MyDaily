import { defineConfig, devices } from '@playwright/test';

process.loadEnvFile('.env.e2e');

// Tests create and delete real rows, so refuse to run against production.
const prodRef = new URL(process.env.PROD_DB_URL!).username.split('.')[1];
if (process.env.VITE_SUPABASE_URL!.includes(prodRef)) {
  throw new Error('.env.e2e points VITE_SUPABASE_URL at production');
}

// Own port, never reused: a plain `npm run dev` on 5173 talks to production.
const PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
