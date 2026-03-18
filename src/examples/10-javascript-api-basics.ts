/**
 * Example 10: JavaScript API Basics
 *
 * This example introduces the CongraphDB JavaScript Native API,
 * a programmatic alternative to Cypher for developers who prefer
 * method calls over query strings.
 *
 * The JavaScript API provides:
 * - CongraphDBAPI: Main class for all graph operations
 * - NodeAPI: CRUD operations for nodes
 * - EdgeAPI: CRUD operations for edges/relationships
 * - Navigator: Fluent traversal API (LevelGraph-compatible)
 *
 * When to use JavaScript API vs Cypher:
 * - Simple CRUD operations → JavaScript API (faster to write)
 * - Complex analytics → Cypher (more expressive)
 * - Type safety → JavaScript API (better IDE support)
 * - Graph traversal → Navigator (cleaner syntax)
 *
 * This example covers:
 * - Initializing CongraphDBAPI
 * - Creating nodes with createNode()
 * - Creating edges with createEdge()
 * - Finding nodes with getNode()
 * - Basic pattern matching with find()
 */

import congraphdb, { CongraphDBAPI } from '@congraph-ai/congraphdb';
import { createDatabase } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('JavaScriptAPI');

/**
 * Helper to demonstrate both Cypher and JavaScript API approaches
 */
