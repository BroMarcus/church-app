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
  assert.match(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*let unlockAfterAttempt=true\s*\n\s*try\{\s*\n\s*const supabase=createClient\(\);const path=`\$\{churchId\}\/\$\{crypto\.randomUUID\(\)\}\/\$\{clean\(file\.name\)\}`/);
  assert.doesNotMatch(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*const supabase=createClient\(\)/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\)\}/);
  assert.match(source, /finally\{if\(unlockAfterAttempt\)setSaving\(false\)\}/);
});

test('Fresh Church Setup keeps upload diagnostics bounded instead of logging raw exceptions', () => {
  assert.match(source, /const boundedCode=/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\)\}/);
  assert.doesNotMatch(source, /SetupUploader unexpected failure'\,\{churchId,error\}/);
  assert.match(source, /code:boundedCode\(upload\.error\)/);
  assert.match(source, /code:boundedCode\(insert\.error\)/);
  assert.match(source, /code:boundedCode\(cleanup\.error\)/);
  assert.match(source, /SetupUploader cleanup transport failed'\,\{churchId,attempt,code:boundedCode\(error\)\}/);
  assert.match(source, /SetupUploader metadata insert transport failed'\,\{churchId,code:boundedCode\(error\)\}/);
});

test('Fresh Church Setup retries orphan cleanup and warns against duplicate re-upload when cleanup is uncertain', () => {
  assert.match(source, /const cleanupUploadedFile=async\(\)=>\{/);
  assert.match(source, /for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(source, /if\(!cleanup\.error\)return true/);
  assert.match(source, /return false/);
  assert.match(source, /if\(!\(await cleanupUploadedFile\(\)\)\)\{failCleanupUncertain\(\);return\}/);
  assert.match(source, /Do not upload this same file again yet\./);
  assert.match(source, /No vuelvas a subir este mismo archivo todavía\./);
});

test('Fresh Church Setup cleans up uploaded storage after metadata transport failures before allowing retry', () => {
  assert.match(source, /let insert\s*\n\s*try\{\s*\n\s*insert=await supabase\.from\('church_setup_uploads'\)\.insert/);
  assert.match(source, /catch\(error\)\{\s*\n\s*console\.error\('SetupUploader metadata insert transport failed'/);
  assert.match(source, /if\(!\(await cleanupUploadedFile\(\)\)\)\{failCleanupUncertain\(\);return\}\s*\n\s*fail\(\);return/);
});

test('Fresh Church Setup keeps a confirmed successful upload locked until the page refreshes', () => {
  assert.match(source, /let unlockAfterAttempt=true/);
  assert.match(source, /unlockAfterAttempt=false\s*\n\s*setStatus\(\{kind:'success'/);
  assert.match(source, /Refreshing the page…/);
  assert.match(source, /Actualizando la página…/);
  assert.match(source, /window\.setTimeout\(\(\)=>window\.location\.reload\(\),700\)/);
  assert.match(source, /finally\{if\(unlockAfterAttempt\)setSaving\(false\)\}/);
});

test('Fresh Church Setup warns pilot testers not to upload sensitive real-world records', () => {
  assert.match(source, /For pilot testing:/);
  assert.match(source, /Do not upload real member records, private pastoral notes, finance files, passwords, or access codes\./);
  assert.match(source, /Para pruebas del piloto:/);
  assert.match(source, /No subas expedientes reales de miembros, notas pastorales privadas, archivos financieros, contraseñas ni códigos de acceso\./);
});
