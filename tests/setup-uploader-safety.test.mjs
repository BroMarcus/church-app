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
  assert.match(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*let unlockAfterAttempt=true\s*\n\s*let metadataCommitted=false\s*\n\s*try\{\s*\n\s*const supabase=createClient\(\);const path=`\$\{churchId\}\/\$\{crypto\.randomUUID\(\)\}\/\$\{clean\(file\.name\)\}`/);
  assert.doesNotMatch(source, /setSaving\(true\);setStatus\(null\)\s*\n\s*const supabase=createClient\(\)/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\),phase:metadataCommitted\?'post_commit':'pre_commit'\}/);
  assert.match(source, /finally\{if\(unlockAfterAttempt\)setSaving\(false\)\}/);
});

test('Fresh Church Setup keeps upload diagnostics bounded instead of logging raw exceptions', () => {
  assert.match(source, /const boundedCode=/);
  assert.match(source, /SetupUploader unexpected failure'\,\{churchId,code:boundedCode\(error\),phase:/);
  assert.doesNotMatch(source, /SetupUploader unexpected failure'\,\{churchId,error\}/);
  assert.match(source, /code:boundedCode\(upload\.error\)/);
  assert.match(source, /code:boundedCode\(insert\.error\)/);
  assert.match(source, /code:boundedCode\(cleanup\.error\)/);
  assert.match(source, /SetupUploader cleanup transport failed'\,\{churchId,attempt,code:boundedCode\(error\)\}/);
  assert.match(source, /SetupUploader metadata insert transport failed'\,\{churchId,code:boundedCode\(error\)\}/);
});

test('Fresh Church Setup retries orphan cleanup and requires confirmed deletion before encouraging re-upload', () => {
  assert.match(source, /const cleanupUploadedFile=async\(\)=>\{/);
  assert.match(source, /for\(let attempt=1;attempt<=2;attempt\+\+\)/);
  assert.match(source, /const confirmedDeleted=!cleanup\.error&&Array\.isArray\(cleanup\.data\)&&cleanup\.data\.some/);
  assert.match(source, /item\.name===path\|\|path\.endsWith\(`/);
  assert.match(source, /if\(confirmedDeleted\)return true/);
  assert.match(source, /SetupUploader cleanup unconfirmed/);
  assert.match(source, /DELETE_NOT_CONFIRMED/);
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
  assert.match(source, /metadataCommitted=true\s*\n\s*unlockAfterAttempt=false\s*\n\s*setStatus\(\{kind:'success'/);
  assert.match(source, /Refreshing the page…/);
  assert.match(source, /Actualizando la página…/);
  assert.match(source, /window\.setTimeout\(\(\)=>window\.location\.reload\(\),700\)/);
  assert.match(source, /const uploadSaved=status\?\.kind==='success'&&saving/);
  assert.match(source, /The file has already been saved\. Do not upload it again\./);
  assert.match(source, /El archivo ya fue guardado\. No lo vuelvas a subir\./);
  assert.match(source, /Reload inbox/);
  assert.match(source, /Recargar bandeja/);
  assert.match(source, /finally\{if\(unlockAfterAttempt\)setSaving\(false\)\}/);
});

test('Fresh Church Setup does not turn a post-commit refresh problem into a false upload failure', () => {
  assert.match(source, /let metadataCommitted=false/);
  assert.match(source, /metadataCommitted=true/);
  assert.match(source, /if\(metadataCommitted\)\{unlockAfterAttempt=false;savedButRefreshFailed\(\)\}/);
  assert.match(source, /The file was saved, but this page did not refresh\. Do not upload it again\./);
  assert.match(source, /El archivo sí se guardó, pero esta página no se actualizó\. No vuelvas a subirlo\./);
  assert.doesNotMatch(source, /if\(metadataCommitted\)\{[^}]*fail\(\)/);
});

test('Fresh Church Setup warns pilot testers not to upload sensitive real-world records', () => {
  assert.match(source, /For pilot testing:/);
  assert.match(source, /Do not upload real member records, private pastoral notes, finance files, passwords, or access codes\./);
  assert.match(source, /Para pruebas del piloto:/);
  assert.match(source, /No subas expedientes reales de miembros, notas pastorales privadas, archivos financieros, contraseñas ni códigos de acceso\./);
});