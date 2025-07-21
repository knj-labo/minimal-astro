/**
 * Test utilities for Astro integration tests
 * Inspired by withastro/astro test utilities
 */

import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = resolve(__dirname, 'fixtures');

/**
 * Fixture management class
 */
export class TestFixture {
  constructor(fixturePath) {
    this.root = fixturePath;
    this.outDir = join(fixturePath, 'dist');
  }

  /**
   * Read a file from the fixture
   */
  async readFile(filePath) {
    const fullPath = join(this.root, filePath);
    try {
      return await readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in the fixture
   */
  exists(filePath) {
    return existsSync(join(this.root, filePath));
  }

  /**
   * Get file stats
   */
  async stat(filePath) {
    return await stat(join(this.root, filePath));
  }

  /**
   * List files in a directory
   */
  async ls(dirPath = '.') {
    const { readdir } = await import('node:fs/promises');
    return await readdir(join(this.root, dirPath));
  }

  /**
   * Clean build output
   */
  async clean() {
    if (existsSync(this.outDir)) {
      rmSync(this.outDir, { recursive: true, force: true });
    }
  }

  /**
   * Build the fixture
   */
  async build(options = {}) {
    const { timeout = 30000, ...buildOptions } = options;

    // Ensure clean build
    await this.clean();

    return new Promise((resolve, reject) => {
      const process = spawn(
        'node',
        [
          join(__dirname, '../dist/cli/index.js'),
          'build',
          ...Object.entries(buildOptions).flatMap(([key, value]) => [`--${key}`, value]),
        ],
        {
          cwd: this.root,
          stdio: 'pipe',
          shell: true,
        }
      );

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        process.kill();
        reject(new Error(`Build timed out after ${timeout}ms`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timer);

        if (code === 0) {
          resolve({
            code,
            stdout,
            stderr,
            success: true,
          });
        } else {
          reject(new Error(`Build failed with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Start development server
   */
  async dev(options = {}) {
    const { port = 3000, timeout = 10000 } = options;

    return new Promise((resolve, reject) => {
      const process = spawn(
        'node',
        [join(__dirname, '../dist/cli/index.js'), 'dev', '--port', port.toString()],
        {
          cwd: this.root,
          stdio: 'pipe',
        }
      );

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        // Look for server ready signal
        if (output.includes('ready') || output.includes('listening')) {
          resolve({
            process,
            port,
            stdout,
            stderr,
            url: `http://localhost:${port}`,
            close: () => process.kill(),
          });
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        process.kill();
        reject(new Error(`Dev server failed to start within ${timeout}ms`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Dev server exited with code ${code}\nStderr: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Start preview server for built site
   */
  async preview(options = {}) {
    const { port = 4000, timeout = 5000 } = options;

    // Ensure the site is built
    if (!existsSync(this.outDir)) {
      throw new Error('No build output found. Run build() first.');
    }

    return new Promise((resolve, reject) => {
      const process = spawn('node', [join(__dirname, '../../examples/blog/serve.js')], {
        cwd: this.root,
        stdio: 'pipe',
        env: {
          ...process.env,
          PORT: port.toString(),
          DIST_DIR: this.outDir,
        },
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;

        if (output.includes('running at')) {
          resolve({
            process,
            port,
            stdout,
            stderr,
            url: `http://localhost:${port}`,
            close: () => process.kill(),
          });
        }
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        process.kill();
        reject(new Error(`Preview server failed to start within ${timeout}ms`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`Preview server exited with code ${code}\nStderr: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Get build output files
   */
  async getBuildOutput() {
    if (!existsSync(this.outDir)) {
      return [];
    }

    const files = [];

    const walkDir = async (dir, relativePath = '') => {
      const { readdir } = await import('node:fs/promises');
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relPath = join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await walkDir(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    };

    await walkDir(this.outDir);
    return files;
  }

  /**
   * Validate build output structure
   */
  async validateBuildOutput() {
    const files = await this.getBuildOutput();

    return {
      files,
      hasIndex: files.includes('index.html'),
      htmlFiles: files.filter((f) => f.endsWith('.html')),
      jsFiles: files.filter((f) => f.endsWith('.js')),
      cssFiles: files.filter((f) => f.endsWith('.css')),
      assetFiles: files.filter((f) => f.includes('assets/')),
      imageFiles: files.filter((f) => /\.(jpg|jpeg|png|gif|svg|webp)$/.test(f)),
    };
  }
}

/**
 * Load a test fixture
 */
export function loadFixture(options) {
  if (typeof options === 'string') {
    options = { fixture: options };
  }

  const { fixture } = options;
  const fixturePath = join(FIXTURES_DIR, fixture);

  if (!existsSync(fixturePath)) {
    throw new Error(`Fixture '${fixture}' not found at ${fixturePath}`);
  }

  return new TestFixture(fixturePath);
}

/**
 * Helper to check if files contain expected content
 */
export function expectToContain(content, expectedSubstrings) {
  for (const substring of expectedSubstrings) {
    if (!content.includes(substring)) {
      throw new Error(`Expected content to contain "${substring}" but it didn't`);
    }
  }
}

/**
 * Helper to wait for a condition
 */
export function waitFor(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = async () => {
      try {
        const result = await condition();
        if (result) {
          resolve(result);
          return;
        }
      } catch (error) {
        // Continue checking
      }

      if (Date.now() - start > timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Helper to fetch from a server
 */
export async function fetchFromServer(url, options = {}) {
  const { timeout = 5000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}
