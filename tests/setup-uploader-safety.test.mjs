import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/church/setup-inbox/setup-uploader.tsx'), 'utf8');

test('Fresh Church Setup requires an approved filename extension even when browser MIME is present', () => {
  assert.match(source, /!allowedExtensions\.has\(extension\)\|\|\(file\.type&&!allowedTypes\.has\(file\.type\)\)/);
  assert.doesNotMatch(source, /\(!file\.type&&!allowedExtensions\.has\(extension\)\)/);
});

test('Fresh Church Setup keeps upload diagnostics bounded instead of logging raw exceptions', () => {
  assert.match(source, /const boundedCode=/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\)\}/);
  assert.doesNotMatch(source, /SetupUploader unexpected failure'\,\{churchId,error\}/);
  assert.match(source, /code:boundedCode\(upload\.error\)/);
  assert.match(source, /code:boundedCode\(insert\.error\)/);
  assert.match(source, /code:boundedCode\(cleanup\.error\)/);
});
