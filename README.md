# CongraphDB SDK

> A comprehensive, easy-to-understand SDK that showcases all key features of CongraphDB

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![CongraphDB](https://img.shields.io/badge/CongraphDB-0.1.11-orange)](https://www.npmjs.com/package/congraphdb)

## What is CongraphDB?

CongraphDB is an embedded graph database that brings the power of graph data modeling to your applications without the overhead of a separate database server. It's perfect for:

- **Applications with complex relationships** - Social networks, recommendation engines, fraud detection
- **Local-first applications** - Desktop apps, CLI tools, embedded systems
- **Development and testing** - Fast, in-memory graph database for unit tests
- **AI/ML applications** - Native vector similarity search with HNSW indexing

## Features Demonstrated

This SDK showcases:

### Cypher Query Language (Examples 01-09)
- **Core Graph Operations** - Creating nodes, relationships, and querying with Cypher
- **Transactions** - ACID guarantees with begin, commit, and rollback
- **Vector Similarity Search** - HNSW-based approximate nearest neighbor search
- **Advanced Queries** - Variable-length paths, aggregation, pattern comprehension
- **Configuration Options** - In-memory vs file-based, compression, WAL tuning
- **Path Finding** - shortestPath() and allShortestPaths() for graph traversal
- **Temporal Types** - DATE, DATETIME, DURATION for time-based queries
- **Advanced Features** - Multi-label nodes, regex matching, map literals

### JavaScript Native API (Examples 10-14)
- **JavaScript API Basics** - CongraphDBAPI for programmatic graph operations
- **CRUD Operations** - createNode, getNode, updateNode, deleteNode, createEdge, etc.
- **Navigator Traversal** - Fluent API for graph traversal (LevelGraph-compatible)
- **Pattern Matching** - Declarative pattern matching with find() and v() variables
- **Interface Comparison** - When to use Cypher vs JavaScript API vs Navigator

### High-level SDK (Example 15)
- **CongraphSDK Wrapper** - Simple class for common note-taking and graph operations
- **Filesystem Synchronization** - Automatic syncing of database nodes to Markdown files
- **Knowledge Graph Management** - Automatic wiki-link (`[[Note Title]]`) parsing and linkage
- **Plugin-ready Structure** - Clean separation of concerns for easy integration

### v0.1.8 Features (Examples 16-21)
- **OCC Transactions** - Optimistic Concurrency Control for high-concurrency scenarios
- **Schema API** - JavaScript-native schema creation and management
- **Graph Algorithms** - PageRank, Community Detection, Traversal, Analytics

### v0.1.10 Features (Examples 22-25)
- **Document API** - Specialized methods for RAG workflows (`createChunk`, `createEntity`, `createFact`)
- **SQL DDL Support** - `CREATE NODE TABLE` and `INSERT INTO` syntax
- **Lock Manager** - Deadlock prevention and transaction coordination
- **Enhanced Types** - Generic `Node<T>`, `Edge<T>`, and `Result<T>` for superior DX

### v0.1.11 Features (Examples 26-29)
- **Explicit Transactions** - `BEGIN` and `COMMIT` statements in Cypher
- **Hierarchical Louvain** - Multi-level community detection and label application
- **WAL Durability** - Enhanced crash recovery and undo logging
- **Algorithm Updates** - Dijkstra, stable Leiden, and normalized closeness centrality

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm or pnpm
- TypeScript 5.3+

### Installation

1. Clone this repository and navigate to the `congraphdb-sdk` directory.

2. Install dependencies:

```bash
npm install
```

3. Build and run the project:

```bash
npm run dev
```

This will build the TypeScript code and run the interactive CLI.

### Running Examples

Run all examples (builds first):

```bash
npm run dev
```

Run a specific example:

```bash
# v0.1.8 Examples (New!)
npm start occ-transactions              # OCC Transactions
npm start schema-api                     # JavaScript Schema API
npm start algorithms-centrality          # Centrality Algorithms
npm start algorithms-community           # Community Detection
npm start algorithms-traversal           # Traversal & Path Algorithms
npm start algorithms-analytics            # Graph Analytics

# v0.1.10 Examples (New!)
npm start document-api                    # Document API for RAG
npm start sql-ddl                         # SQL-style schema definition

# High-level SDK Example
npm start notes-sdk                      # High-level SDK wrapper demo

# JavaScript API Examples (10-14)
npm start javascript-api-basics          # JavaScript API fundamentals
npm start javascript-api-crud            # JavaScript API CRUD operations
npm start navigator-traversal            # Fluent graph traversal
npm start pattern-matching               # Pattern matching with find()

# Cypher Query Language Examples (01-09)
npm start basics                         # Basic CRUD operations
npm start social-network                 # Social network graph demo
npm start transactions                   # Transaction demo (ACID)
npm start vector-search                  # AI/Embedding similarity search
npm start configuration                  # Database configuration options
npm start advanced-queries               # Complex Cypher patterns
npm start path-finding                   # Path finding algorithms
npm start temporal-types                 # Temporal data types
npm start advanced-features              # Multi-label, regex, maps
```

## SDK Architecture

The `CongraphSDK` is designed with a plugin-style architecture that allows switching between different query engines while maintaining a consistent high-level interface.

### Dual-Engine Support
- **`DatabaseJavaScript`**: Uses the native JavaScript `CongraphDBAPI`. Ideal for low-latency programmatic access and simple traversals. Excellent for environments where Cypher parsing overhead is unwanted.
- **`DatabaseCypher`**: Uses the full Cypher query engine. Ideal for complex relational queries, pattern matching, and developers coming from Neo4j background.

### Filesystem Synchronization
The SDK maintains a "Single Source of Truth" in the graph database while automatically synchronizing state to the filesystem:
- **Database → Filesystem**: When a note is created or updated via the SDK, a corresponding `.md` file is generated with YAML frontmatter.
- **Filesystem → Database**: On initialization, the SDK can scan the notes directory and restore/update the graph from the markdown files, allowing for "local-first" workflows where users can edit files in their favorite editor (like Obsidian or VS Code).

## SDK Reference

### Initialization

```typescript
import { CongraphSDK } from 'congraphdb-sdk';

// Initialize with DB path, notes directory, and engine choice
const sdk = new CongraphSDK(
  './data/notes.cgraph', 
  './data/notes',
  'javascript' // or 'cypher'
);

await sdk.init();
```

### Core Operations

| Method | Description |
|--------|-------------|
| `createNote(input)` | Create a note and sync to file. Automatically parses `[[wiki-links]]`. |
| `getNote(id)` | Retrieve a note by its ID. |
| `updateNote(id, input)` | Update note content/metadata and sync to file. |
| `deleteNote(id)` | Remove note from DB and delete its markdown file. |
| `listNotes(limit, offset)` | Paginated list of all notes. |

### Graph & Search

| Method | Description |
|--------|-------------|
| `getNeighbors(id, depth)` | Get related nodes within N hops. |
| `getGraphData(centerId)` | Get nodes and edges for visualization. |
| `searchNotes(query)` | Full-text search with relevance scoring. |
| `getSuggestions(query)` | Title/Tag completion for UI search bars. |
| `findPath(from, to)` | Find the shortest link path between two notes. |
| `getBacklinks(id)` | Find all notes that link TO this note. |

### OCC Methods (v0.1.8+)

| Method | Description |
|--------|-------------|
| `withRetry(fn, maxRetries)` | Execute operation with automatic OCC retry |
| `getOccStatistics()` | Get OCC conflict metrics |
| `resetOccStatistics()` | Reset OCC statistics counters |

### Algorithm Helpers (v0.1.8+)

| Method | Description |
|--------|-------------|
| `pageRank(options)` | Run PageRank algorithm |
| `degreeCentrality(options)` | Calculate degree centrality |
| `betweennessCentrality(options)` | Calculate betweenness centrality |
| `detectCommunitiesLouvain(options)` | Run Louvain community detection |
| `detectCommunitiesSLPA(options)` | Run SLPA for overlapping communities |
| `shortestPath(options)` | Find shortest paths with Dijkstra |
| `bfs(options)` | Breadth-first search traversal |
| `triangleCount()` | Count triangles in the graph |
| `connectedComponents(options)` | Find connected components |

### Document API (v0.1.10+)

| Method | Description |
|--------|-------------|
| `createChunk(properties)` | Create a document chunk with vector embedding |
| `createEntity(label, props)` | Create a named entity in the knowledge graph |
| `createFact(fromId, toId, type)` | Create a relationship between entities |
| `nodeExists(id)` | Check if a node exists by ID |


## Migration Guide

This SDK was built to centralize and standardize the database logic previously found in the `graph-mind` project.

### From logic in `graph-mind`

**Old Pattern:**
```typescript
// Spread across multiple services
const db = new Database('...');
const conn = db.createConnection();
await conn.query('CREATE TABLE ...');
// Manual sync logic everywhere
```

**New SDK Pattern:**
```typescript
import { CongraphSDK } from 'congraphdb-sdk';

const sdk = new CongraphSDK();
await sdk.init(); // Handles connection, schema, and directory setup

// High-level operations handle the complexity
const note = await sdk.createNote({ title: 'New Note', content: '...' });
```

## Project Structure

```
congraphdb-sdk/
├── src/
│   ├── lib/                   # Core SDK Library
│   │   ├── types.ts           # Type definitions
│   │   ├── common.ts          # Shared utilities (wiki-link parsing, idify)
│   │   ├── javascript.ts      # JavaScript API implementation
│   │   ├── cypher.ts          # Cypher implementation & Schema
│   │   └── sdk.ts             # Main High-level entry point
│   ├── examples/              # Demonstration scripts (01-21)
│   ├── cli.ts                 # CLI Demo runner
│   └── index.ts               # SDK Export entry point
├── data/                      # Sample database and notes
├── README.md
└── package.json
```

## Contributing

Contributions are welcome! This is a community-focused project to help developers learn and build with CongraphDB.

## License

MIT

## Links

- [CongraphDB on npm](https://www.npmjs.com/package/congraphdb)
- [CongraphDB Repository](https://github.com/congraph-ai/congraphdb)
- [Official Documentation](https://congraph-ai.github.io/congraphdb-docs/)
- [Cypher Query Language](https://opencypher.org/)

