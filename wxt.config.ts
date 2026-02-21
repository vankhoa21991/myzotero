import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'MyZotero',
    description: 'Personal reference manager — save papers, PDFs, and annotations',
    permissions: ['storage', 'sidePanel', 'tabs', 'activeTab', 'scripting', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    build: {
      target: 'esnext',
    },
  }),
});
