import fs from 'fs';
import path from 'path';

// Static routes
const staticRoutes = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/event', changefreq: 'daily', priority: 0.9 },
  { url: '/scan', changefreq: 'monthly', priority: 0.5 },
];

// Generate sitemap XML
const generateSitemap = () => {
  const baseUrl = 'https://terasdakwah.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  staticRoutes.forEach((route) => {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${route.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>';

  return xml;
};

// Write sitemap to public folder
const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
const sitemapContent = generateSitemap();

fs.writeFileSync(sitemapPath, sitemapContent);
console.log('✓ Sitemap generated at public/sitemap.xml');
