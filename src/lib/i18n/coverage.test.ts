import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translate } from './core';
import { EN } from './en';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'i18n' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('English dictionary', () => {
  it('has an entry for every literal t() key', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles(join(__dirname, '..', '..'))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'((?:[^'\\]|\\.)+)'/g)) {
        const key = m[1].replace(/\\'/g, "'");
        if (/[A-Za-zÄÖÜäöüß]/.test(key) && !(key in EN) && translate('en', key) === key) missing.add(key);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
