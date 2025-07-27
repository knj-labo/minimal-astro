import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createFixture } from '../src/test-utils/index.js'

describe('createFixtureの動作確認', () => {
  it('一時ディレクトリを作成できること', async () => {
    const fixture = await createFixture()

    expect(existsSync(fixture.path)).toBe(true)
    expect(fixture.path).toContain('minimal-astro-test-')

    await fixture.cleanup()
  })

  it('cleanup を呼ぶとディレクトリが削除されること', async () => {
    const fixture = await createFixture()
    const tempPath = fixture.path

    expect(existsSync(tempPath)).toBe(true)

    await fixture.cleanup()

    expect(existsSync(tempPath)).toBe(false)
  })

  it('ファイルを書き込めること', async () => {
    const fixture = await createFixture()

    await fixture.writeFile('test.txt', 'Hello, World!')

    const filePath = join(fixture.path, 'test.txt')
    expect(existsSync(filePath)).toBe(true)

    const content = await readFile(filePath, 'utf-8')
    expect(content).toBe('Hello, World!')

    await fixture.cleanup()
  })

  it('プレフィックスをカスタマイズできること', async () => {
    const fixture = await createFixture('custom-test-')

    expect(fixture.path).toContain('custom-test-')

    await fixture.cleanup()
  })
})
