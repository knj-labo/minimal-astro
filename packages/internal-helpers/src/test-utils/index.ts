import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export interface Fixture {
  path: string
  cleanup: () => Promise<void>
  writeFile: (filePath: string, content: string) => Promise<void>
}

/**
 * Creates a temporary directory for testing with automatic cleanup
 * @param prefix - Prefix for the temporary directory name
 * @returns Fixture object with path and utility methods
 */
export async function createFixture(prefix = 'minimal-astro-test-'): Promise<Fixture> {
  const tempDir = await mkdtemp(join(tmpdir(), prefix))

  const fixture: Fixture = {
    path: tempDir,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true })
    },
    writeFile: async (filePath: string, content: string) => {
      const fullPath = join(tempDir, filePath)
      const dir = dirname(fullPath)

      // Ensure directory exists
      await mkdir(dir, { recursive: true })
      await writeFile(fullPath, content)
    },
  }

  return fixture
}
