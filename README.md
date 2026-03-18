# CongraphDB Sample Project

> A comprehensive, easy-to-understand demo project that showcases all key features of CongraphDB

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![CongraphDB](https://img.shields.io/badge/CongraphDB-0.1.6-orange)](https://www.npmjs.com/package/@congraph-ai/congraphdb)

## What is CongraphDB?

CongraphDB is an embedded graph database that brings the power of graph data modeling to your applications without the overhead of a separate database server. It's perfect for:

- **Applications with complex relationships** - Social networks, recommendation engines, fraud detection
- **Local-first applications** - Desktop apps, CLI tools, embedded systems
- **Development and testing** - Fast, in-memory graph database for unit tests
- **AI/ML applications** - Native vector similarity search with HNSW indexing

## Features Demonstrated

This sample project showcases:

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

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- TypeScript 5.3+

### Installation

1. Clone this repository and navigate to the congraphdb-sample directory

2. Install dependencies:

```bash
npm install
```

3. Build and run the project:

```bash
npm run dev
```

This will build the TypeScript code and run all examples.

### Running Examples

Run all examples (builds first):

```bash
npm run dev
```

Run all examples (requires pre-built dist/):

```bash
npm start
```

Run a specific example:

```bash
# Cypher Query Language Examples (01-09)
npm start basics              # Basic CRUD operations
npm start social-network      # Social network graph demo
npm start transactions        # Transaction demo
npm start vector-search       # AI/Embedding similarity search
npm start configuration       # DB configuration options
npm start advanced-queries    # Complex Cypher patterns
npm start path-finding        # Path finding algorithms
npm start temporal-types      # Temporal data types
npm start advanced-features   # Multi-label, regex, maps

# JavaScript API Examples (10-14)
npm start javascript-api-basics       # JavaScript API fundamentals
npm start javascript-api-crud         # Advanced CRUD operations
npm start navigator-traversal         # Fluent graph traversal
npm start pattern-matching            # Pattern matching with find()
npm start when-to-use-what            # Choosing query interface
```

### Options

```bash
npm start -- --verbose        # Show query details
npm start -- --list           # List all examples
npm start -- --interactive    # Interactive mode
npm start -- --help           # Show help
```

## Project Structure

```
congraphdb-sample/
├── src/
│   ├── examples/              # Example scripts
│   │   ├── 01-basics.ts              # Cypher: Basic CRUD
│   │   ├── 02-social-network.ts      # Cypher: Social graph
│   │   ├── 03-transactions.ts        # Cypher: Transactions
│   │   ├── 04-vector-search.ts       # Cypher: Vector search
│   │   ├── 05-configuration.ts       # Config options
│   │   ├── 06-advanced-queries.ts    # Cypher: Advanced queries
│   │   ├── 07-path-finding.ts        # Cypher: Path finding
│   │   ├── 08-temporal-types.ts      # Cypher: Temporal types
│   │   ├── 09-advanced-features.ts   # Cypher: Advanced features
│   │   ├── 10-javascript-api-basics.ts       # JS API: Basics
│   │   ├── 11-javascript-api-crud.ts         # JS API: CRUD
│   │   ├── 12-navigator-traversal.ts         # Navigator: Traversal
│   │   ├── 13-pattern-matching.ts            # JS API: Patterns
│   │   └── 14-when-to-use-what.ts            # Comparison guide
│   ├── utils/                 # Helper utilities
│   │   ├── logger.ts          # Colored console output
│   │   ├── timer.ts           # Performance timing
│   │   └── helpers.ts         # DB helpers
│   └── index.ts               # CLI entry point
├── data/                      # Database files created during examples
├── docs/                      # Documentation
│   ├── tutorial.md
│   ├── api-cheatsheet.md
│   └── use-cases.md
├── package.json
├── tsconfig.json
└── README.md
```

## Example Descriptions

### 01 - Basics

Learn the fundamentals:
- Creating/opening a database
- Defining node and relationship tables
- CREATE, MATCH, UPDATE, DELETE operations

**Time:** 5 minutes

### 02 - Social Network

Real-world graph modeling:
- Multiple node types (User, Post, Comment)
- Multiple relationship types (FOLLOWS, POSTED, LIKED)
- 2-hop and 3-hop queries
- Content recommendations

**Time:** 10 minutes

### 03 - Transactions

ACID transaction guarantees:
- Multi-operation transactions
- Commit and rollback
- Error handling
- Banking system use case

**Time:** 8 minutes

### 04 - Vector Search

AI/ML integration:
- FLOAT_VECTOR columns
- Similarity search with <-> operator
- Semantic document search
- Recommendations by similarity

**Time:** 10 minutes

### 05 - Configuration

Database optimization:
- In-memory vs file-based
- Buffer size tuning
- Compression options
- WAL and checkpointing

**Time:** 8 minutes

### 06 - Advanced Queries

Complex Cypher patterns:
- OPTIONAL MATCH
- Variable-length paths
- Aggregation functions
- Pattern comprehensions
- CASE expressions

**Time:** 12 minutes

### 07 - Path Finding

Graph traversal and path finding:
- shortestPath() - Find shortest path between nodes
- allShortestPaths() - Find all shortest paths
- Variable-length path patterns [*1..n]
- Relationship direction control
- Use cases: Route optimization, social network analysis

**Time:** 10 minutes

### 08 - Temporal Types

Working with dates and times:
- DATE, DATETIME, DURATION types
- date(), datetime(), timestamp() functions
- Date arithmetic and comparisons
- ISO 8601 duration parsing
- Time-based analytics

**Time:** 10 minutes

### 09 - Advanced Features

Advanced Cypher language features:
- Multi-label nodes for rich classification
- Regex pattern matching with =~
- Map literals for dynamic data structures
- Role-based access control patterns
- Email validation and filtering

**Time:** 12 minutes

### 10 - JavaScript API Basics

Introduction to CongraphDB's JavaScript Native API:
- Initializing CongraphDBAPI
- Creating nodes with createNode()
- Creating edges with createEdge()
- Retrieving nodes with getNode()
- Comparison with equivalent Cypher queries

**Time:** 10 minutes

### 11 - JavaScript API CRUD

Comprehensive CRUD operations using JavaScript API:
- createNode(), getNode(), getNodesByLabel()
- updateNode(), deleteNode() with detach
- createEdge(), getEdge(), getEdges()
- updateEdge(), deleteEdge()
- Batch operations and error handling

**Time:** 12 minutes

### 12 - Navigator Traversal

Fluent graph traversal with Navigator API:
- Basic traversal: .out(), .in(), .both()
- Multi-hop traversals
- Filtering with .where() and .limit()
- Path finding with .to()
- Async iteration with for await...of
- LevelGraph compatibility

**Time:** 12 minutes

### 13 - Pattern Matching

Declarative pattern matching with find() and v():
- Subject-predicate-object patterns
- Variable binding with v()
- Multi-pattern queries
- Property filters
- Combining with Navigator
- Pattern class for reusable queries

**Time:** 10 minutes

### 14 - Choosing Your Query Interface

Side-by-side comparison of all three interfaces:
- Performance characteristics
- Decision tree for choosing an interface
- Use case recommendations
- When to mix interfaces
- Summary comparison table

**Time:** 15 minutes

## Documentation

- **[Tutorial](docs/tutorial.md)** - Step-by-step guide from zero to working app
- **[API Cheatsheet](docs/api-cheatsheet.md)** - Quick reference for CongraphDB API
- **[Use Cases](docs/use-cases.md)** - Real-world application scenarios

## Development

### Building

```bash
npm run build
```

### Cleaning

Remove build artifacts and database files:

```bash
npm run clean
```

### Adding New Examples

1. Create a new file in `src/examples/`
2. Export a `run(verbose?: boolean): Promise<void>` function
3. Import and register in `src/index.ts`
4. Add documentation

## Contributing

Contributions are welcome! This is a community-focused project to help developers learn CongraphDB.

## License

MIT

## Links

- [CongraphDB on npm](https://www.npmjs.com/package/@congraph-ai/congraphdb)
- [CongraphDB Repository](https://github.com/congraph-ai/congraphdb)
- [Official Documentation](https://congraph-ai.github.io/congraphdb-docs/)
- [Cypher Query Language](https://opencypher.org/)
- [Project Documentation](docs/)
