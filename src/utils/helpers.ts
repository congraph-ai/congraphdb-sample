/**
 * Helper functions for CongraphDB operations
 */

import path from 'path';
import fs from 'fs';
import congraphdb from '@congraph-ai/congraphdb';

export interface DatabaseConfig {
  path?: string;
  inMemory?: boolean;
  readOnly?: boolean;
  bufferSize?: number;
  compressionEnabled?: boolean;
  walEnabled?: boolean;
  checkpointInterval?: number;
}

/**
 * Default database configuration
 */
export const DEFAULT_DB_CONFIG: DatabaseConfig = {
  path: './data/sample.cgraph',
  inMemory: false,
  readOnly: false,
  bufferSize: 1024 * 1024 * 256, // 256MB
  compressionEnabled: true,
  walEnabled: true,
  checkpointInterval: 1000,
};

/**
 * Create a CongraphDB database with the specified configuration
 */
export async function createDatabase(
  config: DatabaseConfig = {}
): Promise<congraphdb.Database> {
  const finalConfig = { ...DEFAULT_DB_CONFIG, ...config };

  // Ensure data directory exists
  if (finalConfig.path && !finalConfig.inMemory) {
    const dir = path.dirname(finalConfig.path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // CongraphDB Database constructor uses positional arguments:
  // new Database(path?, bufferManagerSize?, enableCompression?, readOnly?, ...)
  // Note: :memory: doesn't work on Windows, use temp file for in-memory mode
  const db = new congraphdb.Database(
    finalConfig.inMemory ? '' : finalConfig.path,  // Empty string for temp database
    finalConfig.bufferSize,
    finalConfig.compressionEnabled,
    finalConfig.readOnly,
    undefined, // maxDbSize
    undefined, // autoCheckpoint
    undefined, // checkpointThreshold
    undefined, // throwOnWalReplayFailure
    false      // enableChecksums
  );

  return db;
}

/**
 * Execute a query and return all results
 */
export async function executeQuery(
  conn: congraphdb.Connection,
  query: string
): Promise<any[]> {
  const result = await conn.query(query);
  const rows = await result.getAll();
  // Handle undefined or null results
  if (!rows) return [];
  return rows;
}

/**
 * Execute a query and iterate over results
 */
export async function iterateQuery(
  conn: congraphdb.Connection,
  query: string,
  callback: (row: any) => void | Promise<void>
): Promise<void> {
  const result = await conn.query(query);
  const rows = result.getAll();
  for (const row of rows) {
    await callback(row);
  }
}

/**
 * Format query results for display
 */
export function formatResults(results: any[]): string {
  if (results.length === 0) {
    return 'No results';
  }

  const headers = Object.keys(results[0]);
  const rows = results.map(r =>
    headers.map(h => JSON.stringify(r[h] ?? 'NULL')).join(' | ')
  );

  return [
    headers.join(' | '),
    headers.map(() => '---').join(' | '),
    ...rows,
  ].join('\n');
}

/**
 * Print query results in a table format
 */
export function printResults(results: any[]): void {
  console.log(formatResults(results));
}

/**
 * Clean up database files
 */
export async function cleanupDatabase(dbPath: string): Promise<void> {
  const files = [dbPath, `${dbPath}.wal`];

  for (const file of files) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn(`Failed to delete ${file}:`, error);
      }
    }
  }
}

/**
 * Get a timestamp for unique database names
 */
export function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-');
}

/**
 * Parse connection info from query result
 */
export function parseResultRow(row: any): Record<string, any> {
  const parsed: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    parsed[key] = value;
  }

  return parsed;
}

/**
 * Generate a random embedding for testing vector search
 */
export function generateEmbedding(dimension: number = 128): number[] {
  return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
