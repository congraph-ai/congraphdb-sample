/**
 * Example 11: JavaScript API - Advanced CRUD Operations
 *
 * This example demonstrates comprehensive CRUD (Create, Read, Update, Delete)
 * operations using the CongraphDB JavaScript Native API.
 *
 * The NodeAPI and EdgeAPI classes provide a complete set of operations
 * for managing nodes and relationships programmatically.
 *
 * Covered operations:
 * - CREATE: createNode(), createEdge()
 * - READ: getNode(), getNodesByLabel(), getEdge(), getEdges()
 * - UPDATE: updateNode(), updateEdge()
 * - DELETE: deleteNode(), deleteEdge() (with and without detach)
 *
 * Also demonstrates:
 * - Batch operations
 * - Edge filtering by direction
 * - Error handling
 * - Using the NodeAPI and EdgeAPI directly
 */

import congraphdb, { CongraphDBAPI, NodeAPI, EdgeAPI } from '@congraph-ai/congraphdb';
import { createDatabase } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('JavaScriptCRUD');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('JavaScript API - CRUD Operations');

  // ============================================================
  // Setup
  // ============================================================
  logger.subheader('Setup');

  const db = await createDatabase({
    path: './data/js-api-crud.cgraph',
    inMemory: false,
  });

  const api = new CongraphDBAPI(db);
  const conn = db.createConnection();

  // Define schema
  logger.info('Creating schema...');
  await conn.query(`
    CREATE NODE TABLE User (
      id STRING,
      username STRING,
      email STRING,
      role STRING,
      active BOOLEAN,
      lastLogin INTEGER,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE NODE TABLE Project (
      id STRING,
      name STRING,
      description STRING,
      status STRING,
      createdAt INTEGER,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE ASSIGNED_TO (
      FROM User TO Project,
      role STRING,
      assignedAt INTEGER
    )
  `);

  await conn.query(`
    CREATE REL TABLE FOLLOWS (
      FROM User TO User,
      since INTEGER
    )
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // CREATE Operations
  // ============================================================
  logger.subheader('CREATE Operations');

  logger.info('Creating users with createNode()...');
  const users = await Promise.all([
    api.createNode('User', {
      id: 'user1',
      username: 'alice_dev',
      email: 'alice@dev.com',
      role: 'Developer',
      active: true,
      lastLogin: Date.now(),
    }),
    api.createNode('User', {
      id: 'user2',
      username: 'bob_designer',
      email: 'bob@design.com',
      role: 'Designer',
      active: true,
      lastLogin: Date.now() - 86400000,
    }),
    api.createNode('User', {
      id: 'user3',
      username: 'charlie_pm',
      email: 'charlie@pm.com',
      role: 'Product Manager',
      active: true,
      lastLogin: Date.now() - 172800000,
    }),
    api.createNode('User', {
      id: 'user4',
      username: 'diana_dev',
      email: 'diana@dev.com',
      role: 'Developer',
      active: false,
      lastLogin: Date.now() - 604800000,
    }),
  ]);
  logger.result(users.length, 'users created');

  logger.info('Creating projects...');
  const projects = await Promise.all([
    api.createNode('Project', {
      id: 'proj1',
      name: 'Website Redesign',
      description: 'Redesign company website',
      status: 'In Progress',
      createdAt: Date.now(),
    }),
    api.createNode('Project', {
      id: 'proj2',
      name: 'Mobile App',
      description: 'Build mobile application',
      status: 'Planning',
      createdAt: Date.now(),
    }),
    api.createNode('Project', {
      id: 'proj3',
      name: 'API Integration',
      description: 'Integrate third-party APIs',
      status: 'Completed',
      createdAt: Date.now() - 2592000000,
    }),
  ]);
  logger.result(projects.length, 'projects created');

  logger.info('Creating relationships with createEdge()...');
  await api.createEdge(users[0]._id, 'ASSIGNED_TO', projects[0]._id, {
    role: 'Lead Developer',
    assignedAt: Date.now(),
  });
  await api.createEdge(users[1]._id, 'ASSIGNED_TO', projects[0]._id, {
    role: 'UI Designer',
    assignedAt: Date.now(),
  });
  await api.createEdge(users[2]._id, 'ASSIGNED_TO', projects[1]._id, {
    role: 'Project Owner',
    assignedAt: Date.now(),
  });
  await api.createEdge(users[3]._id, 'ASSIGNED_TO', projects[2]._id, {
    role: 'Developer',
    assignedAt: Date.now() - 2592000000,
  });

  // Create social connections
  await api.createEdge(users[0]._id, 'FOLLOWS', users[1]._id, { since: 2023 });
  await api.createEdge(users[0]._id, 'FOLLOWS', users[2]._id, { since: 2023 });
  await api.createEdge(users[1]._id, 'FOLLOWS', users[3]._id, { since: 2024 });
  logger.success('✓ Relationships created');

  // ============================================================
  // READ Operations
  // ============================================================
  logger.subheader('READ Operations');

  logger.info('Getting a single node by ID...');
  const alice = await api.getNode(users[0]._id);
  logger.data('User:', {
    username: alice?.username,
    email: alice?.email,
    role: alice?.role,
  });

  logger.info('Getting all users by label...');
  const allUsers = await api.getNodesByLabel('User');
  logger.result(allUsers.length, 'users retrieved');

  logger.info('Getting all projects...');
  const allProjects = await api.getNodesByLabel('Project');
  logger.result(allProjects.length, 'projects retrieved');

  // ============================================================
  // Edge Query Operations
  // ============================================================
  logger.subheader('Edge Query Operations');

  logger.info('Getting edges with filters...');

  // Get all assignments for a user
  const aliceAssignments = await api.getEdges({
    from: users[0]._id,
  });
  logger.result(aliceAssignments.length, 'assignments for Alice');

  // Get edges by type
  const allAssignments = await api.getEdges({
    type: 'ASSIGNED_TO',
  });
  logger.result(allAssignments.length, 'total assignments');

  // Get edges by target
  const projAssignments = await api.getEdges({
    to: projects[0]._id,
  });
  logger.result(projAssignments.length, 'people assigned to Website Redesign');

  logger.newline();
  logger.info('Direct API access - EdgeAPI methods:');
  logger.dim('The CongraphDBAPI exposes edge and node properties for direct access');

  // You can also use the NodeAPI and EdgeAPI directly
  const nodeApi = new NodeAPI(conn);
  const edgeApi = new EdgeAPI(conn);

  logger.info('Using NodeAPI directly...');
  const devUsers = await nodeApi.getByLabel('User');
  logger.result(devUsers.length, 'users via NodeAPI');

  // ============================================================
  // UPDATE Operations
  // ============================================================
  logger.subheader('UPDATE Operations');

  logger.info('Updating node properties...');
  logger.code(`await api.updateNode(userId, { active: false });`);

  // Deactivate a user
  const updatedUser = await api.updateNode(users[3]._id, {
    active: false,
    lastLogin: Date.now(),
  });
  logger.data('Updated user:', {
    username: updatedUser?.username,
    active: updatedUser?.active,
  });

  logger.info('Updating project status...');
  const updatedProject = await api.updateNode(projects[1]._id, {
    status: 'In Progress',
  });
  logger.data('Updated project:', {
    name: updatedProject?.name,
    status: updatedProject?.status,
  });

  logger.info('Updating edge properties...');
  const updatedEdge = await api.updateEdge(aliceAssignments[0]._id, {
    role: 'Senior Developer',
  });
  logger.data('Updated assignment:', {
    role: updatedEdge?.role,
  });

  // ============================================================
  // DELETE Operations
  // ============================================================
  logger.subheader('DELETE Operations');

  logger.info('Deleting a relationship...');
  const deleted = await api.deleteEdge(aliceAssignments[0]._id);
  logger.result(deleted ? 'Successfully deleted' : 'Delete failed', '');

  logger.info('Deleting a node (with detach)...');
  logger.code(`await api.deleteNode(userId, true); // detach = true`);
  logger.dim('When detach=true, all connected edges are also deleted');

  // Delete Diana (no active projects)
  const deletedNode = await api.deleteNode(users[3]._id, true);
  logger.result(deletedNode ? 'Successfully deleted node' : 'Delete failed', '');

  logger.info('Verifying deletion...');
  const remainingUsers = await api.getNodesByLabel('User');
  logger.result(remainingUsers.length, 'users remaining');

  // ============================================================
  // Batch Operations
  // ============================================================
  logger.subheader('Batch Operations');

  logger.info('Creating multiple nodes in batch...');
  const newUsers = [];
  for (let i = 5; i <= 8; i++) {
    newUsers.push(
      api.createNode('User', {
        id: `user${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        role: 'Member',
        active: true,
        lastLogin: Date.now(),
      })
    );
  }
  const batchedUsers = await Promise.all(newUsers);
  logger.result(batchedUsers.length, 'new users created in batch');

  logger.info('Creating multiple edges in batch...');
  const batchEdges = [];
  for (let i = 0; i < batchedUsers.length; i++) {
    batchEdges.push(
      api.createEdge(users[0]._id, 'FOLLOWS', batchedUsers[i]._id, { since: 2024 })
    );
  }
  await Promise.all(batchEdges);
  logger.result(batchEdges.length, 'new edges created in batch');

  // ============================================================
  // Query with Direct API Access
  // ============================================================
  logger.subheader('Advanced Queries');

  logger.info('Finding all active developers...');
  const allUsers2 = await api.getNodesByLabel('User');
  const activeDevs = allUsers2.filter(u => u.active && u.role === 'Developer');
  logger.result(activeDevs.length, 'active developers');
  for (const dev of activeDevs) {
    logger.data('Developer:', { username: dev.username, email: dev.email });
  }

  logger.info('Finding outgoing relationships from a node...');
  const outgoingEdges = await api.getEdges({ from: users[0]._id });
  logger.result(outgoingEdges.length, 'edges from Alice');
  for (const edge of outgoingEdges) {
    logger.data('Edge:', { type: edge._type, to: edge._to });
  }

  // ============================================================
  // Error Handling
  // ============================================================
  logger.subheader('Error Handling');

  logger.info('Handling non-existent nodes...');
  try {
    const nonExistent = await api.getNode('fake-id-that-does-not-exist');
    if (nonExistent === null) {
      logger.info('getNode() returns null for non-existent nodes (no error thrown)');
    }
  } catch (error) {
    logger.error(`Error: ${(error as Error).message}`);
  }

  logger.info('Handling invalid operations...');
  try {
    // Try to delete a node with relationships without detach
    await api.deleteNode(users[0]._id, false);
  } catch (error) {
    logger.info(`Expected error: ${(error as Error).message}`);
  }

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('CRUD Summary');

  logger.info('JavaScript API CRUD Methods:');
  logger.newline();
  logger.dim('CREATE:');
  logger.dim('  - api.createNode(label, properties)');
  logger.dim('  - api.createEdge(fromId, type, toId, properties)');
  logger.newline();
  logger.dim('READ:');
  logger.dim('  - api.getNode(id)');
  logger.dim('  - api.getNodesByLabel(label)');
  logger.dim('  - api.getEdge(id)');
  logger.dim('  - api.getEdges({from?, to?, type?})');
  logger.newline();
  logger.dim('UPDATE:');
  logger.dim('  - api.updateNode(id, properties)');
  logger.dim('  - api.updateEdge(id, properties)');
  logger.newline();
  logger.dim('DELETE:');
  logger.dim('  - api.deleteNode(id, detach?)');
  logger.dim('  - api.deleteEdge(id)');
  logger.newline();

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await api.close();
  await db.close();
  logger.success('✓ API and database closed');

  logger.header('CRUD Operations Completed!');
  logger.info('Next: Example 12 - Navigator traversal API');
}
