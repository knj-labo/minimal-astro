import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createFixture } from '../src/test-utils/index.js'

describe('createFixture', () => {
  it('should create a temporary directory', async () => {
    const fixture = await createFixture()

    expect(existsSync(fixture.path)).toBe(true)
    expect(fixture.path).toContain('minimal-astro-test-')

    await fixture.cleanup()
  })

  it('should clean up the directory when cleanup is called', async () => {
    const fixture = await createFixture()
    const tempPath = fixture.path

    expect(existsSync(tempPath)).toBe(true)

    await fixture.cleanup()

    expect(existsSync(tempPath)).toBe(false)
  })

  it('should write files to the fixture directory', async () => {
    const fixture = await createFixture()

    await fixture.writeFile('test.txt', 'Hello, World!')

    const filePath = join(fixture.path, 'test.txt')
    expect(existsSync(filePath)).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('Hello, World!')

    await fixture.cleanup()
  })

  it('should accept a custom prefix', async () => {
    const fixture = await createFixture('custom-test-')

    expect(fixture.path).toContain('custom-test-')

    await fixture.cleanup()
  })
})
