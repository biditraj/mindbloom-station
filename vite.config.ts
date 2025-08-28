import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  
  define: {
    // Fix for simple-peer: global is not defined
    global: 'globalThis',
    // Fix for process.env access in browser
    'process.env.NODE_DEBUG': 'undefined',
    'process.env.NODE_ENV': '"development"',
  },
  optimizeDeps: {
    include: ['simple-peer', 'react', 'react-dom', 'react-dom/client', 'process'],
    exclude: ['sonner', '@radix-ui/react-tooltip'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client']
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "events": "rollup-plugin-node-polyfills/polyfills/events",
      "util": "rollup-plugin-node-polyfills/polyfills/util",
      "process": "rollup-plugin-node-polyfills/polyfills/process-es6",
      "buffer": "rollup-plugin-node-polyfills/polyfills/buffer-es6",
      "stream": "rollup-plugin-node-polyfills/polyfills/stream"
    },
  },
}));