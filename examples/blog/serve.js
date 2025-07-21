#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { existsSync } from 'node:fs';

const PORT = 3000;
const DIST_DIR = './dist';

// Simple MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    let filePath = req.url === '/' ? '/pages/index.html' : req.url;
    
    // Handle clean URLs
    if (!filePath.includes('.') && !filePath.endsWith('/')) {
      filePath = `/pages${filePath}.html`;
    }
    
    let fullPath = join(DIST_DIR, filePath);
    
    // Handle dynamic blog post routing
    if (!existsSync(fullPath) && filePath.startsWith('/pages/blog/')) {
      const slugPath = join(DIST_DIR, '/pages/blog/[slug].html');
      if (existsSync(slugPath)) {
        fullPath = slugPath;
        filePath = '/pages/blog/[slug].html';
      }
    }
    
    if (!existsSync(fullPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Page Not Found</h1>');
      return;
    }
    
    const ext = extname(fullPath);
    const mimeType = mimeTypes[ext] || 'text/plain';
    
    const content = await readFile(fullPath);
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
    
    console.log(`✅ ${req.method} ${req.url} → ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error serving ${req.url}:`, error);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h1>500 - Server Error</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Minimal Astro site running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${DIST_DIR}`);
  console.log(`\n📄 Available pages:`);
  console.log(`   http://localhost:${PORT}/          → Homepage`);
  console.log(`   http://localhost:${PORT}/blog/[slug] → Blog post`);
  console.log(`\n⏹️  Press Ctrl+C to stop`);
});