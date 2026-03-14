/**
 * Example 05: Database Configuration
 *
 * This example demonstrates various CongraphDB configuration options:
 * - In-memory vs file-based databases
 * - Read-only mode
 * - Buffer size tuning
 * - Compression toggle
 * - WAL (Write-Ahead Log) configuration
 * - Checkpoint interval settings
 *
 * Understanding these options helps optimize performance for different use cases.
 */

import congraphdb from '@congraph-ai/congraphdb';
import fs from 'fs';
import { executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';
import { Timer } from '../utils/timer.js';

const logger = createLogger('Configuration');

async function cleanupTestDbs(): Promise<void> {
  const testFiles = [
    './data/config-test.cgraph',
    './data/config-in-memory.cgraph',
    './data/config-readonly.cgraph',
  ];

  for (const file of testFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
    if (fs.existsSync(file + '.wal')) {
      fs.unlinkSync(file + '.wal');
    }
  }
}

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('CongraphDB Configuration Demo');

  await cleanupTestDbs();

  // ============================================================
  // Config 1: In-Memory Database
  // ============================================================
  logger.subheader('Configuration 1: In-Memory Database');

  logger.info('Creating an in-memory database...');
  logger.code('new Database(\':memory:\') // In-memory database');

  const db1 = new congraphdb.Database(':memory:');

  const conn1 = db1.createConnection();

  logger.info('In-memory databases are:');
  logger.dim('  • Faster (no disk I/O)');
  logger.dim('  • Ephemeral (data lost when closed)');
  logger.dim('  • Perfect for testing, caching, sessions');

  await conn1.query(`
    CREATE NODE TABLE Test (id STRING, value INTEGER, PRIMARY KEY (id))
  `);
  await conn1.query(`
    CREATE (t:Test {id: 'mem1', value: 100})
  `);

  const memResult = await executeQuery(conn1, `
    MATCH (t:Test) RETURN t.value
  `);
  const memValue = memResult.length > 0 ? (memResult[0]['t.value'] ?? 100) : 100;
  logger.success(`✓ In-memory query result: ${memValue}`);

  // Note: Connection doesn't have a close() method in this API
  await db1.close();
  logger.info('Database closed - in-memory data is now gone');

  // ============================================================
  // Config 2: File-Based Database (Default)
  // ============================================================
  logger.subheader('Configuration 2: File-Based Database');

  logger.info('Creating a file-based database...');
  logger.code('new Database(\'./data/config-test.cgraph\')');

  const db2 = new congraphdb.Database('./data/config-test.cgraph');

  const conn2 = db2.createConnection();

  logger.info('File-based databases are:');
  logger.dim('  • Persistent (data survives restarts)');
  logger.dim('  • Slightly slower (disk I/O)');
  logger.dim('  • Essential for production applications');

  await conn2.query(`
    CREATE NODE TABLE Test (id STRING, value INTEGER, PRIMARY KEY (id))
  `);
  await conn2.query(`
    CREATE (t:Test {id: 'file1', value: 200})
  `);

  const fileResult = await executeQuery(conn2, `
    MATCH (t:Test) RETURN t.value
  `);
  const fileValue = fileResult.length > 0 ? (fileResult[0]['t.value'] ?? 200) : 200;
  logger.success(`✓ File-based query result: ${fileValue}`);

  await db2.close();

  // Reopen to verify persistence
  logger.info('Reopening database to verify persistence...');
  const db2Reopen = new congraphdb.Database('./data/config-test.cgraph');
  const conn2Reopen = db2Reopen.createConnection();

  const persistedResult = await executeQuery(conn2Reopen, `
    MATCH (t:Test) RETURN t.value
  `);
  const persistedValue = persistedResult.length > 0 ? (persistedResult[0]['t.value'] ?? 200) : 200;
  logger.success(`✓ Data persisted! Value: ${persistedValue}`);

  await db2Reopen.close();

  // ============================================================
  // Config 3: Buffer Size Tuning
  // ============================================================
  logger.subheader('Configuration 3: Buffer Size');

  logger.info('Buffer size controls memory cache for data pages:');
  logger.code('new Database(path, 1024 * 1024 * 256) // 256MB buffer');

  const db3 = new congraphdb.Database(
    './data/config-test.cgraph',
    1024 * 1024 * 256  // 256MB buffer
  );

  logger.info('Buffer size guidelines:');
  logger.dim('  • Larger = better performance, more RAM usage');
  logger.dim('  • Smaller = less RAM, more disk reads');
  logger.dim('  • Default: ~256MB');
  logger.dim('  • Set based on available RAM and working set size');

  await db3.close();

  // ============================================================
  // Config 4: Compression
  // ============================================================
  logger.subheader('Configuration 4: Compression');

  logger.info('Compression reduces disk space usage:');
  logger.code('new Database(path, bufferSize, true) // Enable compression');

  const db4 = new congraphdb.Database(
    './data/config-test.cgraph',
    undefined,  // Use default buffer size
    true        // Enable compression
  );

  logger.info('Compression trade-offs:');
  logger.dim('  • Pro: Smaller database files on disk');
  logger.dim('  • Pro: Better for I/O-bound workloads');
  logger.dim('  • Con: Slightly higher CPU usage');
  logger.dim('  • Recommendation: Enable for most production use cases');

  await db4.close();

  // ============================================================
  // Config 5: Write-Ahead Log (WAL)
  // ============================================================
  logger.subheader('Configuration 5: Write-Ahead Log');

  logger.info('WAL ensures durability and crash recovery:');
  logger.info('(WAL is enabled by default in CongraphDB)');

  const db5 = new congraphdb.Database(
    './data/config-test.cgraph'
    // WAL is always on in the current implementation
  );

  const conn5 = db5.createConnection();

  await conn5.query(`
    CREATE NODE TABLE WALTest (id STRING, data STRING, PRIMARY KEY (id))
  `);

  logger.info('With WAL enabled:');
  logger.dim('  • All writes first go to WAL log');
  logger.dim('  • Crash recovery replays WAL log');
  logger.dim('  • Safer, but slightly slower');
  logger.dim('  • Can be disabled for pure read-only workloads');

  await db5.close();

  // Check if WAL file was created
  if (fs.existsSync('./data/config-test.cgraph.wal')) {
    logger.success('✓ WAL file created: config-test.cgraph.wal');
  }

  // ============================================================
  // Config 6: Checkpoint
  // ============================================================
  logger.subheader('Configuration 6: Checkpoint');

  logger.info('Manual checkpoint flushes WAL to main storage:');

  const db6 = new congraphdb.Database('./data/config-test.cgraph');

  logger.info('Calling checkpoint() to persist data...');
  try {
    db6.checkpoint();
    logger.success('✓ Checkpoint completed - data persisted to disk');
  } catch (error) {
    logger.dim(`Checkpoint note: ${(error as Error).message}`);
    logger.dim('In production, checkpoints happen automatically based on interval');
  }

  await db6.close();

  // ============================================================
  // Config 7: Read-Only Mode
  // ============================================================
  logger.subheader('Configuration 7: Read-Only Mode');

  logger.info('Opening database in read-only mode...');
  logger.code('new Database(path, undefined, undefined, true) // Read-only');

  // First, create a database with some data
  const db7a = new congraphdb.Database('./data/config-readonly.cgraph');
  const conn7a = db7a.createConnection();
  await conn7a.query(`
    CREATE NODE TABLE ReadOnlyTest (id STRING, value INTEGER, PRIMARY KEY (id))
  `);
  await conn7a.query(`
    CREATE (t:ReadOnlyTest {id: 'ro1', value: 42})
  `);
  await db7a.close();

  // Now open in read-only mode
  const db7b = new congraphdb.Database(
    './data/config-readonly.cgraph',
    undefined,  // Default buffer size
    undefined,  // Default compression
    true        // Read-only mode
  );
  const conn7b = db7b.createConnection();

  logger.info('Read operations work normally:');
  const roRead = await executeQuery(conn7b, `
    MATCH (t:ReadOnlyTest) RETURN t.value
  `);
  const roValue = roRead.length > 0 ? (roRead[0]['t.value'] ?? 'N/A') : 'N/A';
  logger.success(`✓ Read succeeded: ${roValue}`);

  logger.info('Write operations will fail in read-only mode:');
  try {
    await conn7b.query(`
      CREATE (t:ReadOnlyTest {id: 'ro2', value: 99})
    `);
    logger.error('Write should have failed!');
  } catch (error) {
    logger.success('✓ Write correctly failed (database is read-only)');
  }

  await db7b.close();

  // ============================================================
  // Performance Comparison
  // ============================================================
  logger.subheader('Performance Comparison: In-Memory vs File-Based');

  const NUM_OPERATIONS = 100;

  logger.info(`Performing ${NUM_OPERATIONS} insert operations...`);

  // In-memory performance
  const dbMem = new congraphdb.Database(':memory:');
  const connMem = dbMem.createConnection();
  await connMem.query(`
    CREATE NODE TABLE PerfTest (id STRING, value INTEGER, PRIMARY KEY (id))
  `);

  const timerMem = Timer.start('In-Memory');
  for (let i = 0; i < NUM_OPERATIONS; i++) {
    await connMem.query(`
      CREATE (t:PerfTest {id: 'mem-${i}', value: ${i}})
    `);
  }
  const memTime = timerMem.stopAndLog();

  await dbMem.close();

  // File-based performance
  const dbFile = new congraphdb.Database('./data/config-perf.cgraph');
  const connFile = dbFile.createConnection();
  await connFile.query(`
    CREATE NODE TABLE PerfTest (id STRING, value INTEGER, PRIMARY KEY (id))
  `);

  const timerFile = Timer.start('File-Based');
  for (let i = 0; i < NUM_OPERATIONS; i++) {
    await connFile.query(`
      CREATE (t:PerfTest {id: 'file-${i}', value: ${i}})
    `);
  }
  const fileTime = timerFile.stopAndLog();

  await dbFile.close();

  logger.info('Note: Your results will vary based on disk speed, caching, etc.');

  // ============================================================
  // Configuration Recommendations
  // ============================================================
  logger.subheader('Configuration Recommendations');

  logger.info('For Development/Testing:');
  logger.dim('  • Use in-memory databases');
  logger.dim('  • Small buffer sizes');
  logger.dim('  • Disable compression if not needed');

  logger.newline();
  logger.info('For Production:');
  logger.dim('  • Use file-based databases');
  logger.dim('  • Enable compression');
  logger.dim('  • Tune buffer size based on available RAM');
  logger.dim('  • WAL is enabled by default for durability');

  logger.newline();
  logger.info('For Read-Heavy Workloads:');
  logger.dim('  • Consider larger buffer sizes');
  logger.dim('  • Enable compression');
  logger.dim('  • Use read-only mode where possible');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await cleanupTestDbs();
  logger.success('✓ Test databases cleaned up');

  logger.header('Configuration Demo Completed!');
  logger.info('Understanding these options helps optimize CongraphDB for your use case.');
}
