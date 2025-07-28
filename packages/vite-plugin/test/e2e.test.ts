import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import type { ExecaChildProcess } from 'execa'
import getPort from 'get-port'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const blogDir = path.join(__dirname, '../../../examples/blog')

describe('E2E - Dev Server', () => {
  let devServer: ExecaChildProcess
  let port: number
  let baseUrl: string

  beforeAll(async () => {
    // Get an available port
    port = await getPort()
    baseUrl = `http://localhost:${port}`

    // Start the dev server
    devServer = execa('pnpm', ['dev', '--port', String(port)], {
      cwd: blogDir,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    })

    // Wait for the server to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Dev server failed to start'))
      }, 30000)

      devServer.stdout?.on('data', chunk => {
        const output = chunk.toString()
        console.info('[Dev Server]', output)

        if (output.includes('ready in') || output.includes('Local:')) {
          clearTimeout(timeout)
          resolve()
        }
      })

      devServer.stderr?.on('data', chunk => {
        console.error('[Dev Server Error]', chunk.toString())
      })
    })

    // Give it a bit more time to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  afterAll(async () => {
    // Kill the dev server
    if (devServer) {
      devServer.kill('SIGTERM')
      await devServer.catch(() => {}) // Ignore exit errors
    }
  })

  it('serves index.astro at /', async () => {
    const response = await request(baseUrl)
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/)

    expect(response.text).toContain('Hello minimal-astro')
    expect(response.text).toContain('Welcome to minimal-astro!')
    expect(response.text).toContain('Fast by default')
  })

  it('serves about.astro at /about', async () => {
    const response = await request(baseUrl)
      .get('/about')
      .expect(200)
      .expect('Content-Type', /text\/html/)

    expect(response.text).toContain('About minimal-astro')
    expect(response.text).toContain('Kenji')
    expect(response.text).toContain('Developer')
  })

  it('returns 404 for non-existent pages', async () => {
    await request(baseUrl).get('/non-existent').expect(404)
  })

  it('handles SIGINT gracefully', async () => {
    // Send SIGINT
    devServer.kill('SIGINT')

    // Wait for process to exit
    const result = await devServer.catch(err => err)

    // Should exit cleanly (exit code 0 or SIGINT)
    expect([0, null, undefined, 'SIGINT']).toContain(result.signal || result.exitCode)
  })
})
