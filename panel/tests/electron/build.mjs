import { build } from 'esbuild'
await build({ entryPoints: ['tests/electron/main.ts'], outfile: 'dist/test/main.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', banner: { js: "import { fileURLToPath as testFileURLToPath } from 'node:url'; import { dirname as testDirname } from 'node:path'; const __dirname = testDirname(testFileURLToPath(import.meta.url));" } })
