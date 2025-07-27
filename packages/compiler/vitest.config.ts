import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace('/test/', '/test/snapshots/') + snapExtension
    },
  },
})
