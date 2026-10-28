import 'dotenv/config';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {sitemapFor} from '../shared/seo.mjs';
import {generateCatalog} from '../shared/designs.mjs';
const products=[...JSON.parse(readFileSync(new URL('../shared/catalog.json',import.meta.url))),...generateCatalog()];
if(process.env.SITE_URL){const origin=new URL(process.env.SITE_URL).origin;writeFileSync('dist/sitemap.xml',sitemapFor(products,origin));writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /checkout\nDisallow: /library\nSitemap: ${origin}/sitemap.xml\n`);console.log('Canonical sitemap generated for',origin);}else console.log('SITE_URL is not set; the server will generate a request-aware sitemap.');

const files=['/','/shop',...readdirSync('dist/assets').map(f=>'/assets/'+f),...readdirSync('dist/artworks').filter(f=>f.endsWith('.webp')&&!f.includes('-thumb')).map(f=>'/artworks/'+f),...readdirSync('dist/fonts').map(f=>'/fonts/'+f)];
writeFileSync('dist/precache.json',JSON.stringify(files));
writeFileSync('dist/sw.js',readFileSync('dist/sw.js','utf8').replace('__BUILD_ID__',Date.now().toString(36)));
console.log('Offline public app assets indexed. Private content is excluded.');
