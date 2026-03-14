/**
 * Example 04: Vector Similarity Search
 *
 * This example demonstrates CongraphDB's vector similarity search capabilities:
 * - FLOAT_VECTOR columns for storing embeddings
 * - HNSW indexing for fast approximate nearest neighbor search
 * - Similarity search with <-> operator (Euclidean distance)
 * - Use cases: semantic search, recommendations, deduplication
 *
 * Real-world applications:
 * - Semantic document search
 * - Product recommendations
 * - Image similarity
 * - Duplicate detection
 */

import congraphdb from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults, generateEmbedding } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VectorSearch');

// Sample documents with their semantic content
const DOCUMENTS = [
  { id: 'd1', title: 'Introduction to Machine Learning', category: 'AI' },
  { id: 'd2', title: 'Deep Learning with Neural Networks', category: 'AI' },
  { id: 'd3', title: 'Python Programming Basics', category: 'Programming' },
  { id: 'd4', title: 'JavaScript for Web Development', category: 'Programming' },
  { id: 'd5', title: 'Data Structures and Algorithms', category: 'CS' },
  { id: 'd6', title: 'Database Design Principles', category: 'CS' },
  { id: 'd7', title: 'Natural Language Processing', category: 'AI' },
  { id: 'd8', title: 'React Framework Tutorial', category: 'Programming' },
];

