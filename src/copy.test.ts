import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The four cedilla letters are built from code points so this file does not contain them.
const CEDILLA = new RegExp(`[${String.fromCodePoint(0x15f, 0x163, 0x15e, 0x162)}]`);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('Romanian copy', () => {
  it('no cedilla s/t in src (use comma-below ș ț)', () => {
    const offenders = walk('src')
      .filter((f) => /\.(ts|tsx|css|json)$/.test(f))
      .filter((f) => !f.endsWith('copy.test.ts'))
      .filter((f) => CEDILLA.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
