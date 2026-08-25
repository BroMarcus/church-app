import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.join(process.cwd(), 'src/app/church/setup-inbox/setup-uploader.tsx'), 'utf8');

test('Fresh Church Setup requires an approved filename extension even when browser MIME is present', () => {
  assert.match(source, /!allowedExtensions\.has\(extension\)\|\|\(file\.type&&!allowedTypes\.has\(file\.type\)\)/);
  assert.doesNotMatch(source, /\(!file\.type&&!allowedExtensions\.has\(extension\)\)/);
});

test('Fresh Church Setup keeps browser client and path initialization inside safe upload recovery', () => {
  assert.match(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*try\{\s*\n\s*const supabase=createClient\(\);const path=`\$\{churchId\}\/\$\{crypto\.randomUUID\(\)\}\/\$\{clean\(file\.name\)\}`/);
  assert.doesNotMatch(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*const supabase=createClient\(\)/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\)\}/);
  assert.match(source, /finally\{setSaving\(false\)\}/);
});

test('Fresh Church Setup keeps upload diagnostics bounded instead of logging raw exceptions', () => {
  assert.match(source, /const boundedCode=/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\)\}/);
  assert.doesNotMatch(source, /SetupUploader unexpected failure'\,\{churchId,error\}/);
  assert.match(source, /code:boundedCode\(upload\.error\)/);
  assert.match(source, /code:boundedCode\(insert\.error\)/);
  assert.match(source, /code:boundedCode\(cleanup\.error\)/);
  assert.match(source, /SetupUploader cleanup transport failed'\,\{churchId,attempt,code:boundedCode\(error\)\}/);
});

test('Fresh Church Setup retries orphan cleanup and warns against duplicate re-upload when cleanup is uncertain', () => {
  assert.match(source, /let cleanupConfirmed=false/);
  assert.match(source, /for\(let attempt=1;attempt<=2&&!cleanupConfirmed;attempt\+\+\)/);
  assert.match(source, /else cleanupConfirmed=true/);
  assert.match(source, /if\(!cleanupConfirmed\)/);
  assert.match(source, /Do not upload this same file again yet\./);
  assert.match(source, /No vuelvas a subir este mismo archivo todavía\./);
});

test('Fresh Church Setup warns pilot testers not to upload sensitive real-world records', () => {
  assert.match(source, /For pilot testing:/);
  assert.match(source, /Do not upload real member records, private pastoral notes, finance files, passwords, or access codes\./);
  assert.match(source, /Para pruebas del piloto:/);
  assert.match(source, /No subas expedientes reales de miembros, notas pastorales privadas, archivos financieros, contraseñas ni códigos de acceso\./);
});
