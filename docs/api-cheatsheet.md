# CongraphDB API Cheatsheet

Quick reference for the CongraphDB API and Cypher query language.

## Database Class

### Creating a Database

```typescript
import congraphdb from 'congraphdb';

// In-memory database
const db = new congraphdb.Database();

// File-based database
const db = new congraphdb.Database({
  path: './my-database.cgraph'
});

// With options
const db = new congraphdb.Database({
  path: './my-database.cgraph',
  readOnly: false,
  bufferSize: 1024 * 1024 * 256,  // 256MB
  compressionEnabled: true,
  walEnabled: true,
  checkpointInterval: 1000
});
```

### Database Methods

| Method | Description |
|--------|-------------|
| `db.connect()` | Create a new connection |
| `db.close()` | Close the database |

### Connection Methods

| Method | Description |
|--------|-------------|
| `conn.query(sql)` | Execute a Cypher query |
| `conn.beginTransaction()` | Start a transaction |
| `conn.commit()` | Commit transaction |
| `conn.rollback()` | Rollback transaction |
| `conn.close()` | Close the connection |

### QueryResult Methods

| Method | Description |
|--------|-------------|
| `result.getAll()` | Get all results as array |
| `result.getNext()` | Get next row (returns null at end) |
| `for await (const row of result)` | Async iteration |
| `result.getColumns()` | Get column metadata |

## Cypher Query Language

### CREATE - Creating Nodes

```cypher
-- Single node
CREATE (p:Person {name: 'Alice', age: 30})

-- Multiple nodes
CREATE (p1:Person {name: 'Alice'}),
       (p2:Person {name: 'Bob'})

-- With pattern
CREATE (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person {name: 'Bob'})
```

### MATCH - Querying Data

```cypher
-- All nodes
MATCH (p:Person) RETURN p

-- With filter
MATCH (p:Person {name: 'Alice'}) RETURN p

-- Pattern matching
MATCH (a:Person {name: 'Alice'})-[:KNOWS]->(b:Person)
RETURN b.name

-- Multiple patterns
MATCH (a:Person)-[:KNOWS]->(b:Person),
      (b)-[:KNOWS]->(c:Person)
RETURN a.name, b.name, c.name
```

### OPTIONAL MATCH - Optional Patterns

```cypher
MATCH (p:Person)
OPTIONAL MATCH (p)-[:WORKS_AT]->(c:Company)
RETURN p.name, c.name
-- Returns NULL for c if no company
```

### WHERE - Filtering

```cypher
MATCH (p:Person)
WHERE p.age >= 25 AND p.age < 35
RETURN p

-- String matching
MATCH (p:Person)
WHERE p.name STARTS WITH 'A'
RETURN p

-- Existence check
MATCH (p:Person)
WHERE p.email IS NOT NULL
RETURN p
```

### SET - Updating Properties

```cypher
-- Update single property
MATCH (p:Person {name: 'Alice'})
SET p.age = 31

-- Update multiple properties
MATCH (p:Person {name: 'Alice'})
SET p.age = 31, p.email = 'alice@example.com'

-- Set from map
MATCH (p:Person {name: 'Alice'})
SET p += {age: 31, city: 'NYC'}
```

### DELETE - Deleting Data

```cypher
-- Delete relationship
MATCH (a:Person {name: 'Alice'})-[r:KNOWS]->(b:Person)
DELETE r

-- Delete node (must have no relationships)
MATCH (p:Person {name: 'Bob'})
DELETE p

-- Delete node and relationships
MATCH (p:Person {name: 'Charlie'})
DETACH DELETE p
```

### RETURN - Result Specification

```cypher
-- All properties
MATCH (p:Person) RETURN p

-- Specific properties
MATCH (p:Person) RETURN p.name, p.age

-- Aliasing
MATCH (p:Person) RETURN p.name AS person_name

-- DISTINCT
MATCH (p:Person) RETURN DISTINCT p.city

-- LIMIT and SKIP
MATCH (p:Person) RETURN p ORDER BY p.name SKIP 10 LIMIT 5
```

### ORDER BY - Sorting

```cypher
-- Ascending
MATCH (p:Person) RETURN p ORDER BY p.name

-- Descending
MATCH (p:Person) RETURN p ORDER BY p.age DESC

-- Multiple fields
MATCH (p:Person) RETURN p ORDER BY p.city, p.name
```

