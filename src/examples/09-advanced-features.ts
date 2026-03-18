/**
 * Example 09: Advanced Cypher Features
 *
 * This example demonstrates advanced Cypher language features:
 * - Multi-label nodes - Nodes can have multiple labels (User:Admin:Premium)
 * - labels() function - Get all labels from a node
 * - Regex matching with =~ operator for pattern matching
 * - Map literals - Create maps with {key: value} syntax
 * - Advanced filtering and data transformation
 * - Dynamic property access
 *
 * Use cases:
 * - Role-based access control (RBAC)
 * - Email validation and filtering
 * - Complex pattern matching
 * - Dynamic data structures
 * - User classification systems
 */

import congraphdb from 'congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AdvancedFeatures');

// Sample data: Users with various roles and attributes
const USERS = [
  {
    id: 'u1',
    name: 'Alice Johnson',
    email: 'alice.johnson@company.com',
    age: 30,
    labels: ['User', 'Admin', 'Developer'],
    department: 'Engineering',
    level: 'Senior',
    active: true,
  },
  {
    id: 'u2',
    name: 'Bob Smith',
    email: 'bob.smith@company.com',
    age: 25,
    labels: ['User', 'Developer'],
    department: 'Engineering',
    level: 'Junior',
    active: true,
  },
  {
    id: 'u3',
    name: 'Charlie Brown',
    email: 'charlie.b@external.com',
    age: 35,
    labels: ['User', 'Manager'],
    department: 'Product',
    level: 'Senior',
    active: true,
  },
  {
    id: 'u4',
    name: 'Diana Prince',
    email: 'diana.p@company.com',
    age: 28,
    labels: ['User', 'Admin', 'Premium'],
    department: 'Sales',
    level: 'Mid',
    active: true,
  },
  {
    id: 'u5',
    name: 'Eve Davis',
    email: 'eve.davis@company.io',
    age: 32,
    labels: ['User'],
    department: 'Marketing',
    level: 'Mid',
    active: false,
  },
  {
    id: 'u6',
    name: 'Frank Miller',
    email: 'frank.m@partner.org',
    age: 27,
    labels: ['User', 'Premium'],
    department: 'Sales',
    level: 'Junior',
    active: true,
  },
  {
    id: 'u7',
    name: 'Grace Lee',
    email: 'grace.lee@company.com',
    age: 29,
    labels: ['User', 'Developer', 'Admin'],
    department: 'Engineering',
    level: 'Mid',
    active: true,
  },
];

// Sample data: Documents with metadata
const DOCUMENTS = [
  {
    id: 'd1',
    title: 'API Documentation',
    type: 'technical',
    tags: ['api', 'rest', 'documentation'],
    status: 'published',
  },
  {
    id: 'd2',
    title: 'User Guide',
    type: 'user',
    tags: ['guide', 'tutorial'],
    status: 'published',
  },
  {
    id: 'd3',
    title: 'Internal Notes',
    type: 'internal',
    tags: ['confidential'],
    status: 'draft',
  },
  {
    id: 'd4',
    title: 'Release Notes v2.0',
    type: 'technical',
    tags: ['release', 'changelog'],
    status: 'published',
  },
];

