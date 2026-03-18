/**
 * Example 01: Basic CRUD Operations
 *
 * This example demonstrates the fundamental operations in CongraphDB:
 * - Creating/opening a database
 * - Creating nodes with CREATE
 * - Querying with MATCH
 * - Updating data with SET
 * - Deleting with DETACH DELETE
 *
 * Run this example to understand the core concepts before moving on to
 * more complex examples.
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Basics');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Basics: CRUD Operations');

  // ============================================================
  // STEP 1: Create/Open Database
  // ============================================================
  logger.subheader('Step 1: Creating Database');
  logger.info('Opening database at ./data/basics.cgraph');

  const db = await createDatabase({
    path: './data/basics.cgraph',
    inMemory: false,
  });

  logger.success('✓ Database opened successfully');

  const conn = db.createConnection();

  // ============================================================
  // STEP 2: Create Schema
  // ============================================================
  logger.subheader('Step 2: Creating Schema');

  logger.info('Creating Person node table...');
  await conn.query(`
    CREATE NODE TABLE Person (
      name STRING,
      age INT64,
      email STRING,
      PRIMARY KEY (name)
    )
  `);
  logger.success('✓ Person table created');

  logger.info('Creating KNOWS relationship table...');
  await conn.query(`
    CREATE REL TABLE KNOWS (
      FROM Person TO Person
    )
  `);
  logger.success('✓ KNOWS relationship table created');

  // ============================================================
  // STEP 3: Create Nodes (CREATE)
  // ============================================================
  logger.subheader('Step 3: Creating Nodes');

  logger.info('Creating people...');
  await conn.query("CREATE (p:Person {name: 'Alice', age: 30, email: 'alice@example.com'})");
  await conn.query("CREATE (p:Person {name: 'Bob', age: 25, email: 'bob@example.com'})");
  await conn.query("CREATE (p:Person {name: 'Charlie', age: 35, email: 'charlie@example.com'})");
  await conn.query("CREATE (p:Person {name: 'Diana', age: 28, email: 'diana@example.com'})");
  logger.success('✓ Created 4 Person nodes');

  // ============================================================
  // STEP 4: Create Relationships
  // ============================================================
  logger.subheader('Step 4: Creating Relationships');

  logger.info('Creating KNOWS relationships...');
  // Use CREATE with full node specification (CongraphDB limitation: MATCH+CREATE not supported)
  await conn.query("CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})");
  await conn.query("CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Charlie'})");
  await conn.query("CREATE (a:Person {name: 'Bob'})-[:KNOWS]->(b:Person {name: 'Diana'})");
  logger.success('✓ Created 3 KNOWS relationships');

  // ============================================================
  // STEP 5: Query Data (MATCH & RETURN)
  // ============================================================
  logger.subheader('Step 5: Querying Data');

  logger.info('Find all people:');
  const allPeople = await executeQuery(conn, "MATCH (p:Person) RETURN p.name, p.age, p.email ORDER BY p.name");
  printResults(allPeople);
  logger.result(allPeople.length, 'people');

  logger.newline();
  logger.info("Find people Alice knows (1-hop):");
  const alicesFriends = await executeQuery(conn, "MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(friend:Person) RETURN friend.name, friend.age");
  printResults(alicesFriends);
  logger.result(alicesFriends.length, 'friends');

  // ============================================================
  // STEP 6: Update Data (SET)
  // ============================================================
  logger.subheader('Step 6: Updating Data');

  logger.info("Updating Bob's age to 26...");
  await conn.query("MATCH (p:Person {name: 'Bob'}) SET p.age = 26");
  logger.success("✓ Bob's age updated");

  logger.newline();
  logger.info('Verifying update:');
  const updatedBob = await executeQuery(conn, "MATCH (p:Person {name: 'Bob'}) RETURN p.name, p.age");
  printResults(updatedBob);

  // ============================================================
  // STEP 7: Delete Data (DETACH DELETE)
  // ============================================================
  logger.subheader('Step 7: Deleting Data');

  logger.info("Deleting Charlie and all his relationships...");
  await conn.query("MATCH (p:Person {name: 'Charlie'}) DETACH DELETE p");
  logger.success('✓ Charlie deleted (DETACH DELETE removes node and relationships)');

  logger.newline();
  logger.info('Remaining people:');
  const remainingPeople = await executeQuery(conn, "MATCH (p:Person) RETURN p.name, p.age");
  printResults(remainingPeople);
  logger.result(remainingPeople.length, 'people remaining');

  // ============================================================
  // STEP 8: Pattern Matching
  // ============================================================
  logger.subheader('Step 8: Pattern Matching');

  logger.info('Find all KNOWS relationships:');
  const relationships = await executeQuery(conn, "MATCH (a:Person)-[k:KNOWS]->(b:Person) RETURN a.name AS from, b.name AS to");
  printResults(relationships);

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Example Completed!');
  logger.info('You now understand the basics of CongraphDB CRUD operations.');
}
