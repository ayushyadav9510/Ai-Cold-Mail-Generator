import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'; // 1. Isko import karein

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 2. Isko plugins ke andar add karein
  ],
});
