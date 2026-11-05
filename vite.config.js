import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function eventPreviewPlugin() {
  return {
    name: 'event-preview-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        const match = url.match(/^\/(?:event|e)\/([a-zA-Z0-9_-]+)/);
        if (!match) return next();

        const eventId = match[1];
        const userAgent = req.headers['user-agent'] || '';
        const isCrawler = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|LinkedInBot|Discordbot|Applebot|SkypeUriPreview/i.test(userAgent);

        try {
          // Fetch event from API
          const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
          const fetchRes = await fetch(`${apiUrl}/api/events/${eventId}`);
          const data = fetchRes.ok ? await fetchRes.json() : null;
          const event = data?.event;

          if (!event || event.status === 'draft' || event.approval_status !== 'approved') {
            if (isCrawler) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Event Not Found | TiKeTi</title>
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
              return;
            }
            return next();
          }

          // Read index.html and transform
          let html = await fs.promises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
          html = await server.transformIndexHtml(req.url, html);

          const escapeHtml = (str) => (str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          const host = req.headers.host || 'localhost:3000';
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const siteUrl = `${protocol}://${host}`;
          const escapedTitle = escapeHtml(event.name);
          const rawDesc = event.description || `Get tickets for ${event.name} on TiKeTi!`;
          const escapedDesc = escapeHtml(rawDesc.slice(0, 200));
          const canonicalUrl = `${siteUrl}/event/${encodeURIComponent(event.id)}`;

          let imageUrl = event.poster_url || event.posterUrl || event.banner_url || event.bannerUrl || '';
          if (!imageUrl || imageUrl.trim() === '') {
            imageUrl = `${siteUrl}/default-cover.png`;
          } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            const clean = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
            imageUrl = `${siteUrl}${clean}`;
          } else {
            imageUrl = imageUrl.replace(/^http:\/\//i, 'https://');
          }

          const metaTags = `
    <title>${escapedTitle} | TiKeTi</title>
    <meta name="description" content="${escapedDesc}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TiKeTi" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
`;

          html = html.replace(/<title>.*?<\/title>/i, '');
          html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '');
          html = html.replace('</head>', `${metaTags}\n  </head>`);

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
          return;
        } catch (err) {
          console.error('Error in eventPreviewPlugin:', err);
          return next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), eventPreviewPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: false,
    hmr: {
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
