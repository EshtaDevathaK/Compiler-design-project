import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Allow external access
    port: 3000, // Set a specific port
    allowedHosts: ['compiler-design-project.onrender.com'], // Allow this host
  }
});
