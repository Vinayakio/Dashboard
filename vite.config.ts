import { defineConfig } from 'vite';

/* Plant Operations — the FDS AppShell dashboard, served on 5182 as in the
   design-system playground it came from. */
export default defineConfig({
  server: { port: 5182, open: false },
});
