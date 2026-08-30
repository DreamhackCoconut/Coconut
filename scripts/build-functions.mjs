import { build } from 'esbuild';

await build({
  entryPoints: ['./functions/coconut-api/src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: './functions/coconut-api/dist/main.js',
  sourcemap: true,
  alias: { '@': process.cwd() },
  external: ['node-appwrite'],
  logLevel: 'info',
});