### Aggregation Functions

| Function | Description |
|----------|-------------|
| `COUNT(expr)` | Count non-null values |
| `SUM(expr)` | Sum of values |
| `AVG(expr)` | Average of values |
| `MIN(expr)` | Minimum value |
| `MAX(expr)` | Maximum value |
| `COLLECT(expr)` | Collect into array |

```cypher
-- Count
MATCH (p:Person) RETURN COUNT(p)

-- Group by aggregation
MATCH (p:Person)
RETURN p.city, COUNT(p) AS count
ORDER BY count DESC

-- Multiple aggregations
MATCH (p:Person)
RETURN p.city,
       COUNT(p) AS people,
       AVG(p.age) AS avg_age
```

### Variable-Length Paths

```cypher
-- Exact length
MATCH (a:Person)-[:KNOWS*3]->(b:Person)
RETURN a, b

-- Range
MATCH (a:Person)-[:KNOWS*1..3]->(b:Person)
RETURN a, b

-- Any length
MATCH (a:Person)-[:KNOWS*]->(b:Person)
RETURN a, b
```

### CASE - Conditional Expressions

```cypher
MATCH (p:Person)
RETURN p.name,
       CASE
         WHEN p.age < 18 THEN 'Minor'
         WHEN p.age < 65 THEN 'Adult'
         ELSE 'Senior'
       END AS age_group
```

### WITH - Query Chaining

```cypher
-- Filter aggregation results
MATCH (p:Person)
WITH p.department, AVG(p.salary) AS avg_salary
WHERE avg_salary > 50000
RETURN p.department, avg_salary

-- Chain patterns
MATCH (p:Person)
WITH p
MATCH (p)-[:KNOWS]->(f:Person)
RETURN p.name, COLLECT(f.name) AS friends
```

### UNION - Combine Queries

```cypher
MATCH (p:Person) WHERE p.age < 25
RETURN p.name
UNION
MATCH (c:Company) WHERE c.employees < 10
RETURN c.name
```

### Transactions

```cypher
BEGIN TRANSACTION

-- Your queries here
MATCH (a:Account {id: '1'}) SET a.balance = a.balance - 100
MATCH (b:Account {id: '2'}) SET b.balance = b.balance + 100

COMMIT
-- or ROLLBACK
```

## Data Types

| Type | Description | Example |
|------|-------------|---------|
| `STRING` | Text string | `'hello'` |
| `INTEGER` | Whole number | `42` |
| `FLOAT` | Decimal number | `3.14` |
| `BOOLEAN` | True/false | `true`, `false` |
| `DATE` | Date | `DATE('2024-01-01')` |
| `FLOAT_VECTOR(n)` | Vector for similarity search | `[0.1, 0.2, 0.3]` |

## Pattern Comprehension

```cypher
-- Create array from pattern
MATCH (p:Person)
RETURN p.name, [(p)-[:KNOWS]->(f) | f.name] AS friends

-- With filter
MATCH (p:Person)
RETURN p.name, [(p)-[:KNOWS]->(f) WHERE f.age > 25 | f.name] AS older_friends
```

## List Operations

```cypher
-- Size
RETURN SIZE([1, 2, 3])  -- 3

-- Index
RETURN [1, 2, 3][0]     -- 1

-- Range
RETURN [1, 2, 3][0..1]  -- [1, 2]

-- IN operator
MATCH (p:Person) WHERE p.id IN ['1', '2', '3'] RETURN p
```

## Common Patterns

### Pagination

```cypher
-- Page 1 (items 1-10)
MATCH (p:Person) RETURN p ORDER BY p.name LIMIT 10

-- Page 2 (items 11-20)
MATCH (p:Person) RETURN p ORDER BY p.name SKIP 10 LIMIT 10

-- Page N
MATCH (p:Person) RETURN p ORDER BY p.name SKIP (N-1)*10 LIMIT 10
```

### Exists Pattern

```cypher
-- People who have friends
MATCH (p:Person)
WHERE (p)-[:KNOWS]->()
RETURN p

-- People with no friends
MATCH (p:Person)
WHERE NOT (p)-[:KNOWS]->()
RETURN p
```

### Shortest Path

```cypher
MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Bob'})
MATCH path = shortestPath((a)-[*]-(b))
RETURN path
```
