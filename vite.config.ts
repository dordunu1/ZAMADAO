import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    global: 'window', // Polyfill global for browser
  },
  server: {
    // @ts-expect-error - setupMiddlewares is not typed in Vite yet
    setupMiddlewares: (middlewares: any, _devServer: any) => {
      middlewares.use((req: any, res: any, next: any) => {
        if (req.url && req.url.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
      return middlewares;
    }
  }
});