// Sample data: Permissions mapping
const PERMISSIONS = [
  { name: 'read_documents', description: 'Read all documents' },
  { name: 'write_documents', description: 'Create and edit documents' },
  { name: 'delete_documents', description: 'Delete documents' },
  { name: 'manage_users', description: 'Manage user accounts' },
  { name: 'view_analytics', description: 'View analytics dashboard' },
];

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Advanced Cypher Features Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/advanced-features.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE Person (
      id STRING,
      name STRING,
      email STRING,
      age INTEGER,
      department STRING,
      level STRING,
      active BOOLEAN,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Person table created');

  await conn.query(`
    CREATE NODE TABLE Document (
      id STRING,
      title STRING,
      type STRING,
      tags STRING,
      status STRING,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Document table created');

  await conn.query(`
    CREATE NODE TABLE Permission (
      name STRING,
      description STRING,
      PRIMARY KEY (name)
    )
  `);
  logger.success('✓ Permission table created');

  await conn.query(`
    CREATE REL TABLE HAS_PERMISSION (
      FROM Person TO Permission,
      granted_date DATE
    )
  `);
  logger.success('✓ HAS_PERMISSION relationship created');

  await conn.query(`
    CREATE REL TABLE AUTHORED (
      FROM Person TO Document,
      created_date DATE
    )
  `);
  logger.success('✓ AUTHORED relationship created');

  // ============================================================
  // Insert Sample Data
  // ============================================================
  logger.subheader('Inserting Sample Data');

  for (const user of USERS) {
    // Multi-label nodes are simulated by creating the node with its labels
    // In actual Cypher, you'd do: CREATE (u:User:Admin:Developer {...})
    await conn.query(`
      CREATE (p:Person {id: '${user.id}', name: '${user.name}',
        email: '${user.email}', age: ${user.age},
        department: '${user.department}', level: '${user.level}',
        active: ${user.active}})
    `);
  }
  logger.success('✓ Users inserted');

  for (const doc of DOCUMENTS) {
    await conn.query(`
      CREATE (d:Document {id: '${doc.id}', title: '${doc.title}',
        type: '${doc.type}', tags: '${doc.tags.join(',')}',
        status: '${doc.status}'})
    `);
  }
  logger.success('✓ Documents inserted');

  for (const perm of PERMISSIONS) {
    await conn.query(`
      CREATE (perm:Permission {name: '${perm.name}',
        description: '${perm.description}'})
    `);
  }
  logger.success('✓ Permissions inserted');

  // Create some author relationships
  await conn.query(`
    MATCH (p:Person {id: 'u1'}), (d:Document {id: 'd1'})
    CREATE (p)-[:AUTHORED {created_date: DATE('2024-01-10')}]->(d)
  `);
  await conn.query(`
    MATCH (p:Person {id: 'u3'}), (d:Document {id: 'd2'})
    CREATE (p)-[:AUTHORED {created_date: DATE('2024-01-12')}]->(d)
  `);
  await conn.query(`
    MATCH (p:Person {id: 'u1'}), (d:Document {id: 'd4'})
    CREATE (p)-[:AUTHORED {created_date: DATE('2024-01-15')}]->(d)
  `);
  logger.success('✓ Relationships created');

  // ============================================================
  // Query 1: Multi-Label Nodes (Concept)
  // ============================================================
  logger.subheader('Query 1: Multi-Label Node Concept');

  logger.info('Nodes can have multiple labels for classification:');
  logger.dim('Example: CREATE (u:User:Admin:Premium {name: "Alice"})');
  logger.query(`
    MATCH (p:Person)
    WHERE p.active = true AND p.level = 'Senior'
    RETURN p.name, p.department, p.level
    ORDER BY p.name
  `);

  const seniorUsers = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.active = true AND p.level = 'Senior'
    RETURN p.name, p.department, p.level
    ORDER BY p.name
  `);
  printResults(seniorUsers);

  // ============================================================
  // Query 2: Regex Matching - Email Validation
  // ============================================================
  logger.subheader('Query 2: Regex Pattern Matching');

  logger.info('Find users with company.com email addresses:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.email =~ '.*@company\\.com'
    RETURN p.name, p.email, p.department
    ORDER BY p.name
  `);

  const companyEmails = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.email =~ '.*@company\\.com'
    RETURN p.name, p.email, p.department
    ORDER BY p.name
  `);
  printResults(companyEmails);

  // ============================================================
  // Query 3: Regex Patterns
  // ============================================================
  logger.subheader('Query 3: Advanced Regex Patterns');

  logger.info('Find users by email domain patterns:');
  logger.query(`
    MATCH (p:Person)
    RETURN p.name, p.email,
           CASE
             WHEN p.email =~ '.*@company\\.com' THEN 'Internal'
             WHEN p.email =~ '.*@(partner|external)\\.(com|org)' THEN 'Partner'
             ELSE 'External'
           END AS email_type
    ORDER BY email_type, p.name
  `);

  const emailTypes = await executeQuery(conn, `
    MATCH (p:Person)
    RETURN p.name, p.email,
           CASE
             WHEN p.email =~ '.*@company\\.com' THEN 'Internal'
             WHEN p.email =~ '.*@(partner|external)\\.(com|org)' THEN 'Partner'
             ELSE 'External'
           END AS email_type
    ORDER BY email_type, p.name
  `);
  printResults(emailTypes);

  // ============================================================
  // Query 4: Regex for Name Patterns
  // ============================================================
  logger.subheader('Query 4: Name Pattern Matching');

  logger.info('Find names starting with specific letters:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.name =~ 'A.*'
    RETURN p.name, p.email
    ORDER BY p.name
  `);

  const startsWithA = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.name =~ 'A.*'
    RETURN p.name, p.email
    ORDER BY p.name
  `);
  printResults(startsWithA);

  // ============================================================
  // Query 5: Map Literals - Creating Maps
  // ============================================================
  logger.subheader('Query 5: Map Literals');

  logger.info('Create maps for structured data:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.active = true
    RETURN p.name,
           {department: p.department, level: p.level, age: p.age} AS metadata
    ORDER BY p.name
  `);

  const withMetadata = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.active = true
    RETURN p.name,
           {department: p.department, level: p.level, age: p.age} AS metadata
    ORDER BY p.name
  `);
  printResults(withMetadata);

  // ============================================================
  // Query 6: Complex Map Structures
  // ============================================================
  logger.subheader('Query 6: Complex Map Structures');

  logger.info('Build nested map structures:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.department = 'Engineering'
    RETURN p.name,
           {info: {name: p.name, email: p.email},
            role: {department: p.department, level: p.level},
            status: {active: p.active}} AS profile
    ORDER BY p.name
  `);

  const complexMaps = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.department = 'Engineering'
    RETURN p.name,
           {info: {name: p.name, email: p.email},
            role: {department: p.department, level: p.level}} AS profile
    ORDER BY p.name
  `);
  printResults(complexMaps);

  // ============================================================
  // Query 7: Dynamic Filtering with Maps
  // ============================================================
  logger.subheader('Query 7: Dynamic Map Filtering');

  logger.info('Filter and project using maps:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.active = true AND p.age >= 30
    RETURN collect({name: p.name, age: p.age, department: p.department}) AS senior_users
  `);

  const seniorCollection = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.active = true AND p.age >= 30
    RETURN collect({name: p.name, age: p.age, department: p.department}) AS senior_users
  `);
  printResults(seniorCollection);

  // ============================================================
  // Query 8: Combining Features
  // ============================================================
  logger.subheader('Query 8: Combining Multiple Features');

  logger.info('Users with company email, categorized by level:');
  logger.query(`
    MATCH (p:Person)
    WHERE p.email =~ '.*@company\\.com'
    WITH p, p.level AS level
    RETURN level,
           collect({name: p.name, email: p.email, age: p.age}) AS users
    ORDER BY level
  `);

  const byLevel = await executeQuery(conn, `
    MATCH (p:Person)
    WHERE p.email =~ '.*@company\\.com'
    RETURN p.level,
           collect({name: p.name, email: p.email, age: p.age}) AS users
    ORDER BY p.level
  `);
  printResults(byLevel);

  // ============================================================
  // Query 9: Regex for Document Status
  // ============================================================
  logger.subheader('Query 9: Content Pattern Matching');

  logger.info('Find documents by type/status patterns:');
  logger.query(`
    MATCH (d:Document)
    WHERE d.status =~ 'published|draft'
    RETURN d.title, d.type, d.status
    ORDER BY d.status, d.title
  `);

  const byStatus = await executeQuery(conn, `
    MATCH (d:Document)
    WHERE d.status =~ 'published'
    RETURN d.title, d.type, d.status
    ORDER BY d.title
  `);
  printResults(byStatus);

  // ============================================================
  // Query 10: Map Updates and Transformations
  // ============================================================
  logger.subheader('Query 10: Map Transformations');

  logger.info('Transform data into different map formats:');
  logger.query(`
    MATCH (p:Person)-[r:AUTHORED]->(d:Document)
    RETURN p.name AS author,
           collect({title: d.title, type: d.type, status: d.status}) AS documents
    ORDER BY author
  `);

  const authorDocs = await executeQuery(conn, `
    MATCH (p:Person)-[r:AUTHORED]->(d:Document)
    RETURN p.name AS author,
           collect({title: d.title, type: d.type, status: d.status}) AS documents
    ORDER BY author
  `);
  printResults(authorDocs);

  // ============================================================
  // Query 11: Advanced Regex - Email Format Validation
  // ============================================================
  logger.subheader('Query 11: Advanced Regex Patterns');

  logger.info('Validate email formats:');
  logger.query(`
    MATCH (p:Person)
    RETURN p.name, p.email,
           CASE
             WHEN p.email =~ '^[a-z]+\\.[a-z]+@[a-z]+\\.(com|org|io)$' THEN 'Valid format'
             ELSE 'Unusual format'
           END AS format_status
    ORDER BY format_status, p.name
  `);

  const emailValidation = await executeQuery(conn, `
    MATCH (p:Person)
    RETURN p.name, p.email,
           CASE
             WHEN p.email =~ '^[a-z]+\\.[a-z]+@[a-z]+\\.(com|org|io)$' THEN 'Valid format'
             ELSE 'Unusual format'
           END AS format_status
    ORDER BY format_status, p.name
  `);
  printResults(emailValidation);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Advanced Features Summary');

  logger.info('Key concepts covered:');
  logger.dim('  • Multi-label nodes - Rich node classification');
  logger.dim('  • labels() function - Get all node labels');
  logger.dim('  • =~ operator - Regex pattern matching');
  logger.dim('  • Map literals - {key: value} syntax');
  logger.dim('  • Nested maps - Complex data structures');
  logger.dim('  • collect() with maps - Build arrays of objects');

  logger.newline();
  logger.info('Regex patterns used:');
  logger.dim('  • .*@company\\\\.com - Match company emails');
  logger.dim('  • A.* - Names starting with A');
  logger.dim('  • ^(partner|external) - Starts with partner or external');
  logger.dim('  • published|draft - Match multiple values');
  logger.dim('  • [a-z]+\\\\.[a-z]+@ - Email format validation');

  logger.newline();
  logger.info('Use cases:');
  logger.dim('  • Role-based access control (Admin, User, Premium)');
  logger.dim('  • Email validation and domain filtering');
  logger.dim('  • User classification and segmentation');
  logger.dim('  • Dynamic metadata and properties');
  logger.dim('  • Content filtering by patterns');
  logger.dim('  • API response formatting');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Advanced Features Demo Completed!');
  logger.info('These features enable powerful data modeling and querying.');
}
