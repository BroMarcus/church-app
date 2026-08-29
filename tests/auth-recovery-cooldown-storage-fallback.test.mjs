import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/login/pending-action.tsx'), 'utf8');

test('successful reset/resend keeps an in-memory cooldown when localStorage is unavailable', () => {
  assert.match(source, /const fallbackUntilRef=useRef\(0\)/);
  assert.match(source, /fallbackUntilRef\.current=until/);
  assert.match(source, /const seconds=Math\.max\(0,Math\.ceil\(\(fallbackUntilRef\.current-now\)\/1000\)\)/);
  assert.match(source, /Storage can be unavailable in restricted\/private browser modes\. Keep an in-memory/);
  assert.match(source, /The in-memory fallback keeps this page guarded/);
});

test('stored cooldown and memory fallback stay synchronized without creating a cooldown before confirmed send', () => {
  assert.match(source, /if\(until>fallbackUntilRef\.current\)fallbackUntilRef\.current=until/);
  assert.match(source, /if\(existing>now\)\{\s*\n\s*fallbackUntilRef\.current=existing/);
  assert.match(source, /if\(url\.searchParams\.get\('message_code'\)!==successCode\)return/);
  assert.doesNotMatch(source, /onClick=.*localStorage\.setItem/);
});

test('one-time success marker is still consumed so refresh cannot manufacture another cooldown', () => {
  assert.match(source, /url\.searchParams\.delete\('message_code'\)/);
  assert.match(source, /window\.history\.replaceState/);
});