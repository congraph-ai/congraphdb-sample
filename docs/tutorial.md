# CongraphDB Tutorial

A step-by-step guide from zero to a working graph application.

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Your First Graph Database](#your-first-graph-database)
4. [Creating Nodes and Relationships](#creating-nodes-and-relationships)
5. [Querying Data](#querying-data)
6. [Updating and Deleting](#updating-and-deleting)
7. [Transactions](#transactions)
8. [Next Steps](#next-steps)

## Introduction

CongraphDB is an embedded graph database that uses Cypher, the graph query language made popular by Neo4j. Graph databases are ideal for data with complex relationships.

### When to Use a Graph Database

- **Social Networks** - Friends, followers, connections
- **Recommendations** - "Users who liked X also liked Y"
- **Fraud Detection** - Finding suspicious transaction patterns
- **Knowledge Graphs** - Concepts and their relationships
- **Any data with relationships** - If you're doing lots of JOINs, consider a graph database

## Installation

### Prerequisites

```bash
# Check Node.js version (20+ required)
node --version

# Check npm version
npm --version
```

### Install CongraphDB

```bash
npm install congraphdb
```

### TypeScript Setup

```bash
npm install -D typescript @types/node
npx tsc --init
```

## Your First Graph Database

### Step 1: Import and Create a Database

```typescript
import congraphdb from 'congraphdb';

// Create an in-memory database
const db = new congraphdb.Database();

// Or create a file-based database
const db = new congraphdb.Database({
  path: './my-graph.cgraph'
});
```

### Step 2: Connect to the Database

```typescript
const conn = await db.connect();
```

### Step 3: Define Your Schema

CongraphDB requires you to define node tables and relationship tables:

```typescript
// Create a Person node table
await conn.query(`
  CREATE NODE TABLE Person (
    id STRING,
    name STRING,
    age INTEGER,
    PRIMARY KEY (id)
  )
`);

// Create a KNOWS relationship table
await conn.query(`
  CREATE REL TABLE KNOWS (
    FROM Person TO Person,
    since DATE
  )
`);
```

## Creating Nodes and Relationships

### Creating Nodes

```typescript
// Create a single person
await conn.query(`
  CREATE (p:Person {id: '1', name: 'Alice', age: 30})
`);

// Create multiple people
await conn.query(`
  CREATE (p:Person {id: '2', name: 'Bob', age: 25})
  CREATE (p:Person {id: '3', name: 'Charlie', age: 35})
`);
```

### Creating Relationships

```typescript
// Alice knows Bob
await conn.query(`
  MATCH (a:Person {id: '1'}), (b:Person {id: '2'})
  CREATE (a)-[:KNOWS {since: DATE('2023-01-15')}]->(b)
`);
```

## Querying Data

### Basic MATCH Queries

```typescript
// Find all people
const result = await conn.query(`
  MATCH (p:Person)
  RETURN p.name, p.age
  ORDER BY p.age
`);

// Get all results
const people = await result.getAll();
console.log(people);
// Output: [{ 'p.name': 'Bob', 'p.age': 25 }, ...]
```

### Pattern Matching

```typescript
// Find Alice's friends
const result = await conn.query(`
  MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(friend:Person)
  RETURN friend.name, friend.age
`);
```

### Variable-Length Paths

```typescript
// Find friends of friends (2-hop)
const result = await conn.query(`
  MATCH (me:Person {name: 'Alice'})-[:KNOWS*2]->(fof:Person)
  RETURN DISTINCT fof.name
`);
```

## Updating and Deleting

### Updating with SET

```typescript
// Update Alice's age
await conn.query(`
  MATCH (p:Person {name: 'Alice'})
  SET p.age = 31
`);
```

### Deleting Nodes

```typescript
// Delete a node (must have no relationships)
await conn.query(`
  MATCH (p:Person {name: 'Charlie'})
  DELETE p
`);

// Delete a node and all its relationships
await conn.query(`
  MATCH (p:Person {name: 'Charlie'})
  DETACH DELETE p
`);
```

## Transactions

Transactions ensure ACID guarantees - multiple operations succeed or fail together.

```typescript
try {
  // Start transaction
  await conn.query('BEGIN TRANSACTION');

  // Multiple operations
  await conn.query(`
    MATCH (a:Person {id: '1'}) SET a.balance = a.balance - 100
  `);
  await conn.query(`
    MATCH (b:Person {id: '2'}) SET b.balance = b.balance + 100
  `);

  // Commit if all succeeded
  await conn.query('COMMIT');
} catch (error) {
  // Rollback on error
  await conn.query('ROLLBACK');
  throw error;
}
```

## Working with Query Results

### getAll() - Get All Results

```typescript
const result = await conn.query('MATCH (p:Person) RETURN p.name');
const names = await result.getAll();
```

### getNext() - Iterate One by One

```typescript
const result = await conn.query('MATCH (p:Person) RETURN p.name');
let row;
while ((row = await result.getNext()) !== null) {
  console.log(row);
}
```

### Async Iteration

```typescript
const result = await conn.query('MATCH (p:Person) RETURN p.name');
for await (const row of result) {
  console.log(row);
}
```

## Cleanup

Always close connections when done:

```typescript
await conn.close();
await db.close();
```

## Complete Example

Here's a complete working example:

```typescript
import congraphdb from 'congraphdb';

async function main() {
  // Create database
  const db = new congraphdb.Database();
  const conn = await db.connect();

  // Define schema
  await conn.query(`
    CREATE NODE TABLE Person (
      id STRING,
      name STRING,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE KNOWS (
      FROM Person TO Person
    )
  `);

  // Create data
  await conn.query(`CREATE (p:Person {id: '1', name: 'Alice'})`);
  await conn.query(`CREATE (p:Person {id: '2', name: 'Bob'})`);
  await conn.query(`
    MATCH (a:Person {id: '1'}), (b:Person {id: '2'})
    CREATE (a)-[:KNOWS]->(b)
  `);

  // Query
  const result = await conn.query(`
    MATCH (p:Person)
    RETURN p.name
  `);
  const people = await result.getAll();
  console.log(people);

  // Cleanup
  await conn.close();
  await db.close();
}

main().catch(console.error);
```

## Next Steps

- Explore the [examples](../src/examples/) for more advanced patterns
- Check the [API Cheatsheet](api-cheatsheet.md) for quick reference
- Read about [Use Cases](use-cases.md) for real-world applications
