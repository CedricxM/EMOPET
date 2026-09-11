import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const englishRoleWord = /\bguardians?\b/iu;

test('observed repository architecture uses canonical Owner terminology', async () => {
  const architecture = await readFile(new URL('../../../ARCHITECTURE.md', import.meta.url), 'utf8');

  assert.match(architecture, /### Owner\/dog authorization/);
  assert.match(architecture, /## 9\. Owner professional sharing/);
  assert.match(architecture, /EMOPET_OWNER_AUTHORITY_MASTER_v0\.1\.md/);
  assert.match(architecture, /5a906b44898754778c5a763a041a3a40b8a8846a/);
  assert.doesNotMatch(architecture, englishRoleWord);
});
