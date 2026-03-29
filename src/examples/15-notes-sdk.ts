/**
 * Example 15: High-level Notes SDK
 * 
 * Demonstrates the CongraphSDK class which provides:
 * - High-level note operations
 * - Automatic filesystem synchronization 
 * - Wiki-link parsing and graph relationship creation
 * - Neighbors and path finding in the knowledge graph
 */

import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { CongraphSDK } from '../index.js';

export async function run(verbose: boolean = false): Promise<void> {
  console.log(chalk.cyan('Starting Notes SDK Example...'));

  // Define paths
  const dbPath = path.join(process.cwd(), 'data', 'notes-demo.cgraph');
  const notesPath = path.join(process.cwd(), 'data', 'notes');

  // Clean up previous runs if any
  try {
    await fs.rm(notesPath, { recursive: true, force: true });
    await fs.rm(dbPath, { force: true });
  } catch (err) { /* ignore */ }

  // 1. Initialize SDK
  console.log(chalk.dim('\n1. Initializing SDK...'));
  const sdk = new CongraphSDK(dbPath, notesPath, 'javascript');
  await sdk.init();
  console.log(chalk.green('✓ SDK Initialized'));

  // 2. Create some notes with wiki-links
  console.log(chalk.dim('\n2. Creating notes with wiki-links...'));
  
  const note1 = await sdk.createNote({
    title: 'CongraphDB Overview',
    content: 'CongraphDB is a fast, embedded graph database. It is inspired by [[DuckDB]] and [[LevelGraph]].',
    tags: ['graph', 'database', 'embedded']
  });
  console.log(chalk.green(`✓ Created: ${note1.title} (ID: ${note1.id})`));

  const note2 = await sdk.createNote({
    title: 'DuckDB',
    content: 'DuckDB is an analytical in-process SQL database management system.',
    tags: ['sql', 'analytical']
  });
  console.log(chalk.green(`✓ Created: ${note2.title} (ID: ${note2.id})`));

  const note3 = await sdk.createNote({
    title: 'LevelGraph',
    content: 'LevelGraph is a graph database built on top of LevelDB.',
    tags: ['graph', 'leveldb', 'javascript']
  });
  console.log(chalk.green(`✓ Created: ${note3.title} (ID: ${note3.id})`));

  // 3. Verify graph relationships
  console.log(chalk.dim('\n3. Verifying graph relationships (wiki-links)...'));
  const links = await sdk.getLinks(note1.id);
  console.log(`Links from "${note1.title}":`);
  links.forEach(l => console.log(`  - [[${l.targetTitle}]]`));

  // 4. Verify filesystem synchronization
  console.log(chalk.dim('\n4. Verifying filesystem synchronization...'));
  const files = await fs.readdir(notesPath);
  console.log(`Files in ${notesPath}:`);
  files.forEach(f => console.log(`  - ${f}`));

  // 5. Search and suggestions
  console.log(chalk.dim('\n5. Searching and suggestions...'));
  const searchResults = await sdk.searchNotes('graph');
  console.log(`Search result for "graph": ${searchResults.length} notes found`);
  
  const suggestions = await sdk.getSuggestions('Duck');
  console.log('Suggestions for "Duck":');
  suggestions.forEach(s => console.log(`  - ${s.title} (${s.type})`));

  // 6. Path finding
  console.log(chalk.dim('\n6. Path finding...'));
  const pathBetween = await sdk.findPath(note2.id, note3.id, 5);
  if (pathBetween) {
    console.log(`Path from ${note2.title} to ${note3.title}: ${pathBetween.join(' -> ')}`);
  } else {
    // There is no direct link between DuckDB and LevelGraph, they are both linked FROM Overview
    // Let's find neighbors of note1
    const neighbors = await sdk.getNeighbors(note1.id, 1);
    console.log(`Neighbors of "${note1.title}":`);
    neighbors.forEach(n => console.log(`  - ${n.title} (distance ${n.distance})`));
  }

  // 7. Cleanup
  console.log(chalk.dim('\n7. Closing SDK...'));
  await sdk.close();
  console.log(chalk.green('✓ Example completed'));
}
