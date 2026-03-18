/**
 * Example 07: Path Finding Algorithms
 *
 * This example demonstrates CongraphDB's path finding capabilities:
 * - shortestPath() - Find the shortest path between two nodes
 * - allShortestPaths() - Find all shortest paths at minimum length
 * - Variable-length path patterns with [*1..n] syntax
 * - Relationship direction control (Outgoing, Incoming, Undirected)
 * - Path analysis and navigation
 *
 * Use cases:
 * - Social networks: Degrees of separation
 * - Transportation: Route optimization
 * - Knowledge graphs: Concept relationships
 * - Fraud detection: Connection analysis
 */

import congraphdb from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PathFinding');

// Sample data: Transportation network (cities and routes)
const CITIES = [
  { id: 'c1', name: 'New York', country: 'USA', population: 8336817 },
  { id: 'c2', name: 'Boston', country: 'USA', population: 685094 },
  { id: 'c3', name: 'Chicago', country: 'USA', population: 2693976 },
  { id: 'c4', name: 'Washington DC', country: 'USA', population: 689545 },
  { id: 'c5', name: 'Miami', country: 'USA', population: 467963 },
  { id: 'c6', name: 'Los Angeles', country: 'USA', population: 3979576 },
  { id: 'c7', name: 'San Francisco', country: 'USA', population: 881549 },
  { id: 'c8', name: 'Seattle', country: 'USA', population: 753675 },
  { id: 'c9', name: 'Denver', country: 'USA', population: 727211 },
  { id: 'c10', name: 'Atlanta', country: 'USA', population: 498715 },
];

// Direct flights between cities (undirected relationships)
const FLIGHTS = [
  { from: 'c1', to: 'c2', distance: 305, airlines: ['Delta', 'JetBlue'] },
  { from: 'c1', to: 'c3', distance: 790, airlines: ['United', 'American'] },
  { from: 'c1', to: 'c4', distance: 225, airlines: ['Delta', 'American'] },
  { from: 'c1', to: 'c5', distance: 1090, airlines: ['American', 'JetBlue'] },
  { from: 'c2', to: 'c4', distance: 440, airlines: ['Delta'] },
  { from: 'c3', to: 'c9', distance: 920, airlines: ['United', 'Frontier'] },
  { from: 'c4', to: 'c5', distance: 920, airlines: ['American'] },
  { from: 'c4', to: 'c10', distance: 640, airlines: ['Delta'] },
  { from: 'c5', to: 'c10', distance: 590, airlines: ['Delta'] },
  { from: 'c6', to: 'c7', distance: 380, airlines: ['United', 'Alaska'] },
  { from: 'c6', to: 'c9', distance: 860, airlines: ['United', 'Frontier'] },
  { from: 'c6', to: 'c3', distance: 1745, airlines: ['American', 'United'] },
  { from: 'c7', to: 'c8', distance: 810, airlines: ['Alaska', 'Delta'] },
  { from: 'c8', to: 'c9', distance: 1020, airlines: ['United'] },
];

// Sample data: Social network for people connections
const PEOPLE = [
  { id: 'p1', name: 'Alice', age: 30, city: 'New York' },
  { id: 'p2', name: 'Bob', age: 25, city: 'Boston' },
  { id: 'p3', name: 'Charlie', age: 35, city: 'Chicago' },
  { id: 'p4', name: 'Diana', age: 28, city: 'Washington DC' },
  { id: 'p5', name: 'Eve', age: 32, city: 'Miami' },
  { id: 'p6', name: 'Frank', age: 27, city: 'Los Angeles' },
  { id: 'p7', name: 'Grace', age: 29, city: 'San Francisco' },
  { id: 'p8', name: 'Henry', age: 31, city: 'Seattle' },
  { id: 'p9', name: 'Ivy', age: 26, city: 'Denver' },
  { id: 'p10', name: 'Jack', age: 33, city: 'Atlanta' },
];

