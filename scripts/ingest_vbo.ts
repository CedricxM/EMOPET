/**
 * VBO (Vertebrate Breed Ontology) Ingestion Script
 *
 * Downloads VBO JSON-LD and extracts dog breed entries into breed_canonical table.
 * Cross-references with existing FCI breed_profiles.json for fci_number linkage.
 *
 * Usage:
 *   npx tsx scripts/ingest_vbo.ts
 *   npx tsx scripts/ingest_vbo.ts --dry-run
 *   npx tsx scripts/ingest_vbo.ts --skip-download
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { resolve } from 'path';

// ─── Types ──────────────────────────────────────────────────────────

interface VboNode {
  id?: string;
  lbl?: string;
  type?: string;
  meta?: {
    synonyms?: Array<{ val: string; pred?: string }>;
    xrefs?: Array<{ val: string }>;
    basicPropertyValues?: Array<{ pred: string; val: string }>;
    definition?: { val: string };
  };
}

interface VboGraph {
  nodes?: VboNode[];
  edges?: Array<{ sub: string; pred: string; obj: string }>;
}

interface VboJson {
  graphs?: VboGraph[];
}

interface BreedEntry {
  vbo_id: string;
  label: string;
  display_name: string;
  breed_slug: string;
  synonyms: string[];
  fci_number: number | null;
}

interface FciBreed {
  fci_number: number;
  breed_name_fr: string;
  breed_name_en: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/\(dog\)/gi, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanDisplayName(label: string): string {
  return label
    .replace(/\s*\(Dog\)\s*/i, '')
    .replace(/\s*\(dog breed\)\s*/i, '')
    .trim();
}

function dedupSynonyms(synonyms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of synonyms) {
    const key = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(s.trim());
    }
  }
  return result;
}