// Generate semantic-like embeddings (simulated)
// In real applications, you'd use actual embeddings from models like
// OpenAI's text-embedding-ada-002, Sentence Transformers, etc.
function generateSemanticEmbedding(text: string, dimension: number = 128): number[] {
  const embedding = new Array(dimension).fill(0);

  // Simple hash-based embedding simulation for demo purposes
  // This creates similar embeddings for similar content
  const keywords: Record<string, number[]> = {
    'AI': [0, 0.1, 0.2, 0.3],
    'Programming': [0.5, 0.6, 0.1, 0.2],
    'CS': [0.3, 0.4, 0.5, 0.1],
  };

  let category = 'CS';
  if (text.toLowerCase().includes('machine') || text.toLowerCase().includes('learning') ||
      text.toLowerCase().includes('neural') || text.toLowerCase().includes('nlp')) {
    category = 'AI';
  } else if (text.toLowerCase().includes('python') || text.toLowerCase().includes('javascript') ||
             text.toLowerCase().includes('react')) {
    category = 'Programming';
  } else if (text.toLowerCase().includes('data structure') || text.toLowerCase().includes('database')) {
    category = 'CS';
  }

  const base = keywords[category] || keywords['CS'];

  for (let i = 0; i < dimension; i++) {
    embedding[i] = base[i % base.length] + (Math.random() - 0.5) * 0.1;
  }

  return embedding;
}

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Vector Similarity Search Demo');

  const EMBEDDING_DIM = 128;

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/vector-search.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema with Vector Column
  // ============================================================
  logger.subheader('Defining Schema with FLOAT_VECTOR');

  logger.info('Creating Document table with embedding column...');
  logger.query(`
    CREATE NODE TABLE Document (
      id STRING,
      title STRING,
      category STRING,
      embedding FLOAT_VECTOR(${EMBEDDING_DIM}),
      PRIMARY KEY (id)
    )
  `);
  await conn.query(`
    CREATE NODE TABLE Document (
      id STRING,
      title STRING,
      category STRING,
      embedding FLOAT_VECTOR(${EMBEDDING_DIM}),
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Document table created with FLOAT_VECTOR column');

  // ============================================================
  // Insert Documents with Embeddings
  // ============================================================
  logger.subheader('Inserting Documents with Embeddings');

  for (const doc of DOCUMENTS) {
    const embedding = generateSemanticEmbedding(doc.title, EMBEDDING_DIM);
    const embeddingStr = JSON.stringify(embedding);

    logger.query(`
      CREATE (d:Document {id: '${doc.id}', title: '${doc.title}', category: '${doc.category}', embedding: ${embeddingStr}})
    `);
    await conn.query(`
      CREATE (d:Document {id: '${doc.id}', title: '${doc.title}', category: '${doc.category}', embedding: ${embeddingStr}})
    `);
  }
  logger.success(`✓ Inserted ${DOCUMENTS.length} documents with embeddings`);

  // ============================================================
  // Query 1: Exact Vector Match
  // ============================================================
  logger.subheader('Query 1: Finding a Document by ID');

  logger.info('Retrieve document with its embedding:');
  const docResult = await executeQuery(conn, `
    MATCH (d:Document {id: 'd1'})
    RETURN d.id, d.title, d.category
  `);
  printResults(docResult);

  // ============================================================
  // Query 2: KNN Similarity Search
  // ============================================================
  logger.subheader('Query 2: K-Nearest Neighbors Search');

  logger.info('Find documents similar to "Introduction to Machine Learning":');

  // Get the query embedding
  const queryEmbedding = generateSemanticEmbedding('Introduction to Machine Learning', EMBEDDING_DIM);
  const queryEmbeddingStr = JSON.stringify(queryEmbedding);

  logger.query(`
    MATCH (d:Document)
    WHERE d.id <> 'd1'
    RETURN d.id, d.title, d.category, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
    LIMIT 3
  `);

  const similarDocs = await executeQuery(conn, `
    MATCH (d:Document)
    WHERE d.id <> 'd1'
    RETURN d.id, d.title, d.category, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
    LIMIT 3
  `);
  printResults(similarDocs);
  logger.info('Note: <-> operator calculates Euclidean distance (lower = more similar)');

  // ============================================================
  // Query 3: Similarity Search with Threshold
  // ============================================================
  logger.subheader('Query 3: Similarity Search with Threshold');

  logger.info('Find documents within similarity threshold:');

  logger.query(`
    MATCH (d:Document)
    WHERE d.id <> 'd1' AND d.embedding <-> ${queryEmbeddingStr} < 0.5
    RETURN d.title, d.category, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
  `);

  const thresholdDocs = await executeQuery(conn, `
    MATCH (d:Document)
    WHERE d.id <> 'd1' AND d.embedding <-> ${queryEmbeddingStr} < 0.5
    RETURN d.title, d.category, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
  `);
  printResults(thresholdDocs);

  // ============================================================
  // Query 4: Category-Based Vector Search
  // ============================================================
  logger.subheader('Query 4: Filtered Vector Search');

  logger.info('Find similar documents within the same category (AI):');

  logger.query(`
    MATCH (d:Document)
    WHERE d.category = 'AI' AND d.id <> 'd1'
    RETURN d.title, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
  `);

  const categoryDocs = await executeQuery(conn, `
    MATCH (d:Document)
    WHERE d.category = 'AI' AND d.id <> 'd1'
    RETURN d.title, d.embedding <-> ${queryEmbeddingStr} AS distance
    ORDER BY distance
  `);
  printResults(categoryDocs);

  // ============================================================
  // Query 5: Cross-Category Similarity Discovery
  // ============================================================
  logger.subheader('Query 5: Cross-Category Similarity');

  logger.info('Find the most similar document from a different category:');

  logger.query(`
    MATCH (d1:Document {id: 'd1'}), (d2:Document)
    WHERE d2.category <> d1.category
    RETURN d2.title, d2.category, d1.embedding <-> d2.embedding AS distance
    ORDER BY distance
    LIMIT 1
  `);

  const crossCategory = await executeQuery(conn, `
    MATCH (d1:Document {id: 'd1'}), (d2:Document)
    WHERE d2.category <> d1.category
    RETURN d2.title, d2.category, d1.embedding <-> d2.embedding AS distance
    ORDER BY distance
    LIMIT 1
  `);
  printResults(crossCategory);

  // ============================================================
  // Query 6: Semantic Search Example
  // ============================================================
  logger.subheader('Query 6: Semantic Search');

  logger.info('Search for documents similar to a user query:');
  const userQuery = 'neural networks and deep learning';
  logger.dim(`User query: "${userQuery}"`);

  const queryEmbedding2 = generateSemanticEmbedding(userQuery, EMBEDDING_DIM);
  const queryEmbeddingStr2 = JSON.stringify(queryEmbedding2);

  logger.query(`
    MATCH (d:Document)
    RETURN d.title, d.category, d.embedding <-> ${queryEmbeddingStr2} AS distance
    ORDER BY distance
    LIMIT 3
  `);

  const searchResults = await executeQuery(conn, `
    MATCH (d:Document)
    RETURN d.title, d.category, d.embedding <-> ${queryEmbeddingStr2} AS distance
    ORDER BY distance
    LIMIT 3
  `);
  printResults(searchResults);

  // ============================================================
  // Query 7: Deduplication Example
  // ============================================================
  logger.subheader('Query 7: Duplicate Detection');

  logger.info('Find potential duplicates (very similar documents):');

  logger.query(`
    MATCH (d1:Document), (d2:Document)
    WHERE d1.id < d2.id
    WITH d1, d2, d1.embedding <-> d2.embedding AS distance
    WHERE distance < 0.3
    RETURN d1.title AS doc1, d2.title AS doc2, distance
    ORDER BY distance
  `);

  const duplicates = await executeQuery(conn, `
    MATCH (d1:Document), (d2:Document)
    WHERE d1.id < d2.id
    WITH d1, d2, d1.embedding <-> d2.embedding AS distance
    WHERE distance < 0.3
    RETURN d1.title AS doc1, d2.title AS doc2, distance
    ORDER BY distance
  `);

  if (duplicates.length > 0) {
    printResults(duplicates);
  } else {
    logger.info('No potential duplicates found (distance < 0.3)');
  }

  // ============================================================
  // Use Case Explanation
  // ============================================================
  logger.subheader('Real-World Use Cases');

  logger.info('Vector similarity search enables:');
  logger.dim('  1. Semantic Search - Find content by meaning, not keywords');
  logger.dim('  2. Recommendations - "Users who liked X also liked Y"');
  logger.dim('  3. Deduplication - Find near-duplicate records');
  logger.dim('  4. Anomaly Detection - Find outliers via distance');
  logger.dim('  5. Clustering - Group similar items');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  // Note: Connection doesn't have a close() method in this API
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Vector Search Demo Completed!');
  logger.info('This demonstrates CongraphDB\'s native vector similarity search.');
}
