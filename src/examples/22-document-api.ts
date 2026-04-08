import { Database } from 'congraphdb';
import chalk from 'chalk';

/**
 * Example 22: Document API for RAG
 * 
 * Showcases the high-level Document API introduced in v0.1.10,
 * specifically designed for RAG (Retrieval-Augmented Generation) 
 * and Knowledge Graph construction workflows.
 */
export async function run(verbose: boolean = false): Promise<void> {
  console.log(chalk.cyan('\n--- CongraphDB Document API Demo ---'));

  // Initialize database
  const db = new Database(':memory:');
  await db.init();
  const conn = db.createConnection();

  try {
    // 1. Setup specialized tables for RAG
    console.log(chalk.gray('Setting up RAG tables...'));
    await conn.query('CREATE NODE TABLE Chunk(id SERIAL, content STRING, embedding FLOAT[128], PRIMARY KEY (id))');
    await conn.query('CREATE NODE TABLE Entity(id STRING, type STRING, description STRING, PRIMARY KEY (id))');
    await conn.query('CREATE REL TABLE MENTIONS(FROM Chunk TO Entity)');
    await conn.query('CREATE REL TABLE RELATED_TO(FROM Entity TO Entity)');

    // 2. Using the high-level Document API
    console.log(chalk.blue('\n1. Creating Document Chunks with Embeddings'));
    
    // createChunk() creates a node in the 'Chunk' table by default or specified label
    const chunk1 = await conn.createChunk({
      content: 'CongraphDB is a high-performance embedded graph database.',
      embedding: Array(128).fill(0).map((_, i) => i / 128),
      metadata: { source: 'docs', page: 1 }
    });
    
    console.log(chalk.green('✓ Created chunk:'), chunk1.id);
    if (verbose) console.log(chunk1);

    const chunk2 = await conn.createChunk({
      content: 'It supports Cypher query language and vector similarity search.',
      embedding: Array(128).fill(0).map((_, i) => 1 - (i / 128)),
      metadata: { source: 'docs', page: 1 }
    });
    console.log(chalk.green('✓ Created chunk:'), chunk2.id);

    // 3. Creating Knowledge Graph Entities
    console.log(chalk.blue('\n2. Extracting and Creating Entities'));
    
    const entity1 = await conn.createEntity('CongraphDB', {
      type: 'Database',
      description: 'Embedded graph database for Node.js'
    });
    console.log(chalk.green('✓ Created entity:'), entity1.id);

    const entity2 = await conn.createEntity('Cypher', {
      type: 'QueryLanguage',
      description: 'Graph query language standard'
    });
    console.log(chalk.green('✓ Created entity:'), entity2.id);

    // 4. Linking Chunks to Entities (Building the Knowledge Graph)
    console.log(chalk.blue('\n3. Linking Documents to Knowledge Graph Entities'));
    
    const fact1 = await conn.createFact(chunk1.id, entity1.id, 'MENTIONS', {
      confidence: 0.98,
      method: 'exact-match'
    });
    console.log(chalk.green('✓ Created fact:'), `Chunk(${chunk1.id}) -[MENTIONS]-> Entity(${entity1.id})`);

    const fact2 = await conn.createFact(chunk2.id, entity2.id, 'MENTIONS', {
      confidence: 0.95
    });
    console.log(chalk.green('✓ Created fact:'), `Chunk(${chunk2.id}) -[MENTIONS]-> Entity(${entity2.id})`);

    // 5. Checking Existence
    console.log(chalk.blue('\n4. Verifying Node Existence'));
    const exists = await conn.nodeExists(entity1.id);
    console.log(chalk.gray(`Entity 'CongraphDB' exists:`), exists ? chalk.green('Yes') : chalk.red('No'));

    // 6. Querying the combined RAG structure
    console.log(chalk.blue('\n5. Querying the Knowledge Graph'));
    const result = await conn.query(`
      MATCH (c:Chunk)-[:MENTIONS]->(e:Entity)
      RETURN c.content as text, e.id as entity, e.type as type
    `);

    console.log(chalk.white('\nExtracted Knowledge:'));
    result.all().forEach((row: any) => {
      console.log(chalk.dim(`- [${row.type}] ${row.entity}: `) + row.text);
    });

  } catch (error) {
    console.error(chalk.red('Error in Document API demo:'), error);
    throw error;
  } finally {
    await db.close();
  }
}
