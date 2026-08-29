import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const workflow=readFileSync(new URL('../.github/workflows/build.yml',import.meta.url),'utf8')

test('CI cannot report a successful PR run when install tests lint or build failed',()=>{
  assert.match(workflow,/- name: Enforce release gate[\s\S]*if: always\(\)/)
  assert.match(workflow,/INSTALL: \$\{\{ steps\.install\.outcome \}\}/)
  assert.match(workflow,/TESTS: \$\{\{ steps\.tests\.outcome \}\}/)
  assert.match(workflow,/LINT: \$\{\{ steps\.lint\.outcome \}\}/)
  assert.match(workflow,/BUILD: \$\{\{ steps\.build\.outcome \}\}/)
  assert.match(workflow,/if \[ \"\$INSTALL\" = success \] && \[ \"\$TESTS\" = success \] && \[ \"\$LINT\" = success \] && \[ \"\$BUILD\" = success \]/)
  assert.match(workflow,/Release gate failed:/)
  assert.match(workflow,/exit 1/)
})
