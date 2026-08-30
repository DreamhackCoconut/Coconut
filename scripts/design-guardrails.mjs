import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve('app/globals.css');
const css = readFileSync(cssPath, 'utf8');
const checks = [
  ['gradients', /\b(?:linear|radial|conic)-gradient\s*\(/i, 'Use solid color surfaces instead of gradients.'],
  ['all-caps text', /text-transform\s*:\s*(?:uppercase|lowercase|capitalize)\b/i, 'Use normal sentence-case text.'],
  ['small-caps text', /font-variant(?:-caps)?\s*:\s*(?:small-caps|all-small-caps|all-petite-caps)\b/i, 'Use normal letterforms instead of small caps.'],
  ['green palette', /\bgreen\b|#4ade80|#50b3c2|#e8f7ed|#12351f/i, 'Keep the interface on the approved cream, charcoal, blue, and coral palette.'],
  ['unbounded transitions', /transition\s*:[^;]*\ball\b/i, 'Name the properties being transitioned.'],
  ['scale-from-zero motion', /scale\(\s*0(?:[),\s])/i, 'Enter from a visible scale with opacity, never scale(0).'],
];

const failures = checks.flatMap(([name, pattern, guidance]) => {
  const match = css.match(pattern);
  if (!match || match.index === undefined) return [];
  const line = css.slice(0, match.index).split('\n').length;
  return [`${name} at app/globals.css:${line} — ${guidance}`];
});

for (const [property, guidance] of [
  ['box-shadow', 'Use borders and spacing instead of drop shadows.'],
  ['backdrop-filter', 'Keep surfaces opaque and unblurred.'],
]) {
  for (const match of css.matchAll(new RegExp(`(?<!-)${property}\\s*:\\s*([^;]+);`, 'gi'))) {
    if (match[1].trim().replace(/\s*!important$/, '') === 'none') continue;
    const line = css.slice(0, match.index).split('\n').length;
    failures.push(`${property} at app/globals.css:${line} — ${guidance}`);
  }
}

for (const required of ['prefers-reduced-motion: reduce', '(hover: hover) and (pointer: fine)']) {
  if (!css.includes(required)) failures.push(`missing ${required} motion guard.`);
}

if (failures.length) {
  console.error('Design guardrails failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Design guardrails passed: solid surfaces, normal case text, bounded motion, and accessibility fallbacks are present.');
