import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  // Static output: the data changes when someone edits races.json, not per request.
  output: 'static',
  integrations: [icon({ include: { lucide: ['*'] } })],
  vite: { plugins: [tailwind()] },
});
