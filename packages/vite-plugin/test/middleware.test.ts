import path from 'node:path'
import { fileURLToPath } from 'node:url'
import request from 'supertest'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { vitePluginAstro } from '../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('SSR Middleware', () => {
  let server: ViteDevServer

  beforeAll(async () => {
    // Create a Vite server in middleware mode
    server = await createServer({
      root: path.join(__dirname, '../../../examples/blog'),
      server: {
        middlewareMode: true,
      },
      plugins: [vitePluginAstro()],
      logLevel: 'error',
    })

    // Wait a bit for the middleware to be registered
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  afterAll(async () => {
    await server.close()
  })

  it('/ returns index.astro content', async () => {
    const response = await request(server.middlewares)
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/)

    expect(response.text).toContain('Hello minimal-astro')
    expect(response.text).toContain('<h1>')
  })

  it('/about returns about.astro content', async () => {
    const response = await request(server.middlewares)
      .get('/about')
      .expect(200)
      .expect('Content-Type', /text\/html/)

    expect(response.text).toContain('About minimal-astro')
    expect(response.text).toContain('Kenji')
  })

  it('404 for non-existent pages', async () => {
    // The middleware should pass through to next() for non-existent pages
    // Since we're in middleware mode, this will result in a 404
    await request(server.middlewares).get('/non-existent').expect(404)
  })

  it('Ignores non-GET requests', async () => {
    // POST requests should be passed through
    await request(server.middlewares).post('/').expect(404)
  })

  it('Ignores asset requests', async () => {
    // Asset requests should be passed through
    await request(server.middlewares).get('/style.css').expect(404)
  })
})
