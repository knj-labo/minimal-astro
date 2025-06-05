import { renderToString } from 'react-dom/server';
import { Counter } from './src/islands/Counter';

const server = Bun.serve({
  port: 3000,

  fetch(req) {
    const url = new URL(req.url);

    // Serve static files
    if (url.pathname === '/client.js') {
      return new Response(Bun.file('./static/client.js'));
    }

    if (url.pathname === '/output.css') {
      return new Response(Bun.file('./static/output.css'));
    }

    // Serve main page
    if (url.pathname === '/') {
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Island Architecture</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/output.css">
</head>
<body class="bg-gray-50 p-8">
  <h1 class="text-3xl font-bold text-center mb-8">Island Architecture Demo</h1>
  
  <!-- Static content -->
  <div class="max-w-2xl mx-auto mb-8 p-6 bg-white rounded-lg shadow">
    <h2 class="text-xl font-semibold mb-2">Static Content</h2>
    <p>This is just HTML, no JavaScript needed!</p>
  </div>
  
  <!-- Island -->
  <div class="max-w-2xl mx-auto">
    <div data-island="Counter" data-props='{"initialCount": 10}'>
      ${renderToString(<Counter initialCount={10} />)}
    </div>
  </div>
  
  <script type="module" src="/client.js"></script>
</body>
</html>`;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);