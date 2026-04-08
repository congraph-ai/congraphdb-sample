/**
 * ConGraphDB TypeScript Basic Usage Example
 *
 * This example demonstrates basic TypeScript usage with ConGraphDB.
 *
 * @version 0.2.0
 */

import { Database, Connection } from 'congraphdb'
import type { Node, Edge } from 'congraphdb'

// ============================================================================
// Type Definitions
// ============================================================================

// UserProperties is used for type annotations but Node/Edge aren't generic
interface UserProperties {
  name: string
  age: number
  email?: string
  createdAt?: string
}

interface KnowsProperties {
  since: number
  strength?: number
}

type UserNode = Node & UserProperties
type KnowsEdge = Edge & KnowsProperties

// ============================================================================
// Database Connection
// ============================================================================

async function main() {
  // Create database connection
  const db = new Database('./example.cgraph')
  const connResult = db.createConnection()

  if ('err' in connResult) {
    console.error('Failed to create connection:', connResult.err)
    return
  }

  const conn = connResult

  try {
    // Initialize database
    await db.init()

    // Create tables
    await createUserTables(conn)

    // Create some users
    const alice = await create(conn, {
      _id: 'user-1',
      _label: 'User',
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
      createdAt: new Date().toISOString()
    })

    const bob = await create(conn, {
      _id: 'user-2',
      _label: 'User',
      name: 'Bob',
      age: 25,
      email: 'bob@example.com',
      createdAt: new Date().toISOString()
    })

    // Create relationship
    await createRelationship(conn, {
      _id: 'rel-1',
      _type: 'KNOWS',
      _from: 'user-1',
      _to: 'user-2',
      since: 2020,
      strength: 0.9
    })

    // Query users
    const users = await query(conn, "MATCH (u:User) RETURN u")
    console.log('Users:', users)

    // Query relationships
    const relationships = await query(conn, "MATCH ()-[r:KNOWS]->() RETURN r")
    console.log('Relationships:', relationships)

    // Find user by name
    const aliceResult = await findByName(conn, 'Alice')
    if (!('err' in aliceResult)) {
      console.log('Found Alice:', aliceResult)
    } else {
      console.log('Alice not found:', aliceResult.err)
    }

  } finally {
    // Cleanup
    await db.close()
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createUserTables(conn: Connection): Promise<void> {
  // Create user table
  await conn.createNodeTable('User', [
    { name: 'name', type: 'string', nullable: false },
    { name: 'age', type: 'int64', nullable: false },
    { name: 'email', type: 'string', nullable: true },
    { name: 'createdAt', type: 'string', nullable: true }
  ], 'name')

  // Create relationship table
  await conn.createRelTable('KNOWS', 'User', 'User', [
    { name: 'since', type: 'int64', nullable: false },
    { name: 'strength', type: 'float', nullable: true }
  ])
}

async function create(
  conn: Connection,
  node: Node
): Promise<Node> {
  const propsStr = Object.entries(node)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')
  const query = `CREATE (n:${node._label} {${propsStr}}) RETURN n`
  const result = await conn.query(query)
  if ('err' in result) {
    throw new Error(`Failed to create node: ${result.err.message}`)
  }
  return node
}

async function createRelationship(
  conn: Connection,
  edge: Edge
): Promise<Edge> {
  const propsStr = Object.entries(edge)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ')
  const query = `
    MATCH (a {_id: "${edge._from}"}), (b {_id: "${edge._to}"})
    CREATE (a)-[r:${edge._type} {${propsStr}}]->(b)
    RETURN r
  `
  const result = await conn.query(query)
  if ('err' in result) {
    throw new Error(`Failed to create relationship: ${result.err.message}`)
  }
  return edge
}

async function query(
  conn: Connection,
  cypher: string
): Promise<any[]> {
  const result = await conn.query(cypher)
  if ('err' in result) {
    console.error('Query failed:', result.err)
    return []
  }
  const rows = result.getAll()
  if ('err' in rows) {
    console.error('Failed to get rows:', rows.err)
    return []
  }
  return rows as any[]
}

async function findByName(
  conn: Connection,
  name: string
): Promise<Node | { err: Error }> {
  const result = await conn.query(`MATCH (u:User {name: "${name}"}) RETURN u`)
  if ('err' in result) {
    return { err: result.err }
  }
  const rows = result.getAll()
  if ('err' in rows) {
    return { err: rows.err }
  }
  if (rows.length === 0) {
    return { err: new Error('User not found') }
  }
  return rows[0] as Node
}

// ============================================================================
// Run Example
// ============================================================================

main().catch(console.error)