function showComparison(cypherExample: string, jsExample: string) {
  logger.newline();
  logger.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.dim('Cypher Approach:');
  logger.code(cypherExample);
  logger.newline();
  logger.dim('JavaScript API Approach:');
  logger.code(jsExample);
  logger.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB JavaScript API - Basics');

  // ============================================================
  // STEP 1: Initialize the JavaScript API
  // ============================================================
  logger.subheader('Step 1: Initializing the JavaScript API');

  logger.info('Creating database and initializing CongraphDBAPI...');
  const db = await createDatabase({
    path: './data/js-api-basics.cgraph',
    inMemory: false,
  });

  // Initialize the JavaScript API
  // The CongraphDBAPI wraps the Database for easier operations
  const api = new CongraphDBAPI(db);
  logger.success('✓ CongraphDBAPI initialized');

  // Get a connection for schema setup (still uses Cypher for DDL)
  const conn = db.createConnection();

  // ============================================================
  // STEP 2: Define Schema (using Cypher - Data Definition Language)
  // ============================================================
  logger.subheader('Step 2: Defining Schema');
  logger.info('Note: Schema definition still uses Cypher (CREATE NODE TABLE)');

  logger.info('Creating Person node table...');
  await conn.query(`
    CREATE NODE TABLE Person (
      id STRING,
      name STRING,
      email STRING,
      age INTEGER,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE KNOWS (
      FROM Person TO Person,
      since INTEGER
    )
  `);
  logger.success('✓ Schema created');

  // ============================================================
  // STEP 3: Create Nodes with JavaScript API
  // ============================================================
  logger.subheader('Step 3: Creating Nodes (JavaScript API)');

  showComparison(
    `// Cypher: Create a node
await conn.query(\`
  CREATE (p:Person {id: 'alice', name: 'Alice', age: 30})
\`)`,
    `// JavaScript API: Create a node
const alice = await api.createNode('Person', {
  id: 'alice',
  name: 'Alice',
  age: 30
});`
  );

  logger.info('Creating people with JavaScript API...');
  const alice = await api.createNode('Person', {
    id: 'alice',
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
  });
  logger.data('Created node:', alice);

  const bob = await api.createNode('Person', {
    id: 'bob',
    name: 'Bob',
    email: 'bob@example.com',
    age: 25,
  });
  logger.data('Created node:', bob);

  const charlie = await api.createNode('Person', {
    id: 'charlie',
    name: 'Charlie',
    email: 'charlie@example.com',
    age: 35,
  });

  const diana = await api.createNode('Person', {
    id: 'diana',
    name: 'Diana',
    email: 'diana@example.com',
    age: 28,
  });
  logger.success('✓ Created 4 Person nodes');

  // ============================================================
  // STEP 4: Create Edges with JavaScript API
  // ============================================================
  logger.subheader('Step 4: Creating Edges (JavaScript API)');

  showComparison(
    `// Cypher: Create a relationship
await conn.query(\`
  MATCH (a:Person {id: 'alice'}), (b:Person {id: 'bob'})
  CREATE (a)-[:KNOWS {since: 2020}]->(b)
\`)`,
    `// JavaScript API: Create an edge
await api.createEdge(
  alice._id,      // from node
  'KNOWS',        // relationship type
  bob._id,        // to node
  { since: 2020 } // edge properties
);`
  );

  logger.info('Creating KNOWS relationships...');
  await api.createEdge(alice._id, 'KNOWS', bob._id, { since: 2020 });
  await api.createEdge(alice._id, 'KNOWS', charlie._id, { since: 2021 });
  await api.createEdge(bob._id, 'KNOWS', diana._id, { since: 2022 });
  await api.createEdge(charlie._id, 'KNOWS', diana._id, { since: 2023 });
  logger.success('✓ Created 4 KNOWS relationships');

  // ============================================================
  // STEP 5: Retrieve Nodes with JavaScript API
  // ============================================================
  logger.subheader('Step 5: Retrieving Nodes');

  showComparison(
    `// Cypher: Get a node
const result = await conn.query(\`
  MATCH (p:Person {id: 'alice'})
  RETURN p
\`);`,
    `// JavaScript API: Get a node
const alice = await api.getNode(alice._id);`
  );

  logger.info('Getting Alice by ID...');
  const retrievedAlice = await api.getNode(alice._id);
  logger.data('Retrieved node:', retrievedAlice);

  logger.info('Getting all nodes by label...');
  const allPeople = await api.getNodesByLabel('Person');
  logger.result(allPeople.length, 'people retrieved');
  logger.data('All people:', allPeople.map((p: any) => ({ name: p.name, age: p.age })));

  // ============================================================
  // STEP 6: Basic Pattern Matching with JavaScript API
  // ============================================================
  logger.subheader('Step 6: Pattern Matching');

  logger.info('Finding Alice\'s friends using pattern matching...');
  logger.info('The find() method uses patterns similar to graph triple stores');

  // Pattern matching: subject → predicate → object
  const friends = await api.find({
    subject: alice._id,
    predicate: 'KNOWS',
    object: api.v('friend'), // v() creates a variable for the result
  });

  logger.result(friends.length, 'friends found');
  for (const friend of friends) {
    logger.data('Friend:', { name: friend.friend?.name, age: friend.friend?.age });
  }

  // ============================================================
  // STEP 7: Update Operations
  // ============================================================
  logger.subheader('Step 7: Updating Nodes');

  showComparison(
    `// Cypher: Update a node
await conn.query(\`
  MATCH (p:Person {id: 'alice'})
  SET p.age = 31
\`)`,
    `// JavaScript API: Update a node
await api.updateNode(alice._id, { age: 31 });`
  );

  logger.info("Updating Alice's age to 31...");
  const updatedAlice = await api.updateNode(alice._id, { age: 31 });
  logger.data('Updated node:', updatedAlice);

  // ============================================================
  // STEP 8: Combining with Raw Cypher Queries
  // ============================================================
  logger.subheader('Step 8: Using Raw Cypher When Needed');

  logger.info('Sometimes Cypher is more expressive...');
  logger.info('The JavaScript API also exposes query() for raw Cypher:');

  // For complex analytics, Cypher is often more concise
  const complexQuery = `
    MATCH (p:Person)-[k:KNOWS]->(friend:Person)
    RETURN p.name AS person, friend.name AS friend, k.since
    ORDER BY p.name, friend.name
  `;

  logger.code(`const result = await api.query(\`${complexQuery.trim()}\`);`);

  const connections = await api.query(complexQuery);
  const connectionRows = await connections.getAll();

  logger.newline();
  logger.info('All KNOWS relationships:');
  for (const row of connectionRows) {
    logger.data('Connection:', row);
  }

  // ============================================================
  // STEP 9: Transaction Support
  // ============================================================
  logger.subheader('Step 9: Transactions with JavaScript API');

  logger.info('The JavaScript API provides a transaction helper:');

  try {
    await api.transaction(async (txApi: any) => {
      // All operations within this function run in a transaction
      const eve = await txApi.createNode('Person', {
        id: 'eve',
        name: 'Eve',
        email: 'eve@example.com',
        age: 27,
      });

      await txApi.createEdge(alice._id, 'KNOWS', eve._id, { since: 2024 });

      logger.info('Transaction committed: Eve added and connected to Alice');
    });
  } catch (error) {
    logger.error('Transaction failed and was rolled back');
  }

  // ============================================================
  // Summary and Benefits
  // ============================================================
  logger.subheader('JavaScript API Benefits');

  logger.info('When to use the JavaScript API:');
  logger.newline();
  logger.dim('  ✓ Simple CRUD operations');
  logger.dim('  ✓ Application-specific data access');
  logger.dim('  ✓ Type safety with TypeScript');
  logger.dim('  ✓ IDE autocomplete support');
  logger.dim('  ✓ Programmatic query building');
  logger.newline();

  logger.info('When to use Cypher:');
  logger.newline();
  logger.dim('  ✓ Complex graph traversals');
  logger.dim('  ✓ Analytics and aggregations');
  logger.dim('  ✓ Multi-hop queries');
  logger.dim('  ✓ Migration from Neo4j');
  logger.newline();

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await api.close();
  await db.close();
  logger.success('✓ API and database closed');

  logger.header('JavaScript API Basics Completed!');
  logger.info('Next: Example 11 - Advanced CRUD operations');
}