const FRIENDSHIPS = [
  { from: 'p1', to: 'p2', since: 2020, strength: 'close' },
  { from: 'p1', to: 'p4', since: 2019, strength: 'close' },
  { from: 'p2', to: 'p3', since: 2021, strength: 'casual' },
  { from: 'p2', to: 'p4', since: 2018, strength: 'close' },
  { from: 'p3', to: 'p4', since: 2022, strength: 'casual' },
  { from: 'p4', to: 'p5', since: 2020, strength: 'casual' },
  { from: 'p4', to: 'p10', since: 2021, strength: 'close' },
  { from: 'p5', to: 'p10', since: 2019, strength: 'close' },
  { from: 'p6', to: 'p7', since: 2020, strength: 'close' },
  { from: 'p6', to: 'p9', since: 2021, strength: 'casual' },
  { from: 'p7', to: 'p8', since: 2019, strength: 'close' },
  { from: 'p8', to: 'p9', since: 2022, strength: 'casual' },
];

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Path Finding Algorithms Demo');

  // ============================================================
  // Part 1: Transportation Network (Undirected Graph)
  // ============================================================
  logger.subheader('Part 1: Transportation Network');

  const transportDb = await createDatabase({
    path: './data/path-finding-transport.cgraph',
    inMemory: false,
  });

  const transportConn = transportDb.createConnection();

  logger.info('Setting up transportation network...');

  // Create schema
  await transportConn.query(`
    CREATE NODE TABLE City (
      id STRING,
      name STRING,
      country STRING,
      population INTEGER,
      PRIMARY KEY (id)
    )
  `);

  await transportConn.query(`
    CREATE REL TABLE FLIES_TO (
      FROM City TO City,
      distance INTEGER,
      airlines STRING
    )
  `);

  // Insert cities
  for (const city of CITIES) {
    await transportConn.query(`
      CREATE (c:City {id: '${city.id}', name: '${city.name}',
        country: '${city.country}', population: ${city.population}})
    `);
  }

  // Insert bidirectional flights (undirected graph simulation)
  for (const flight of FLIGHTS) {
    const airlinesStr = flight.airlines.join(',');
    await transportConn.query(`
      MATCH (from:City {id: '${flight.from}'}), (to:City {id: '${flight.to}'})
      CREATE (from)-[:FLIES_TO {distance: ${flight.distance},
        airlines: '${airlinesStr}'}]->(to)
      CREATE (to)-[:FLIES_TO {distance: ${flight.distance},
        airlines: '${airlinesStr}'}]->(from)
    `);
  }

  logger.success('✓ Transportation network created');

  // ============================================================
  // Query 1: Shortest Path (Direct)
  // ============================================================
  logger.subheader('Query 1: Shortest Path - Direct Route');

  logger.info('Find shortest path from New York to Boston:');
  logger.query(`
    MATCH (a:City {name: 'New York'}), (b:City {name: 'Boston'})
    MATCH path = shortestPath((a)-[:FLIES_TO*..5]-(b))
    RETURN path, [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);

  const shortestPath = await executeQuery(transportConn, `
    MATCH (a:City {name: 'New York'}), (b:City {name: 'Boston'})
    MATCH path = shortestPath((a)-[:FLIES_TO*..5]-(b))
    RETURN [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);
  printResults(shortestPath);

  // ============================================================
  // Query 2: Shortest Path (Multi-hop)
  // ============================================================
  logger.subheader('Query 2: Shortest Path - Multi-hop Route');

  logger.info('Find shortest path from Seattle to Miami:');
  logger.query(`
    MATCH (a:City {name: 'Seattle'}), (b:City {name: 'Miami'})
    MATCH path = shortestPath((a)-[:FLIES_TO*..6]-(b))
    RETURN [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);

  const crossCountry = await executeQuery(transportConn, `
    MATCH (a:City {name: 'Seattle'}), (b:City {name: 'Miami'})
    MATCH path = shortestPath((a)-[:FLIES_TO*..6]-(b))
    RETURN [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);
  printResults(crossCountry);

  // ============================================================
  // Query 3: All Shortest Paths
  // ============================================================
  logger.subheader('Query 3: All Shortest Paths - Multiple Routes');

  logger.info('Find all shortest paths from Los Angeles to Chicago:');
  logger.query(`
    MATCH (a:City {name: 'Los Angeles'}), (b:City {name: 'Chicago'})
    MATCH path = allShortestPaths((a)-[:FLIES_TO*..5]-(b))
    RETURN [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);

  const allPaths = await executeQuery(transportConn, `
    MATCH (a:City {name: 'Los Angeles'}), (b:City {name: 'Chicago'})
    MATCH path = allShortestPaths((a)-[:FLIES_TO*..5]-(b))
    RETURN [n IN nodes(path) | n.name] AS route,
           SUM(r IN relationships(path) | r.distance) AS total_distance
  `);
  printResults(allPaths);

  if (allPaths.length > 1) {
    logger.result(allPaths.length, 'alternative shortest paths found');
  }

  // ============================================================
  // Query 4: Path Length Analysis
  // ============================================================
  logger.subheader('Query 4: Path Length Analysis');

  logger.info('Find cities reachable from New York within 2 hops:');
  logger.query(`
    MATCH (start:City {name: 'New York'})-[:FLIES_TO*1..2]-(end:City)
    WHERE end.name <> 'New York'
    RETURN DISTINCT end.name, end.population
    ORDER BY end.name
  `);

  const withinTwoHops = await executeQuery(transportConn, `
    MATCH (start:City {name: 'New York'})-[:FLIES_TO*1..2]-(end:City)
    WHERE end.name <> 'New York'
    RETURN DISTINCT end.name, end.population
    ORDER BY end.name
  `);
  printResults(withinTwoHops);

  // ============================================================
  // Part 2: Social Network (Directed Graph)
  // ============================================================
  logger.subheader('Part 2: Social Network Analysis');

  const socialDb = await createDatabase({
    path: './data/path-finding-social.cgraph',
    inMemory: false,
  });

  const socialConn = socialDb.createConnection();

  logger.info('Setting up social network...');

  // Create schema
  await socialConn.query(`
    CREATE NODE TABLE Person (
      id STRING,
      name STRING,
      age INTEGER,
      city STRING,
      PRIMARY KEY (id)
    )
  `);

  await socialConn.query(`
    CREATE REL TABLE FRIENDS_WITH (
      FROM Person TO Person,
      since INTEGER,
      strength STRING
    )
  `);

  // Insert people
  for (const person of PEOPLE) {
    await socialConn.query(`
      CREATE (p:Person {id: '${person.id}', name: '${person.name}',
        age: ${person.age}, city: '${person.city}'})
    `);
  }

  // Insert friendships (bidirectional for undirected social network)
  for (const friendship of FRIENDSHIPS) {
    await socialConn.query(`
      MATCH (from:Person {id: '${friendship.from}'}), (to:Person {id: '${friendship.to}'})
      CREATE (from)-[:FRIENDS_WITH {since: ${friendship.since},
        strength: '${friendship.strength}'}]->(to)
      CREATE (to)-[:FRIENDS_WITH {since: ${friendship.since},
        strength: '${friendship.strength}'}]->(from)
    `);
  }

  logger.success('✓ Social network created');

  // ============================================================
  // Query 5: Degrees of Separation
  // ============================================================
  logger.subheader('Query 5: Degrees of Separation');

  logger.info('Find shortest path between Alice and Jack:');
  logger.query(`
    MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Jack'})
    MATCH path = shortestPath((a)-[:FRIENDS_WITH*]-(b))
    RETURN [n IN nodes(path) | n.name] AS connection_chain,
           length(path) AS degrees_of_separation
  `);

  const degrees = await executeQuery(socialConn, `
    MATCH (a:Person {name: 'Alice'}), (b:Person {name: 'Jack'})
    MATCH path = shortestPath((a)-[:FRIENDS_WITH*]-(b))
    RETURN [n IN nodes(path) | n.name] AS connection_chain,
           length(path) AS degrees_of_separation
  `);
  printResults(degrees);

  if (degrees.length > 0) {
    if (degrees[0].connection_chain && Array.isArray(degrees[0].connection_chain)) {
      logger.info(`${degrees[0].connection_chain.join(' → ')} (${degrees[0].degrees_of_separation} degrees)`);
    } else {
      logger.info(`Found ${degrees.length} path(s) between Alice and Jack`);
      logger.dim('Note: Path functions like shortestPath() are not yet fully implemented');
    }
  }

  // ============================================================
  // Query 6: Friend Recommendation (Friends of Friends)
  // ============================================================
  logger.subheader('Query 6: Friend Recommendations');

  logger.info('Suggest friends for Frank (friends of friends who are not already friends):');
  logger.query(`
    MATCH (me:Person {name: 'Frank'})-[:FRIENDS_WITH]->(friend)-[:FRIENDS_WITH]->(fof:Person)
    WHERE NOT (me)-[:FRIENDS_WITH]->(fof) AND fof.name <> 'Frank'
    RETURN DISTINCT fof.name, fof.city, COUNT(friend) AS mutual_friends
    ORDER BY mutual_friends DESC
  `);

  const recommendations = await executeQuery(socialConn, `
    MATCH (me:Person {name: 'Frank'})-[:FRIENDS_WITH]->(friend)-[:FRIENDS_WITH]->(fof:Person)
    WHERE NOT (me)-[:FRIENDS_WITH]->(fof) AND fof.name <> 'Frank'
    RETURN DISTINCT fof.name, fof.city, COUNT(friend) AS mutual_friends
    ORDER BY mutual_friends DESC
  `);
  printResults(recommendations);

  // ============================================================
  // Query 7: Outgoing vs Incoming Paths
  // ============================================================
  logger.subheader('Query 7: Path Direction Control');

  logger.info('Compare outgoing vs incoming paths:');
  logger.query(`
    MATCH (a:Person {name: 'Alice'})-[:FRIENDS_WITH*1..2]->(b:Person)
    WITH b AS reached_outgoing
    MATCH (c:Person {name: 'Alice'})<-[:FRIENDS_WITH*1..2]-(d:Person)
    WHERE d.name = reached_outgoing.name
    RETURN d.name AS bidirectional_reachable
    ORDER BY bidirectional_reachable
  `);

  // For undirected graphs, outgoing and incoming are the same
  // Let's show bidirectional vs unidirectional
  logger.info('Finding mutual connections (bidirectional paths):');
  const mutuals = await executeQuery(socialConn, `
    MATCH (a:Person)-[:FRIENDS_WITH]->(b:Person)-[:FRIENDS_WITH]->(c:Person)
    WHERE a.name < c.name AND a.name <> 'Alice' AND c.name <> 'Alice'
    MATCH (center:Person {name: 'Alice'})
    RETURN a.name AS person1, c.name AS person2,
           EXISTS((center)-[:FRIENDS_WITH]->(a)) AND
           EXISTS((center)-[:FRIENDS_WITH]->(c)) AS both_direct_connections
    ORDER BY person1
  `);
  printResults(mutuals);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Path Finding Summary');

  logger.info('Key concepts covered:');
  logger.dim('  • shortestPath() - Find one shortest path between nodes');
  logger.dim('  • allShortestPaths() - Find all shortest paths');
  logger.dim('  • Variable-length paths [*1..n] - Limit path length');
  logger.dim('  • Undirected paths -(relationship)- for bidirectional');
  logger.dim('  • Directed paths -> or <- for directional');
  logger.dim('  • length(path) - Get number of relationships');
  logger.dim('  • nodes(path) - Extract nodes from path');
  logger.dim('  • relationships(path) - Extract relationships');

  logger.newline();
  logger.info('Use cases:');
  logger.dim('  • Route optimization (transportation, logistics)');
  logger.dim('  • Social network analysis (degrees of separation)');
  logger.dim('  • Fraud detection (suspicious connection patterns)');
  logger.dim('  • Knowledge graph navigation');
  logger.dim('  • Recommendation systems (friend/product suggestions)');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await transportDb.close();
  await socialDb.close();
  logger.success('✓ Databases closed');

  logger.header('Path Finding Demo Completed!');
  logger.info('Path finding is essential for graph navigation and analysis.');
}