function isDogBreed(node: VboNode, dogClassIds: Set<string>, edges: Map<string, string[]>): boolean {
  if (!node.id || !node.lbl) return false;

  // Direct check: label contains "(Dog)"
  if (/\(Dog\)/i.test(node.lbl)) return true;

  // Check if any parent class is a known dog class
  const parents = edges.get(node.id) || [];
  for (const parent of parents) {
    if (dogClassIds.has(parent)) return true;
  }

  return false;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDownload = args.includes('--skip-download');

  const dataDir = resolve(__dirname, '..', 'data', 'vbo');
  const vboPath = resolve(dataDir, 'vbo.json');

  // Step 1: Download VBO JSON
  if (!skipDownload) {
    console.log('Downloading VBO JSON-LD...');
    try {
      execSync(`curl -L -o "${vboPath}" "http://purl.obolibrary.org/obo/vbo.json"`, {
        stdio: 'inherit',
        timeout: 120_000,
      });
    } catch (e) {
      console.error('Failed to download VBO. Use --skip-download if file exists locally.');
      process.exit(1);
    }
  }

  if (!existsSync(vboPath)) {
    console.error(`VBO file not found at ${vboPath}`);
    process.exit(1);
  }

  // Step 2: Compute checksum
  const vboRaw = readFileSync(vboPath, 'utf-8');
  const checksum = createHash('sha256').update(vboRaw).digest('hex');
  console.log(`VBO checksum: ${checksum}`);

  // Step 3: Parse
  console.log('Parsing VBO JSON...');
  const vbo: VboJson = JSON.parse(vboRaw);
  const graph = vbo.graphs?.[0];
  if (!graph?.nodes) {
    console.error('No graph/nodes found in VBO JSON');
    process.exit(1);
  }

  // Build parent-child edge map (is_a relationships)
  const parentEdges = new Map<string, string[]>();
  for (const edge of graph.edges || []) {
    if (edge.pred === 'is_a') {
      const existing = parentEdges.get(edge.sub) || [];
      existing.push(edge.obj);
      parentEdges.set(edge.sub, existing);
    }
  }

  // Identify dog breed class IDs (nodes with "dog" or "canine" in label)
  const dogClassIds = new Set<string>();
  for (const node of graph.nodes) {
    if (node.id && node.lbl) {
      const lbl = node.lbl.toLowerCase();
      if (
        lbl.includes('domestic dog breed') ||
        lbl.includes('canis lupus familiaris') ||
        (lbl.includes('dog') && lbl.includes('breed') && node.type === 'CLASS')
      ) {
        dogClassIds.add(node.id);
      }
    }
  }

  console.log(`Found ${dogClassIds.size} dog parent class IDs`);

  // Step 4: Extract dog breeds
  const breeds: BreedEntry[] = [];
  const slugSet = new Set<string>();

  for (const node of graph.nodes) {
    if (!isDogBreed(node, dogClassIds, parentEdges)) continue;
    if (!node.id || !node.lbl) continue;

    // Extract VBO ID from URI (e.g., "http://purl.obolibrary.org/obo/VBO_0200406" -> "VBO:0200406")
    const vboMatch = node.id.match(/VBO_(\d+)/);
    if (!vboMatch) continue;
    const vboId = `VBO:${vboMatch[1]}`;

    const displayName = cleanDisplayName(node.lbl);
    let slug = toSlug(displayName);

    // Handle duplicate slugs
    if (slugSet.has(slug)) {
      slug = `${slug}-${vboMatch[1]}`;
    }
    slugSet.add(slug);

    // Collect synonyms
    const rawSynonyms: string[] = [];
    if (node.meta?.synonyms) {
      for (const syn of node.meta.synonyms) {
        if (syn.val) rawSynonyms.push(syn.val);
      }
    }

    breeds.push({
      vbo_id: vboId,
      label: node.lbl,
      display_name: displayName,
      breed_slug: slug,
      synonyms: dedupSynonyms(rawSynonyms),
      fci_number: null,
    });
  }

  console.log(`Extracted ${breeds.length} dog breeds from VBO`);

  // Step 5: Cross-reference with FCI data
  const fciPath = resolve(__dirname, '..', 'data', 'breed_profiles.json');
  let fciMatched = 0;
  let fciUnmatched: string[] = [];

  if (existsSync(fciPath)) {
    console.log('Cross-referencing with FCI breed profiles...');
    const fciBreeds: FciBreed[] = JSON.parse(readFileSync(fciPath, 'utf-8'));

    // Build lookup maps from VBO entries
    const slugToBreed = new Map<string, BreedEntry>();
    const nameToBreed = new Map<string, BreedEntry>();

    for (const breed of breeds) {
      slugToBreed.set(breed.breed_slug, breed);
      nameToBreed.set(breed.display_name.toLowerCase(), breed);
      for (const syn of breed.synonyms) {
        nameToBreed.set(syn.toLowerCase(), breed);
      }
    }

    for (const fci of fciBreeds) {
      const namesToTry = [
        fci.breed_name_en.toLowerCase(),
        toSlug(fci.breed_name_en),
        fci.breed_name_fr.toLowerCase(),
        toSlug(fci.breed_name_fr),
      ];

      let matched = false;
      for (const name of namesToTry) {
        const found = nameToBreed.get(name) || slugToBreed.get(name);
        if (found) {
          found.fci_number = fci.fci_number;
          fciMatched++;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Try fuzzy match (simple: check if FCI name is substring of any VBO name)
        for (const breed of breeds) {
          const fciSlug = toSlug(fci.breed_name_en);
          if (
            breed.breed_slug.includes(fciSlug) ||
            fciSlug.includes(breed.breed_slug)
          ) {
            breed.fci_number = fci.fci_number;
            fciMatched++;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        fciUnmatched.push(`FCI ${fci.fci_number}: ${fci.breed_name_en} / ${fci.breed_name_fr}`);
      }
    }

    console.log(`FCI cross-reference: ${fciMatched}/${fciBreeds.length} matched (${((fciMatched / fciBreeds.length) * 100).toFixed(1)}%)`);

    if (fciUnmatched.length > 0) {
      const unmatchedPath = resolve(dataDir, 'fci_unmatched.json');
      writeFileSync(unmatchedPath, JSON.stringify(fciUnmatched, null, 2));
      console.log(`${fciUnmatched.length} unmatched FCI breeds written to ${unmatchedPath}`);
    }
  }

  // Step 6: Build provenance
  const provenance = {
    source: 'vbo',
    version: checksum.slice(0, 12),
    retrieved_at: new Date().toISOString(),
    license: 'CC-BY-4.0',
    attribution: 'Vertebrate Breed Ontology (VBO), OBO Foundry, CC BY 4.0',
  };

  // Attach provenance to each breed
  const output = breeds.map((b) => ({ ...b, provenance }));

  // Step 7: Write output
  const outputPath = resolve(dataDir, 'breed_canonical.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Written ${output.length} breeds to ${outputPath}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would insert into breed_canonical table. Skipping DB write.');
    return;
  }

  // Step 8: Generate SQL insert statements
  const sqlPath = resolve(dataDir, 'breed_canonical_insert.sql');
  const sqlLines = output.map((b) => {
    const synonymsJson = JSON.stringify(b.synonyms).replace(/'/g, "''");
    const provenanceJson = JSON.stringify(b.provenance).replace(/'/g, "''");
    const fciNum = b.fci_number !== null ? b.fci_number.toString() : 'NULL';
    const displayName = b.display_name.replace(/'/g, "''");
    const label = b.label.replace(/'/g, "''");

    return `INSERT INTO breed_canonical (vbo_id, label, display_name, breed_slug, synonyms, fci_number, provenance) VALUES ('${b.vbo_id}', '${label}', '${displayName}', '${b.breed_slug}', '${synonymsJson}'::jsonb, ${fciNum}, '${provenanceJson}'::jsonb) ON CONFLICT (vbo_id) DO UPDATE SET label = EXCLUDED.label, display_name = EXCLUDED.display_name, synonyms = EXCLUDED.synonyms, fci_number = EXCLUDED.fci_number, provenance = EXCLUDED.provenance;`;
  });

  writeFileSync(sqlPath, sqlLines.join('\n'));
  console.log(`SQL insert statements written to ${sqlPath}`);

  // Step 9: Write dataset version record
  const versionSql = `INSERT INTO dataset_versions (dataset_id, version_tag, checksum_sha256, record_count, notes) VALUES ('vbo', '${checksum.slice(0, 12)}', '${checksum}', ${output.length}, 'Auto-ingested by ingest_vbo.ts') ON CONFLICT DO NOTHING;`;
  const versionPath = resolve(dataDir, 'dataset_version_insert.sql');
  writeFileSync(versionPath, versionSql);
  console.log(`Dataset version SQL written to ${versionPath}`);

  // Summary
  console.log('\n── VBO Ingestion Summary ──');
  console.log(`  Total dog breeds: ${output.length}`);
  console.log(`  With FCI number:  ${output.filter((b) => b.fci_number !== null).length}`);
  console.log(`  Unique slugs:     ${new Set(output.map((b) => b.breed_slug)).size}`);
  console.log(`  With synonyms:    ${output.filter((b) => b.synonyms.length > 0).length}`);
  console.log(`  Checksum:         ${checksum.slice(0, 12)}...`);
}

main().catch((err) => {
  console.error('VBO ingestion failed:', err);
  process.exit(1);
});
