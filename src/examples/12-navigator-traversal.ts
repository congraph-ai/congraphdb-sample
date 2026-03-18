/**
 * Example 12: Navigator API - Fluent Graph Traversal
 *
 * This example demonstrates the Navigator API, a fluent interface
 * for graph traversal that's compatible with LevelDB's LevelGraph.
 *
 * The Navigator API provides:
 * - Fluent chaining for multi-hop traversals
 * - Direction control: out(), in(), both()
 * - Filtering: where(), limit()
 * - Path finding with .to() for shortest path
 * - Async iteration with for await...of
 * - LevelGraph compatibility: archOut(), archIn(), solutions()
 *
 * When to use Navigator:
 * - Multi-hop graph traversals (friends of friends)
 * - Path exploration with filtering
 * - When you prefer fluent chaining over query strings
 * - Migrating from LevelGraph
 *
 * Covered in this example:
 * - Basic traversal with .out() and .in()
 * - Multi-hop traversals
 * - Filtering with .where() and .limit()
 * - Path finding with .to()
 * - Bidirectional traversal with .both()
 * - Async iteration
 */

import congraphdb, { CongraphDBAPI } from '@congraph-ai/congraphdb';
import { createDatabase } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Navigator');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Navigator API - Fluent Graph Traversal');

  // ============================================================
  // Setup
  // ============================================================
  logger.subheader('Setup');

  const db = await createDatabase({
    path: './data/navigator-traversal.cgraph',
    inMemory: false,
  });

  const api = new CongraphDBAPI(db);
  const conn = db.createConnection();

  // Define schema
  logger.info('Creating schema...');
  await conn.query(`
    CREATE NODE TABLE Person (
      id STRING,
      name STRING,
      city STRING,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE KNOWS (
      FROM Person TO Person,
      since INTEGER
    )
  `);

  await conn.query(`
    CREATE REL TABLE LIVES_IN (
      FROM Person TO Person,
      movedAt INTEGER
    )
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create a Social Graph
  // ============================================================
  logger.subheader('Creating Social Graph');

  logger.info('Creating people...');
  const people = await Promise.all([
    api.createNode('Person', { id: 'alice', name: 'Alice', city: 'NYC' }),
    api.createNode('Person', { id: 'bob', name: 'Bob', city: 'LA' }),
    api.createNode('Person', { id: 'charlie', name: 'Charlie', city: 'NYC' }),
    api.createNode('Person', { id: 'diana', name: 'Diana', city: 'Chicago' }),
    api.createNode('Person', { id: 'eve', name: 'Eve', city: 'NYC' }),
    api.createNode('Person', { id: 'frank', name: 'Frank', city: 'LA' }),
    api.createNode('Person', { id: 'grace', name: 'Grace', city: 'Chicago' }),
    api.createNode('Person', { id: 'henry', name: 'Henry', city: 'NYC' }),
  ]);
  logger.result(people.length, 'people created');

  // Create KNOWS relationships
  logger.info('Creating KNOWS relationships...');
  const knows = [
    ['alice', 'bob'],
    ['alice', 'charlie'],
    ['alice', 'diana'],
    ['bob', 'diana'],
    ['bob', 'frank'],
    ['charlie', 'eve'],
    ['charlie', 'grace'],
    ['diana', 'eve'],
    ['diana', 'grace'],
    ['eve', 'henry'],
    ['frank', 'grace'],
    ['grace', 'henry'],
  ];

  const peopleMap = new Map(people.map((p: any) => [p.id, p._id]));
  for (const [from, to] of knows) {
    await api.createEdge(peopleMap.get(from)!, 'KNOWS', peopleMap.get(to)!, { since: 2020 });
  }
  logger.result(knows.length, 'KNOWS relationships');

  // ============================================================
  // Basic Traversal: One-Hop (out)
  // ============================================================
  logger.subheader('Basic Traversal: One-Hop');

  const alice = people[0];

  logger.info('Finding Alice\'s friends using Navigator...');
  logger.code(`
const friends = await api.nav(alice._id)
  .out('KNOWS')
  .values();
  `);

  const friends = await api.nav(alice._id).out('KNOWS').values();
  logger.result(friends.length, 'friends found');
  for (const friend of friends) {
    logger.data('Friend:', { name: friend.name, city: friend.city });
  }

  // ============================================================
  // Incoming Traversal: Who Knows Alice? (in)
  // ============================================================
  logger.subheader('Incoming Traversal: in()');

  logger.info('Finding who knows Alice (reverse traversal)...');
  logger.code(`
const followers = await api.nav(alice._id)
  .in('KNOWS')
  .values();
  `);

  const followers = await api.nav(alice._id).in('KNOWS').values();
  logger.result(followers.length, 'followers found');

  // ============================================================
  // Multi-Hop Traversal: Friends of Friends
  // ============================================================
  logger.subheader('Multi-Hop Traversal: Friends of Friends');

  logger.info('Finding friends of friends (2-hop)...');
  logger.code(`
const friendsOfFriends = await api.nav(alice._id)
  .out('KNOWS')
  .out('KNOWS')
  .values();
  `);

  const friendsOfFriends = await api.nav(alice._id)
    .out('KNOWS')
    .out('KNOWS')
    .values();

  logger.result(friendsOfFriends.length, 'friends of friends found');
  logger.info('Note: This includes the original friends (1-hop) as well');
  for (const fof of friendsOfFriends) {
    logger.data('FOF:', { name: fof.name, city: fof.city });
  }

  // ============================================================
  // Comparison with Cypher
  // ============================================================
  logger.subheader('Comparison: Navigator vs Cypher');

  logger.newline();
  logger.dim('Cypher approach:');
  logger.code(`
MATCH (me:Person {id: 'alice'})-[:KNOWS]->(:Person)-[:KNOWS]->(fof:Person)
RETURN fof
  `);

  logger.newline();
  logger.dim('Navigator approach:');
  logger.code(`
const fof = await api.nav(aliceId)
  .out('KNOWS')
  .out('KNOWS')
  .values();
  `);

  // ============================================================
  // Three-Hop Traversal
  // ============================================================
  logger.subheader('Three-Hop Traversal');

  logger.info('Finding people 3 hops away from Alice...');
  const threeHop = await api.nav(alice._id)
    .out('KNOWS')
    .out('KNOWS')
    .out('KNOWS')
    .values();

  logger.result(threeHop.length, 'people found at 3 hops');
  for (const person of threeHop) {
    logger.data('3-hop:', { name: person.name });
  }

  // ============================================================
  // Filtering with where()
  // ============================================================
  logger.subheader('Filtering with where()');

  logger.info('Finding friends who live in NYC...');
  logger.code(`
const nycFriends = await api.nav(alice._id)
  .out('KNOWS')
  .where('city = "NYC"')
  .values();
  `);

  const nycFriends = await api.nav(alice._id)
    .out('KNOWS')
    .where('city = "NYC"')
    .values();

  logger.result(nycFriends.length, 'friends in NYC');
  for (const friend of nycFriends) {
    logger.data('NYC Friend:', { name: friend.name });
  }

  // ============================================================
  // Function-based Filtering
  // ============================================================
  logger.subheader('Function-based Filtering');

  logger.info('Filtering using JavaScript functions...');
  logger.code(`
const youngFriends = await api.nav(alice._id)
  .out('KNOWS')
  .where(f => f.age < 30)
  .values();
  `);

  const filtered = await api.nav(alice._id)
    .out('KNOWS')
    .where((f: any) => f.city === 'Chicago')
    .values();

  logger.result(filtered.length, 'friends in Chicago');
  for (const friend of filtered) {
    logger.data('Chicago Friend:', { name: friend.name });
  }

  // ============================================================
  // Limiting Results
  // ============================================================
  logger.subheader('Limiting Results');

  logger.info('Getting only the first 2 friends...');
  logger.code(`
const firstTwo = await api.nav(alice._id)
  .out('KNOWS')
  .limit(2)
  .values();
  `);

  const firstTwo = await api.nav(alice._id)
    .out('KNOWS')
    .limit(2)
    .values();

  logger.result(firstTwo.length, 'friends (limited)');
  for (const friend of firstTwo) {
    logger.data('Friend:', { name: friend.name });
  }

  // ============================================================
  // Counting Results
  // ============================================================
  logger.subheader('Counting Results');

  logger.info('Counting friends without retrieving all data...');
  logger.code(`
const count = await api.nav(alice._id)
  .out('KNOWS')
  .count();
  `);

  const friendCount = await api.nav(alice._id)
    .out('KNOWS')
    .count();

  logger.result(friendCount, 'total friends');

  // ============================================================
  // Bidirectional Traversal
  // ============================================================
  logger.subheader('Bidirectional Traversal: both()');

  logger.info('Finding all people connected (in either direction)...');
  logger.code(`
const connections = await api.nav(alice._id)
  .both('KNOWS')
  .values();
  `);

  const connections = await api.nav(alice._id)
    .both('KNOWS')
    .values();

  logger.result(connections.length, 'connections (in + out)');

  // ============================================================
  // Path Finding with .to()
  // ============================================================
  logger.subheader('Path Finding: Finding Shortest Path');

  const bob = people[1];
  const henry = people[7];

  logger.info(`Finding shortest path from Bob to Henry...`);
  logger.code(`
const path = await api.nav(bob._id)
  .out('KNOWS')
  .to(henry._id)
  .values();
  `);

  const path = await api.nav(bob._id)
    .out('KNOWS')
    .to(henry._id)
    .values();

  if (path && path.length > 0) {
    logger.result(path.length, 'nodes in shortest path');
    logger.info('Path: ' + path.map((p: any) => p.name).join(' → '));
  } else {
    logger.info('No path found');
  }

  // ============================================================
  // Getting Paths Instead of Values
  // ============================================================
  logger.subheader('Getting Full Paths');

  logger.info('Getting paths instead of just end nodes...');
  logger.code(`
const paths = await api.nav(alice._id)
  .out('KNOWS')
  .out('KNOWS')
  .paths();
  `);

  const paths = await api.nav(alice._id)
    .out('KNOWS')
    .out('KNOWS')
    .paths();

  logger.result(paths.length, 'paths found');
  if (paths.length > 0) {
    logger.data('Sample path:', paths[0]);
  }

  // ============================================================
  // Async Iteration
  // ============================================================
  logger.subheader('Async Iteration');

  logger.info('Iterating over results with for await...of');
  logger.code(`
for await (const friend of api.nav(alice._id).out('KNOWS')) {
  console.log(friend.name);
}
  `);

  logger.info('Iterating over Alice\'s friends:');
  let iterCount = 0;
  for await (const friend of api.nav(alice._id).out('KNOWS')) {
    iterCount++;
    logger.data(`Friend ${iterCount}:`, { name: friend.name });
  }

  // ============================================================
  // LevelGraph Compatibility
  // ============================================================
  logger.subheader('LevelGraph Compatibility');

  logger.info('The Navigator API is compatible with LevelGraph patterns');
  logger.code(`
// LevelGraph-style methods are available
const solutions = await api.nav(alice._id)
  .archOut('KNOWS')  // Alias for out()
  .solutions();      // Alias for values()
  `);

  // ============================================================
  // Synchronous Methods
  // ============================================================
  logger.subheader('Synchronous Methods');

  logger.info('Navigator also has synchronous variants...');
  logger.code(`
const syncResults = api.nav(alice._id)
  .out('KNOWS')
  .valuesSync();
  `);

  const syncResults = api.nav(alice._id)
    .out('KNOWS')
    .valuesSync();

  logger.result(syncResults.length, 'results (synchronous)');

  // ============================================================
  // Complex Traversal Example
  // ============================================================
  logger.subheader('Complex Traversal: Social Network Analysis');

  logger.info('Finding: People in cities where my friends live...');
  logger.code(`
// Friends of friends in cities my friends live in
const results = await api.nav(alice._id)
  .out('KNOWS')           // My friends
  .out('KNOWS')           // Friends of my friends
  .where(f => {
    const friendCities = ['NYC', 'LA'];  // Cities my friends live in
    return friendCities.includes(f.city);
  })
  .limit(5)
  .values();
  `);

  const complex = await api.nav(alice._id)
    .out('KNOWS')           // Alice's friends
    .out('KNOWS')           // Friends of friends
    .where((f: any) => ['NYC', 'LA'].includes(f.city))
    .limit(5)
    .values();

  logger.result(complex.length, 'friends of friends in NYC/LA');

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Navigator API Summary');

  logger.info('Navigator Methods:');
  logger.newline();
  logger.dim('Direction:');
  logger.dim('  .out(type)   - Traverse outgoing relationships');
  logger.dim('  .in(type)    - Traverse incoming relationships');
  logger.dim('  .both(type)  - Traverse both directions');
  logger.newline();
  logger.dim('Filtering:');
  logger.dim('  .where(cond) - Filter by condition (string or function)');
  logger.dim('  .limit(n)    - Limit results');
  logger.newline();
  logger.dim('Path Finding:');
  logger.dim('  .to(targetId) - Find shortest path to target');
  logger.newline();
  logger.dim('Results:');
  logger.dim('  .values()  - Get matching nodes');
  logger.dim('  .paths()   - Get full paths');
  logger.dim('  .count()   - Count matches');
  logger.newline();
  logger.dim('Iteration:');
  logger.dim('  for await...of - Async iteration');
  logger.newline();
  logger.dim('Sync variants:');
  logger.dim('  .valuesSync()  - Synchronous values()');
  logger.dim('  .pathsSync()   - Synchronous paths()');
  logger.dim('  .countSync()   - Synchronous count()');
  logger.newline();
  logger.dim('LevelGraph compatibility:');
  logger.dim('  .archOut() / .archIn() - Aliases for out()/in()');
  logger.dim('  .solutions()        - Alias for values()');
  logger.newline();

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await api.close();
  await db.close();
  logger.success('✓ API and database closed');

  logger.header('Navigator Traversal Completed!');
  logger.info('Next: Example 13 - Pattern matching');
}
