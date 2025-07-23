/**
 * TypeScript test utilities for minimal-astro tests
 */

import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures/integration')

/**
 * Options for loading a fixture
 */
export interface LoadFixtureOptions {
  root?: string
}

/**
 * Build options for fixtures
 */
export interface BuildOptions {
  timeout?: number
  [key: string]: any
}

/**
 * Build result from fixture
 */
export interface BuildResult {
  success: boolean
  code: number
  stdout: string
  stderr: string
}

/**
 * Server instance for dev/preview
 */
export interface ServerInstance {
  port: number
  close: () => void
  url: string
}

/**
 * Test fixture class with TypeScript support
 */
export class TestFixture {
  root: string
  outDir: string

  constructor(fixturePath: string) {
    this.root = fixturePath
    this.outDir = join(fixturePath, 'dist')
  }

  /**
   * Read a file from the fixture
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = join(this.root, filePath)
    try {
      return await readFile(fullPath, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`)
    }
  }

  /**
   * Check if a file exists in the fixture
   */
  exists(filePath: string): boolean {
    return existsSync(join(this.root, filePath))
  }

  /**
   * Get file stats
   */
  async stat(filePath: string) {
    return await stat(join(this.root, filePath))
  }

  /**
   * List files in a directory
   */
  async ls(dirPath = '.'): Promise<string[]> {
    return await readdir(join(this.root, dirPath))
  }

  /**
   * Clean build output
   */
  async clean(): Promise<void> {
    if (existsSync(this.outDir)) {
      rmSync(this.outDir, { recursive: true, force: true })
    }
  }

  /**
   * Build the fixture
   */
  async build(options: BuildOptions = {}): Promise<BuildResult> {
    const { timeout = 30000, ...buildOptions } = options

    // Ensure clean build
    await this.clean()

    return new Promise((resolve, reject) => {
      const process = spawn(
        'node',
        [
          join(__dirname, '../dist/cli/index.js'),
          'build',
          ...Object.entries(buildOptions).flatMap(([key, value]) => [`--${key}`, String(value)]),
        ],
        {
          cwd: this.root,
          stdio: 'pipe',
          shell: true,
        }
      )

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      const timer = setTimeout(() => {
        process.kill()
        reject(new Error(`Build timed out after ${timeout}ms`))
      }, timeout)

      process.on('exit', (code) => {
        clearTimeout(timer)
        resolve({
          success: code === 0,
          code: code ?? -1,
          stdout,
          stderr,
        })
      })

      process.on('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
  }

  /**
   * Validate build output
   */
  async validateBuildOutput() {
    const htmlFiles: string[] = []
    const files: string[] = []
    const hasIndex = this.exists('dist/index.html')

    async function walkDir(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        const relativePath = fullPath.replace(this.outDir + '/', '')
        
        if (entry.isDirectory()) {
          await walkDir(fullPath)
        } else {
          files.push(relativePath)
          if (entry.name.endsWith('.html')) {
            htmlFiles.push(relativePath)
          }
        }
      }
    }

    if (existsSync(this.outDir)) {
      await walkDir(this.outDir)
    }

    return {
      hasIndex,
      htmlFiles,
      files,
    }
  }
}

/**
 * Load a test fixture
 */
export function loadFixture(fixtureName: string, options: LoadFixtureOptions = {}): TestFixture {
  const fixturePath = options.root || join(FIXTURES_DIR, fixtureName)
  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`)
  }
  return new TestFixture(fixturePath)
}

/**
 * Create a temporary test file
 */
export async function createTestFile(path: string, content: string): Promise<void> {
  const dir = join(path, '..')
  await mkdir(dir, { recursive: true })
  await writeFile(path, content, 'utf-8')
}

/**
 * Clean up temporary test files
 */
export function cleanupTestFiles(paths: string[]): void {
  for (const path of paths) {
    if (existsSync(path)) {
      rmSync(path, { force: true })
    }
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
  throw new Error('Timeout waiting for condition')
}

/**
 * Fetch from a test server
 */
export async function fetchFromServer(url: string): Promise<Response> {
  const response = await fetch(url)
  return response
}

/**
 * Assert that a string contains a substring
 */
export function expectToContain(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`Expected "${actual}" to contain "${expected}"`)
  }
}

/**
 * Build a fixture and return the result
 */
export async function buildFixture(
  fixture: TestFixture,
  options?: BuildOptions
): Promise<BuildResult & { pages: Record<string, { html: string }> }> {
  const result = await fixture.build(options)
  
  // Load built pages
  const pages: Record<string, { html: string }> = {}
  if (result.success) {
    const htmlFiles = await fixture.ls('dist').then(files => 
      files.filter(f => f.endsWith('.html'))
    )
    
    for (const file of htmlFiles) {
      const path = file === 'index.html' ? '/' : `/${file.replace('.html', '')}`
      pages[path] = {
        html: await fixture.readFile(`dist/${file}`)
      }
    }
  }
  
  return { ...result, pages }
}