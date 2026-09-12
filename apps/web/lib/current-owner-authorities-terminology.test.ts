import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const guardianRoleWord = /\bguardians?\b/iu;

test('current cross-domain authorities use Owner terminology for the dog owner role', async () => {
  const [core, home, humaneSocial, founderLocks, brittanyEntry, dataTrust, recordsPolicy] = await Promise.all([
    readFile(new URL('../../../docs/strategy/CORE_CAPABILITY_AND_ACTIVATION_DOCTRINE_2026-09-07.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_HOME_TODAY_PRODUCT_MASTER_v0.1.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/product/EMOPET_HUMANE_SOCIAL_ARCHITECTURE_MASTER_v0.2_VERIFIED_2026-09-01.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/FOUNDER_STRATEGIC_LOCKS_2026-09-07.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/BRETAGNE_LOCAL_ENTRY_AND_COMMUNITY_DOCTRINE_2026-09-07.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/strategy/DATA_TRUST_AND_BUSINESS_MODEL_DOCTRINE_2026-09-07.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs/records/README.md', import.meta.url), 'utf8'),
  ]);

  for (const source of [core, home, humaneSocial, founderLocks, brittanyEntry, dataTrust, recordsPolicy]) {
    assert.doesNotMatch(source, guardianRoleWord);
  }

  assert.match(core, /Owner identity/);
  assert.match(core, /OWNER_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-11\.md/);
  assert.doesNotMatch(core, /GUARDIAN_RELATIONSHIP_AND_PRODUCT_SCOPE_DOCTRINE_2026-09-07\.md/);
  assert.match(home, /better Owner/);
  assert.match(humaneSocial, /Canine \+ Owner matching/);
  assert.match(humaneSocial, /OWNER PRACTICAL FIT/);
  assert.match(founderLocks, /help the Owner understand/);
  assert.match(brittanyEntry, /Owner understanding and willingness to pay/);
  assert.match(dataTrust, /Owner benefit or compensation/);
  assert.match(recordsPolicy, /Owner Authority/);
  assert.match(recordsPolicy, /Owner Continuity/);
});
