import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Porta fixa (em vez do 5173 padrao, que costuma colidir com outros
    // projetos neste ambiente). strictPort evita um fallback silencioso
    // para outra porta, o que quebraria FRONTEND_ORIGIN/CORS na API.
    port: 5199,
    strictPort: true,
  },
});