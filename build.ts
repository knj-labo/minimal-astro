
// @ts-ignore
await Bun.build({
    entrypoints: ['./src/client.ts'],
    outdir: './static',
    target: 'browser',
    naming: {
        entry: 'client.js',
    },
});

console.log('✅ Client bundle built!');