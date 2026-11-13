import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jaytech9.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({ filter: (page) => !/\/(offline|contact\/thanks|book\/thanks|review\/thanks|404)\/$/.test(page) }),
  ],
});
