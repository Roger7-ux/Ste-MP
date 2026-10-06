import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Only used while working on the interface (`npm run client`): the dev server
// passes API calls on to the Flask app. `python app.py` serves the built
// interface itself and needs none of this.
const apiPort = process.env.PORT || 5000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': `http://localhost:${apiPort}` },
  },
});
