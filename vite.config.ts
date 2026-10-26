import { defineConfig } from 'vite';

// Relative assets also work under https://USER.github.io/REPOSITORY/.
export default defineConfig({ base: './', build: { target: 'es2022' } });
