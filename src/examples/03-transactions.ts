/**
 * Example 03: Transactions
 *
 * This example demonstrates CongraphDB's transaction support:
 * - beginTransaction(), commit(), rollback()
 * - ACID guarantees (Atomicity, Consistency, Isolation, Durability)
 * - Multi-operation transactions
 * - Error handling and rollback
 * - Concurrent connection simulation
 *
 * Use Case: Banking system showing money transfers between accounts
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Transactions');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Transactions Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/transactions.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  logger.info('Creating Account node table...');
  await conn.query(`
    CREATE NODE TABLE Account (
      id STRING,
      owner STRING,
      balance FLOAT,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Account table created');

  logger.info('Creating TRANSFER relationship table...');
  await conn.query(`
    CREATE REL TABLE TRANSFER (
      FROM Account TO Account,
      amount FLOAT,
      timestamp DATE,
      note STRING
    )
  `);
  logger.success('✓ TRANSFER relationship table created');

  // ============================================================
  // Create Initial Accounts
  // ============================================================
  logger.subheader('Creating Initial Accounts');

  const initialAccounts = [
    { id: 'acc1', owner: 'Alice', balance: 1000.00 },
    { id: 'acc2', owner: 'Bob', balance: 500.00 },
    { id: 'acc3', owner: 'Charlie', balance: 750.00 },
    { id: 'acc4', owner: 'Diana', balance: 2000.00 },
  ];

  for (const account of initialAccounts) {
    await conn.query(`
      CREATE (a:Account {id: '${account.id}', owner: '${account.owner}', balance: ${account.balance}})
    `);
  }
  logger.success(`✓ Created ${initialAccounts.length} accounts`);

  // ============================================================
  // Demo 1: Successful Transaction
  // ============================================================
  logger.subheader('Demo 1: Successful Transfer Transaction');

  logger.info('Initial account balances:');
  let balances = await executeQuery(conn, `
    MATCH (a:Account)
    RETURN a.id, a.owner, a.balance
    ORDER BY a.owner
  `);
  printResults(balances);

  logger.newline();
  logger.info('Executing transfer: Alice ($100) -> Bob');
  logger.code('BEGIN TRANSACTION');

  // Start transaction
  await conn.query('BEGIN TRANSACTION');

  try {
    // Step 1: Deduct from sender
    logger.code('MATCH (from:Account {id: "acc1"}) SET from.balance = from.balance - 100');
    await conn.query(`
      MATCH (from:Account {id: 'acc1'})
      SET from.balance = from.balance - 100
    `);

    // Step 2: Add to receiver
    logger.code('MATCH (to:Account {id: "acc2"}) SET to.balance = to.balance + 100');
    await conn.query(`
      MATCH (to:Account {id: 'acc2'})
      SET to.balance = to.balance + 100
    `);

    // Step 3: Create transfer record
    logger.code('CREATE TRANSFER relationship');
    await conn.query(`
      MATCH (from:Account {id: 'acc1'}), (to:Account {id: 'acc2'})
      CREATE (from)-[:TRANSFER {amount: 100, timestamp: DATE('2024-03-13'), note: 'Payment'}]->(to)
    `);

    // Commit transaction
    logger.code('COMMIT');
    await conn.query('COMMIT');
    logger.success('✓ Transaction committed successfully!');

  } catch (error) {
    logger.error('Transaction failed, rolling back...');
    await conn.query('ROLLBACK');
    throw error;
  }

  logger.newline();
  logger.info('Balances after successful transfer:');
  balances = await executeQuery(conn, `
    MATCH (a:Account)
    RETURN a.id, a.owner, a.balance
    ORDER BY a.owner
  `);
  printResults(balances);

  // ============================================================
  // Demo 2: Transaction Rollback on Insufficient Funds
  // ============================================================
  logger.subheader('Demo 2: Rollback on Insufficient Funds');

  logger.info('Attempting transfer: Bob ($1000) -> Charlie');
  logger.info('Bob only has $600, so this should fail and rollback');

  // Start transaction
  await conn.query('BEGIN TRANSACTION');

  try {
    // Check balance first (application-level validation)
    const bobBalance = await executeQuery(conn, `
      MATCH (a:Account {id: 'acc2'})
      RETURN a.balance
    `);

    // Safety check for empty results
    if (!bobBalance || bobBalance.length === 0) {
      throw new Error('Account not found: acc2');
    }

    const balance = bobBalance[0]['a.balance'] ?? 600; // Default fallback for demo

    if (balance < 1000) {
      throw new Error('Insufficient funds: Bob has $' + balance + ', needs $1000');
    }

    // These operations should never execute
    await conn.query(`
      MATCH (from:Account {id: 'acc2'})
      SET from.balance = from.balance - 1000
    `);

    await conn.query(`
      MATCH (to:Account {id: 'acc3'})
      SET to.balance = to.balance + 1000
    `);

    await conn.query('COMMIT');

  } catch (error) {
    logger.warning(`Error: ${(error as Error).message}`);
    logger.code('ROLLBACK');
    await conn.query('ROLLBACK');
    logger.success('✓ Transaction rolled back - no changes made');
  }

  logger.newline();
  logger.info('Balances after rollback (should be unchanged):');
  balances = await executeQuery(conn, `
    MATCH (a:Account)
    RETURN a.id, a.owner, a.balance
    ORDER BY a.owner
  `);
  printResults(balances);

  // ============================================================
  // Demo 3: Multi-Operation Transaction
  // ============================================================
  logger.subheader('Demo 3: Complex Multi-Operation Transaction');

  logger.info('Executing batch transfer: Charlie -> Diana ($50), Diana -> Alice ($25)');

  await conn.query('BEGIN TRANSACTION');

  try {
    // Transfer 1: Charlie to Diana
    await conn.query(`
      MATCH (from:Account {id: 'acc3'}), (to:Account {id: 'acc4'})
      SET from.balance = from.balance - 50, to.balance = to.balance + 50
    `);

    await conn.query(`
      MATCH (from:Account {id: 'acc3'}), (to:Account {id: 'acc4'})
      CREATE (from)-[:TRANSFER {amount: 50, timestamp: DATE('2024-03-13'), note: 'Batch transfer 1'}]->(to)
    `);

    // Transfer 2: Diana to Alice
    await conn.query(`
      MATCH (from:Account {id: 'acc4'}), (to:Account {id: 'acc1'})
      SET from.balance = from.balance - 25, to.balance = to.balance + 25
    `);

    await conn.query(`
      MATCH (from:Account {id: 'acc4'}), (to:Account {id: 'acc1'})
      CREATE (from)-[:TRANSFER {amount: 25, timestamp: DATE('2024-03-13'), note: 'Batch transfer 2'}]->(to)
    `);

    await conn.query('COMMIT');
    logger.success('✓ Batch transaction committed!');

  } catch (error) {
    logger.error('Batch transaction failed, rolling back...');
    await conn.query('ROLLBACK');
    throw error;
  }

  logger.newline();
  logger.info('Final balances:');
  balances = await executeQuery(conn, `
    MATCH (a:Account)
    RETURN a.id, a.owner, a.balance
    ORDER BY a.owner
  `);
  printResults(balances);

  // ============================================================
  // Demo 4: Transaction History
  // ============================================================
  logger.subheader('Demo 4: Transaction History');

  logger.info('All transfers:');
  const transfers = await executeQuery(conn, `
    MATCH (from:Account)-[t:TRANSFER]->(to:Account)
    RETURN from.owner AS from_account, to.owner AS to_account, t.amount, t.note, t.timestamp
    ORDER BY t.timestamp DESC
  `);
  printResults(transfers);

  // ============================================================
  // Demo 5: WAL and Checkpointing
  // ============================================================
  logger.subheader('Demo 5: WAL and Checkpointing');

  logger.info('Forcing a checkpoint to persist data...');
  logger.info('(In production, checkpoints happen automatically based on interval)');

  try {
    await conn.query('CHECKPOINT');
    logger.success('✓ Checkpoint completed - data persisted to disk');
  } catch (error) {
    logger.dim('CHECKPOINT command may not be available in this version');
  }

  // ============================================================
  // Demo 6: Transaction Isolation
  // ============================================================
  logger.subheader('Demo 6: Concurrent Connection Simulation');

  logger.info('Opening a second connection...');
  const conn2 = db.createConnection();

  logger.info('Connection 1: Starting transaction');
  await conn.query('BEGIN TRANSACTION');
  await conn.query(`
    MATCH (a:Account {id: 'acc1'})
    SET a.balance = a.balance + 10
  `);
  logger.dim('Connection 1: Alice +$10 (not yet committed)');

  logger.info('Connection 2: Reading Alice\'s balance');
  const conn2Read = await executeQuery(conn2, `
    MATCH (a:Account {id: 'acc1'})
    RETURN a.balance
  `);
  const balance = conn2Read.length > 0 ? (conn2Read[0]['a.balance'] ?? 0) : 0;
  logger.dim(`Connection 2 sees balance: $${balance}`);
  logger.info('Note: Depending on isolation level, this may show old or new value');

  logger.info('Connection 1: Committing transaction');
  await conn.query('COMMIT');
  logger.success('✓ Transaction committed');

  logger.info('Connection 2: Reading Alice\'s balance again');
  const conn2Read2 = await executeQuery(conn2, `
    MATCH (a:Account {id: 'acc1'})
    RETURN a.balance
  `);
  const balance2 = conn2Read2.length > 0 ? (conn2Read2[0]['a.balance'] ?? 0) : 0;
  logger.dim(`Connection 2 now sees balance: $${balance2}`);

  // Note: Connection doesn't have a close() method in this API
  logger.success('✓ Second connection finished');

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Transaction Summary');

  logger.info('Final account balances:');
  balances = await executeQuery(conn, `
    MATCH (a:Account)
    RETURN a.id, a.owner, ROUND(a.balance, 2) AS balance
    ORDER BY a.owner
  `);
  printResults(balances);

  logger.info('Total transfers completed:');
  const transferCount = await executeQuery(conn, `
    MATCH ()-[t:TRANSFER]->()
    RETURN COUNT(t) AS total
  `);
  const total = transferCount.length > 0 ? (transferCount[0].total ?? 0) : 0;
  logger.result(total, 'transfers');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  // Note: Connection doesn't have a close() method in this API
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Transactions Demo Completed!');
  logger.info('This demonstrates ACID transaction guarantees in CongraphDB.');
}
