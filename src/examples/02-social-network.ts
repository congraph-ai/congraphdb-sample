/**
 * Example 02: Social Network Graph
 *
 * This example demonstrates how to model and query a social network
 * using CongraphDB. It showcases real-world graph patterns like:
 *
 * - Multiple node types (User, Post, Comment)
 * - Multiple relationship types (FOLLOWS, POSTED, COMMENTED_ON, LIKED)
 * - 2-hop queries (friends of friends)
 * - 3-hop queries (recommendations)
 * - Pattern matching for recommendations
 *
 * Domain Model:
 *   Users can follow other users (FOLLOWS)
 *   Users can create posts (POSTED)
 *   Users can comment on posts (COMMENTED_ON)
 *   Users can like posts (LIKED)
 */

import congraphdb from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SocialNetwork');

// Sample data for the social network
const USERS = [
  { id: 'u1', name: 'Alice', bio: 'Software Engineer' },
  { id: 'u2', name: 'Bob', bio: 'Designer' },
  { id: 'u3', name: 'Charlie', bio: 'Data Scientist' },
  { id: 'u4', name: 'Diana', bio: 'Product Manager' },
  { id: 'u5', name: 'Eve', bio: 'Artist' },
  { id: 'u6', name: 'Frank', bio: 'Teacher' },
];

const POSTS = [
  { id: 'p1', userId: 'u1', content: 'Just learned about graph databases!', likes: 5 },
  { id: 'p2', userId: 'u2', content: 'Check out my new design portfolio', likes: 12 },
  { id: 'p3', userId: 'u3', content: 'Data visualization tips coming soon', likes: 8 },
  { id: 'p4', userId: 'u4', content: 'Product launch day! 🚀', likes: 25 },
  { id: 'p5', userId: 'u1', content: 'Coffee is my best friend today', likes: 3 },
];

const FOLLOWS = [
  { from: 'u1', to: 'u2', since: '2023-01-10' },
  { from: 'u1', to: 'u3', since: '2023-02-15' },
  { from: 'u2', to: 'u4', since: '2023-01-20' },
  { from: 'u3', to: 'u4', since: '2023-03-01' },
  { from: 'u4', to: 'u5', since: '2023-02-10' },
  { from: 'u5', to: 'u6', since: '2023-03-15' },
  { from: 'u6', to: 'u1', since: '2023-01-25' },
];

const COMMENTS = [
  { userId: 'u2', postId: 'p1', content: 'Congrats! Graph databases are amazing.' },
  { userId: 'u3', postId: 'p1', content: 'Which one are you using?' },
  { userId: 'u1', postId: 'p2', content: 'Love the clean design!' },
  { userId: 'u4', postId: 'p3', content: 'Looking forward to it!' },
];

