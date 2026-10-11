import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('README stays concise and describes the reader workflow', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
  for (const phrase of ['Collect', 'Understand', 'Organize', 'Keep', 'Review']) {
    assert.ok(readme.includes(phrase), `README is missing: ${phrase}`);
  }
  assert.equal(/[\u3400-\u9fff\uf900-\ufaff]/u.test(readme), false, 'README should use English throughout');
  assert.ok(readme.split(/\r?\n/).length < 30, 'README should remain concise and suitable for the project homepage');
  for (const engineeringDetail of ['401', 'DPAPI', '最多 3 次', '受控商业 pilot']) {
    assert.equal(readme.includes(engineeringDetail), false, `README should omit internal implementation details: ${engineeringDetail}`);
  }
});

test('Pages 部署只允许手动触发，避免项目站自动占用账号自定义域名路径', () => {
  const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'deploy-reading-site.yml'), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.equal(workflow.includes('push:'), false);
  assert.equal(workflow.includes('pull_request:'), false);
});
