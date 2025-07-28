import { describe, expect, it } from 'vitest'
import { vitePluginAstro } from '../src/index.js'

describe('vitePluginAstro', () => {
  it('プラグインが正しい構造を持つ', () => {
    const plugin = vitePluginAstro()

    expect(plugin.name).toBe('vite-plugin-astro')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.transform).toBe('function')
    expect(typeof plugin.configureServer).toBe('function')
  })

  it('.astroファイルのみを変換する', () => {
    const plugin = vitePluginAstro()
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => { code: string; map: null } | null

    // .astroファイルは変換される
    const astroResult = transform('<h1>Test</h1>', '/src/pages/index.astro')
    expect(astroResult).not.toBeNull()
    expect(astroResult.code).toContain('export default')

    // .jsファイルは変換されない
    const jsResult = transform('console.log("test")', '/src/utils/helper.js')
    expect(jsResult).toBeNull()

    // .tsファイルは変換されない
    const tsResult = transform('const x: number = 1', '/src/utils/types.ts')
    expect(tsResult).toBeNull()

    // .cssファイルは変換されない
    const cssResult = transform('body { color: red; }', '/src/styles/main.css')
    expect(cssResult).toBeNull()
  })

  it('パスフィルターが正しく動作する', () => {
    const plugin = vitePluginAstro()
    const transform = plugin.transform as (
      code: string,
      id: string,
    ) => { code: string; map: null } | null

    // 標準的な.astroファイル
    expect(transform('<div>Test</div>', '/src/pages/index.astro')).not.toBeNull()

    // ネストされた.astroファイル
    expect(transform('<div>Test</div>', '/src/components/Header.astro')).not.toBeNull()

    // node_modules内の.astroファイルも変換される（実際の使用では除外したいかも）
    expect(transform('<div>Test</div>', '/node_modules/some-lib/Component.astro')).not.toBeNull()
  })
})