const LIKES = [
  { userId: 'u2', postId: 'p1' },
  { userId: 'u3', postId: 'p1' },
  { userId: 'u4', postId: 'p1' },
  { userId: 'u1', postId: 'p2' },
  { userId: 'u3', postId: 'p2' },
  { userId: 'u4', postId: 'p2' },
  { userId: 'u5', postId: 'p4' },
  { userId: 'u6', postId: 'p4' },
];

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Social Network Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/social-network.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Social Network Schema');

  logger.info('Creating User node table...');
  await conn.query(`
    CREATE NODE TABLE User (
      id STRING,
      name STRING,
      bio STRING,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ User table created');

  logger.info('Creating Post node table...');
  await conn.query(`
    CREATE NODE TABLE Post (
      id STRING,
      content STRING,
      likes INTEGER,
      createdAt DATE,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Post table created');

  logger.info('Creating Comment node table...');
  await conn.query(`
    CREATE NODE TABLE Comment (
      id STRING,
      content STRING,
      createdAt DATE,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Comment table created');

  logger.info('Creating relationship tables...');
  await conn.query(`
    CREATE REL TABLE FOLLOWS (
      FROM User TO User,
      since DATE
    )
  `);

  await conn.query(`
    CREATE REL TABLE POSTED (
      FROM User TO Post,
      createdAt DATE
    )
  `);

  await conn.query(`
    CREATE REL TABLE COMMENTED_ON (
      FROM User TO Comment,
      createdAt DATE
    )
  `);

  await conn.query(`
    CREATE REL TABLE COMMENT_ON_POST (
      FROM Comment TO Post,
      createdAt DATE
    )
  `);

  await conn.query(`
    CREATE REL TABLE LIKED (
      FROM User TO Post,
      createdAt DATE
    )
  `);
  logger.success('✓ All relationship tables created');

  // ============================================================
  // Insert Sample Data
  // ============================================================
  logger.subheader('Inserting Sample Data');

  logger.info('Creating users...');
  for (const user of USERS) {
    await conn.query(`
      CREATE (u:User {id: '${user.id}', name: '${user.name}', bio: '${user.bio}'})
    `);
  }
  logger.success(`✓ Created ${USERS.length} users`);

  logger.info('Creating posts...');
  for (const post of POSTS) {
    await conn.query(`
      CREATE (p:Post {id: '${post.id}', content: '${post.content}', likes: ${post.likes}, createdAt: DATE('2024-01-01')})
    `);
  }
  logger.success(`✓ Created ${POSTS.length} posts`);

  logger.info('Creating comments...');
  let commentId = 1;
  for (const comment of COMMENTS) {
    await conn.query(`
      CREATE (c:Comment {id: 'c${commentId}', content: '${comment.content}', createdAt: DATE('2024-01-02')})
    `);

    await conn.query(`
      MATCH (u:User {id: '${comment.userId}'}), (c:Comment {id: 'c${commentId}'})
      CREATE (u)-[:COMMENTED_ON {createdAt: DATE('2024-01-02')}]->(c)
    `);

    await conn.query(`
      MATCH (c:Comment {id: 'c${commentId}'}), (p:Post {id: '${comment.postId}'})
      CREATE (c)-[:COMMENT_ON_POST {createdAt: DATE('2024-01-02')}]->(p)
    `);
    commentId++;
  }
  logger.success(`✓ Created ${COMMENTS.length} comments`);

  logger.info('Creating FOLLOWS relationships...');
  for (const follow of FOLLOWS) {
    await conn.query(`
      MATCH (u1:User {id: '${follow.from}'}), (u2:User {id: '${follow.to}'})
      CREATE (u1)-[:FOLLOWS {since: DATE('${follow.since}')}]->(u2)
    `);
  }
  logger.success(`✓ Created ${FOLLOWS.length} FOLLOWS relationships`);

  logger.info('Creating POSTED relationships...');
  for (const post of POSTS) {
    await conn.query(`
      MATCH (u:User {id: '${post.userId}'}), (p:Post {id: '${post.id}'})
      CREATE (u)-[:POSTED {createdAt: DATE('2024-01-01')}]->(p)
    `);
  }
  logger.success(`✓ Created ${POSTS.length} POSTED relationships`);

  logger.info('Creating LIKED relationships...');
  for (const like of LIKES) {
    await conn.query(`
      MATCH (u:User {id: '${like.userId}'}), (p:Post {id: '${like.postId}'})
      CREATE (u)-[:LIKED {createdAt: DATE('2024-01-03')}]->(p)
    `);
  }
  logger.success(`✓ Created ${LIKES.length} LIKED relationships`);

  // ============================================================
  // Query 1: Find friends of friends (2-hop)
  // ============================================================
  logger.subheader('Query 1: Friends of Friends (2-Hop)');

  logger.info("Find people Alice's friends follow (potential connections):");
  logger.query(`
    MATCH (me:User {name: 'Alice'})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
    WHERE fof.name != 'Alice'
    RETURN fof.name, fof.bio
    ORDER BY fof.name
  `);
  const friendsOfFriends = await executeQuery(conn, `
    MATCH (me:User {name: 'Alice'})-[:FOLLOWS]->(friend:User)-[:FOLLOWS]->(fof:User)
    WHERE fof.name != 'Alice'
    RETURN fof.name, fof.bio
    ORDER BY fof.name
  `);
  printResults(friendsOfFriends);
  logger.result(friendsOfFriends.length, 'potential connections');

  // ============================================================
  // Query 2: Find users who liked similar posts
  // ============================================================
  logger.subheader('Query 2: Similar Users by Likes');

  logger.info('Find users who like the same posts as Alice:');
  logger.query(`
    MATCH (me:User {name: 'Alice'})-[:LIKED]->(p:Post)<-[:LIKED]-(similar:User)
    RETURN similar.name, COUNT(p) AS common_likes, COLLECT(p.content) AS common_posts
    ORDER BY common_likes DESC
  `);
  const similarUsers = await executeQuery(conn, `
    MATCH (me:User {name: 'Alice'})-[:LIKED]->(p:Post)<-[:LIKED]-(similar:User)
    RETURN similar.name, COUNT(p) AS common_likes, COLLECT(p.content) AS common_posts
    ORDER BY common_likes DESC
  `);
  printResults(similarUsers);

  // ============================================================
  // Query 3: Content recommendation (3-hop)
  // ============================================================
  logger.subheader('Query 3: Content Recommendations');

  logger.info('Recommend posts from people Alice follows:');
  logger.query(`
    MATCH (me:User {name: 'Alice'})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
    WHERE NOT EXISTS((me)-[:LIKED]->(post))
    RETURN post.content, friend.name AS author
    ORDER BY post.likes DESC
  `);
  const recommendations = await executeQuery(conn, `
    MATCH (me:User {name: 'Alice'})-[:FOLLOWS]->(friend:User)-[:POSTED]->(post:Post)
    WHERE NOT EXISTS((me)-[:LIKED]->(post))
    RETURN post.content, friend.name AS author
    ORDER BY post.likes DESC
  `);
  printResults(recommendations);
  logger.result(recommendations.length, 'recommended posts');

  // ============================================================
  // Query 4: Post engagement analysis
  // ============================================================
  logger.subheader('Query 4: Post Engagement Analysis');

  logger.info('Find most engaged posts (likes + comments):');
  logger.query(`
    MATCH (p:Post)
    OPTIONAL MATCH (p)<-[:LIKED]-(u:User)
    WITH p, COUNT(u) AS like_count
    OPTIONAL MATCH (p)<-[:COMMENT_ON_POST]-(:Comment)<-[:COMMENTED_ON]-(u2:User)
    RETURN p.content, like_count, COUNT(DISTINCT u2) AS comment_count,
           like_count + COUNT(DISTINCT u2) AS total_engagement
    ORDER BY total_engagement DESC
  `);
  const engagement = await executeQuery(conn, `
    MATCH (p:Post)
    OPTIONAL MATCH (p)<-[:LIKED]-(u:User)
    WITH p, COUNT(u) AS like_count
    OPTIONAL MATCH (p)<-[:COMMENT_ON_POST]-(:Comment)<-[:COMMENTED_ON]-(u2:User)
    RETURN p.content, like_count, COUNT(DISTINCT u2) AS comment_count,
           like_count + COUNT(DISTINCT u2) AS total_engagement
    ORDER BY total_engagement DESC
  `);
  printResults(engagement);

  // ============================================================
  // Query 5: Influencer detection
  // ============================================================
  logger.subheader('Query 5: Influencer Detection');

  logger.info('Find users with the most followers:');
  logger.query(`
    MATCH (u:User)<-[:FOLLOWS]-(follower:User)
    RETURN u.name, u.bio, COUNT(follower) AS follower_count
    ORDER BY follower_count DESC
  `);
  const influencers = await executeQuery(conn, `
    MATCH (u:User)<-[:FOLLOWS]-(follower:User)
    RETURN u.name, u.bio, COUNT(follower) AS follower_count
    ORDER BY follower_count DESC
  `);
  printResults(influencers);

  // ============================================================
  // Query 6: Mutual connections
  // ============================================================
  logger.subheader('Query 6: Mutual Connections');

  logger.info('Find mutual connections between Alice and Diana:');
  logger.query(`
    MATCH (a:User {name: 'Alice'})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(b:User {name: 'Diana'})
    RETURN mutual.name, mutual.bio
    ORDER BY mutual.name
  `);
  const mutualConnections = await executeQuery(conn, `
    MATCH (a:User {name: 'Alice'})-[:FOLLOWS]->(mutual:User)<-[:FOLLOWS]-(b:User {name: 'Diana'})
    RETURN mutual.name, mutual.bio
    ORDER BY mutual.name
  `);
  printResults(mutualConnections);
  logger.result(mutualConnections.length, 'mutual connections');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  // Note: Connection doesn't have a close() method in this API
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Social Network Demo Completed!');
  logger.info('This demonstrates real-world graph queries for social applications.');
}
