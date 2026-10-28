import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', allowedHosts: true, fs: { deny: ['.env', '.env.*', '**/private/**', '**/store/**', '**/server/**', '**/assets/source/**', '**/.cache/**', '**/.agents/**', '**/skills/**', '**/vendor/**', '**/.git/**', '*.{crt,pem}'] } },
  // Transform React Router v7's dynamic CommonJS re-exports during development SSR.
  ssr: { noExternal: ['react-router-dom', 'react-router'], resolve: { conditions: ['module', 'import'] } },
  build: { sourcemap: false, target: 'es2022' }
});
