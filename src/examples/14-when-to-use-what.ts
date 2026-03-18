/**
 * Example 14: Choosing Your Query Interface
 *
 * This example provides side-by-side comparisons of the three
 * query interfaces available in CongraphDB:
 *
 * 1. Cypher Query Language - Industry-standard graph query language
 * 2. JavaScript API (CongraphDBAPI) - Programmatic CRUD operations
 * 3. Navigator API - Fluent graph traversal
 *
 * Each interface has its strengths. This example demonstrates the
 * same operations using all three approaches, helping you choose
 * the right tool for your use case.
 *
 * Decision Matrix:
 * - Simple CRUD → JavaScript API
 * - Multi-hop traversal → Navigator
 * - Complex analytics → Cypher
 * - Type safety → JavaScript API
 * - Migration from Neo4j → Cypher
 * - Migration from LevelGraph → Navigator
 */

import congraphdb, { CongraphDBAPI } from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ChoosingInterface');

// ============================================================
// Helper function to show side-by-side comparisons
// ============================================================
function showComparison(
  title: string,
  cypherQuery: string,
  jsApiCode: string,
  navigatorCode: string
) {
  logger.newline();
  logger.subheader(title);
  logger.newline();

  logger.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  logger.info('Cypher Query Language:');
  logger.code(cypherQuery);
  logger.dim('Best for: Complex queries, analytics, multi-hop patterns');
  logger.newline();

  logger.info('JavaScript API (CongraphDBAPI):');
  logger.code(jsApiCode);
  logger.dim('Best for: Simple CRUD, type safety, IDE support');
  logger.newline();

  if (navigatorCode) {
    logger.info('Navigator API:');
    logger.code(navigatorCode);
    logger.dim('Best for: Fluent traversal, chaining, readability');
  }

  logger.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Choosing Your Query Interface');

  // ============================================================
  // Setup
  // ============================================================
  logger.subheader('Setup');

  const db = await createDatabase({
    path: './data/choosing-interface.cgraph',
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
      age INTEGER,
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

  // Create sample data
  logger.info('Creating sample data...');
  const alice = await api.createNode('Person', { id: 'alice', name: 'Alice', age: 30, city: 'NYC' });
  const bob = await api.createNode('Person', { id: 'bob', name: 'Bob', age: 25, city: 'LA' });
  const charlie = await api.createNode('Person', { id: 'charlie', name: 'Charlie', age: 35, city: 'NYC' });
  const diana = await api.createNode('Person', { id: 'diana', name: 'Diana', age: 28, city: 'Chicago' });

  await api.createEdge(alice._id, 'KNOWS', bob._id, { since: 2020 });
  await api.createEdge(alice._id, 'KNOWS', charlie._id, { since: 2021 });
  await api.createEdge(bob._id, 'KNOWS', diana._id, { since: 2022 });
  await api.createEdge(charlie._id, 'KNOWS', diana._id, { since: 2023 });

  logger.success('✓ Sample data created');

  // ============================================================
  // Comparison 1: Creating a Node
  // ============================================================
  showComparison(
    '1. Creating a Node',
    `// Cypher
await conn.query(\`
  CREATE (p:Person {id: 'eve', name: 'Eve', age: 27, city: 'Boston'})
\`);`,
    `// JavaScript API
const eve = await api.createNode('Person', {
  id: 'eve',
  name: 'Eve',
  age: 27,
  city: 'Boston'
});`,
    `// Navigator
// Not applicable - Navigator is for traversal, not creation`
  );

  // ============================================================
  // Comparison 2: Reading a Node
  // ============================================================
  showComparison(
    '2. Reading a Node by ID',
    `// Cypher
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})
  RETURN p
\`);
const alice = result.getAll()[0];`,
    `// JavaScript API
const alice = await api.getNode(aliceId);
// Direct access, no parsing needed`,
    `// Navigator
// Not applicable - Navigator starts from a node ID`
  );

  // ============================================================
  // Comparison 3: One-Hop Traversal
  // ============================================================
  showComparison(
    '3. One-Hop Traversal (Finding Friends)',
    `// Cypher
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})-[:KNOWS]->(friend:Person)
  RETURN friend
\`);`,
    `// JavaScript API (Pattern Matching)
const friends = await api.find({
  subject: aliceId,
  predicate: 'KNOWS',
  object: api.v('friend')
});`,
    `// Navigator
const friends = await api.nav(aliceId)
  .out('KNOWS')
  .values();`
  );

  // ============================================================
  // Comparison 4: Two-Hop Traversal
  // ============================================================
  showComparison(
    '4. Two-Hop Traversal (Friends of Friends)',
    `// Cypher
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})-[:KNOWS]->(:Person)-[:KNOWS]->(fof:Person)
  RETURN DISTINCT fof
\`);`,
    `// JavaScript API
// Requires chaining multiple find() calls
// More complex for multi-hop
const friends = await api.find({...});
const fofs = [];
for (const f of friends) {
  const results = await api.find({
    subject: f.friend._id,
    predicate: 'KNOWS',
    object: api.v('fof')
  });
  fofs.push(...results);
}`,
    `// Navigator
const fofs = await api.nav(aliceId)
  .out('KNOWS')
  .out('KNOWS')
  .values();`
  );

  // ============================================================
  // Comparison 5: Filtering
  // ============================================================
  showComparison(
    '5. Filtering Results (Friends in NYC)',
    `// Cypher
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})-[:KNOWS]->(friend:Person)
  WHERE friend.city = 'NYC'
  RETURN friend
\`);`,
    `// JavaScript API
const friends = await api.find({
  subject: aliceId,
  predicate: 'KNOWS',
  object: api.v('friend')
}, {
  where: 'friend.city = "NYC"'
});
// Then filter in JavaScript
const nycFriends = friends.filter(f => f.friend?.city === 'NYC');`,
    `// Navigator
const nycFriends = await api.nav(aliceId)
  .out('KNOWS')
  .where('city = "NYC"')
  .values();
// Or with function
const nycFriends = await api.nav(aliceId)
  .out('KNOWS')
  .where(f => f.city === 'NYC')
  .values();`
  );

  // ============================================================
  // Comparison 6: Aggregation
  // ============================================================
  showComparison(
    '6. Aggregation (Counting Friends)',
    `// Cypher
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})-[:KNOWS]->(friend:Person)
  RETURN COUNT(friend) AS friend_count
\`);`,
    `// JavaScript API
const friends = await api.find({...});
const count = friends.length;
// Manual aggregation in JavaScript`,
    `// Navigator
const count = await api.nav(aliceId)
  .out('KNOWS')
  .count();`
  );

  // ============================================================
  // Comparison 7: Updating a Node
  // ============================================================
  showComparison(
    '7. Updating a Node',
    `// Cypher
await conn.query(\`
  MATCH (p:Person {id: 'alice'})
  SET p.age = 31
\`);`,
    `// JavaScript API
const updated = await api.updateNode(aliceId, {
  age: 31
});`,
    `// Navigator
// Not applicable - Navigator is for traversal`
  );

  // ============================================================
  // Comparison 8: Path Finding
  // ============================================================
  showComparison(
    '8. Finding Shortest Path',
    `// Cypher
const result = await conn.query(\`
  MATCH p = shortestPath(
    (a:Person {id: 'alice'})-[:KNOWS*..6]-(b:Person {id: 'diana'})
  )
  RETURN p
\`);`,
    `// JavaScript API
// Not directly supported
// Would need to use api.query() with Cypher
const result = await api.query(\`
  MATCH p = shortestPath(...)
  RETURN p
\`);`,
    `// Navigator
const path = await api.nav(aliceId)
  .out('KNOWS')
  .to(dianaId)
  .values();`
  );

  // ============================================================
  // Comparison 9: Deleting with Relationships
  // ============================================================
  showComparison(
    '9. Deleting a Node (with detach)',
    `// Cypher
await conn.query(\`
  MATCH (p:Person {id: 'eve'})
  DETACH DELETE p
\`);`,
    `// JavaScript API
await api.deleteNode(eveId, true); // detach = true
// Clean and simple`,
    `// Navigator
// Not applicable - Navigator is for traversal`
  );

  // ============================================================
  // Performance Characteristics
  // ============================================================
  logger.subheader('Performance Characteristics');

  logger.newline();
  logger.info('Operation Performance (relative):');
  logger.newline();

  logger.dim('┌────────────────────┬─────────┬──────────┬───────────┐');
  logger.dim('│ Operation          │ Cypher  │ JS API   │ Navigator │');
  logger.dim('├────────────────────┼─────────┼──────────┼───────────┤');
  logger.dim('│ Single CRUD         │ Medium  │ ★ Fast   │ N/A       │');
  logger.dim('│ Multi-hop traversal │ ★ Fast  │ Slow     │ ★ Fast    │');
  logger.dim('│ Complex filtering   │ ★ Fast  │ Medium   │ Fast      │');
  logger.dim('│ Aggregations        │ ★ Fast  │ Slow     │ Medium    │');
  logger.dim('│ Type safety         │ Low     │ ★ High   │ High      │');
  logger.dim('│ Learning curve      │ Medium  │ ★ Low    │ Low       │');
  logger.dim('└────────────────────┴─────────┴──────────┴───────────┘');

  // ============================================================
  // Decision Tree
  // ============================================================
  logger.subheader('Decision Tree: Which Interface to Use?');

  logger.newline();
  logger.info('Ask yourself these questions:');
  logger.newline();

  logger.dim('Q: What type of operation are you doing?');
  logger.newline();
  logger.dim('  → Simple CRUD (create, read, update, delete)');
  logger.dim('     USE: JavaScript API (CongraphDBAPI)');
  logger.newline();
  logger.dim('  → Multi-hop graph traversal');
  logger.dim('     USE: Navigator API');
  logger.newline();
  logger.dim('  → Complex analytics, aggregations');
  logger.dim('     USE: Cypher');
  logger.newline();

  logger.dim('Q: What are your priorities?');
  logger.newline();
  logger.dim('  → Type safety and IDE autocomplete');
  logger.dim('     USE: JavaScript API');
  logger.newline();
  logger.dim('  → Code readability and chaining');
  logger.dim('     USE: Navigator');
  logger.newline();
  logger.dim('  → Industry standard, portability');
  logger.dim('     USE: Cypher');
  logger.newline();

  logger.dim('Q: What is your background?');
  logger.newline();
  logger.dim('  → Coming from Neo4j');
  logger.dim('     USE: Cypher (same language)');
  logger.newline();
  logger.dim('  → Coming from LevelGraph');
  logger.dim('     USE: Navigator (compatible API)');
  logger.newline();
  logger.dim('  → New to graph databases');
  logger.dim('     USE: JavaScript API (most familiar)');
  logger.newline();

  // ============================================================
  // Mixing Interfaces
  // ============================================================
  logger.subheader('Mixing Interfaces');

  logger.info('You can use all three interfaces together!');
  logger.newline();
  logger.code(`
// Use JavaScript API for setup
const api = new CongraphDBAPI(db);
const alice = await api.createNode('Person', {...});

// Use Navigator for traversal
const friends = await api.nav(alice._id).out('KNOWS').values();

// Use Cypher for complex analytics
const analytics = await api.query(\`
  MATCH (p:Person)-[:KNOWS]->(f:Person)
  RETURN p.city, COUNT(f) AS friend_count
\`);
  `);

  logger.newline();
  logger.info('Key insight: Each interface has its strength');
  logger.dim('  • Use JavaScript API for data manipulation');
  logger.dim('  • Use Navigator for graph traversal');
  logger.dim('  • Use Cypher for complex queries and analytics');
  logger.newline();

  // ============================================================
  // Summary Table
  // ============================================================
  logger.subheader('Summary Comparison Table');

  logger.newline();
  logger.dim('┌─────────────────────┬────────┬────────┬──────────┐');
  logger.dim('│ Feature             │ Cypher │ JS API │ Navigator │');
  logger.dim('├─────────────────────┼────────┼────────┼──────────┤');
  logger.dim('│ CRUD Operations      │   ✓    │   ✓★  │    ✗     │');
  logger.dim('│ Single-hop Queries   │   ✓    │   ✓    │    ✓★    │');
  logger.dim('│ Multi-hop Traversal  │   ✓★   │   ✗   │    ✓★    │');
  logger.dim('│ Path Finding         │   ✓★   │   ✗   │    ✓★    │');
  logger.dim('│ Aggregations         │   ✓★   │   ✗   │    ✗     │');
  logger.dim('│ Pattern Matching     │   ✓★   │   ✓    │    ✓     │');
  logger.dim('│ Filtering            │   ✓★   │   ✓    │    ✓★    │');
  logger.dim('│ Type Safety          │   ✗   │   ✓★  │    ✓     │');
  logger.dim('│ IDE Support          │   Low  │  ★High │   High   │');
  logger.dim('│ Learning Curve       │ Medium │   Low  │   Low    │');
  logger.dim('│ Portability          │  ★High │   Low  │   Low    │');
  logger.dim('│ Transaction Support  │   ✓★   │   ✓★  │    N/A   │');
  logger.dim('└─────────────────────┴────────┴────────┴──────────┘');
  logger.dim('★ = Best in class');
  logger.newline();

  // ============================================================
  // Recommendations by Use Case
  // ============================================================
  logger.subheader('Recommendations by Use Case');

  logger.newline();
  logger.info('Web Applications:');
  logger.dim('  • JavaScript API for backend CRUD');
  logger.dim('  • Navigator for social features');
  logger.newline();

  logger.info('Analytics & Reporting:');
  logger.dim('  • Cypher for complex aggregations');
  logger.dim('  • Navigator for graph exploration');
  logger.newline();

  logger.info('Real-time Applications:');
  logger.dim('  • JavaScript API for speed');
  logger.dim('  • Navigator for traversal');
  logger.newline();

  logger.info('Data Migration:');
  logger.dim('  • From Neo4j: Use Cypher');
  logger.dim('  • From LevelGraph: Use Navigator');
  logger.newline();

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await api.close();
  await db.close();
  logger.success('✓ API and database closed');

  logger.header('Choosing Your Interface - Guide Completed!');
  logger.newline();
  logger.info('Key Takeaway:');
  logger.dim('  There is no "best" interface - use the right tool for the job.');
  logger.newline();
  logger.info('Next Steps:');
  logger.dim('  • Example 10: JavaScript API Basics');
  logger.dim('  • Example 11: Advanced CRUD');
  logger.dim('  • Example 12: Navigator Traversal');
  logger.dim('  • Example 13: Pattern Matching');
}
