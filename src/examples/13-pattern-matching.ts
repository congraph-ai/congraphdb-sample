/**
 * Example 13: Pattern Matching with find() and v()
 *
 * This example demonstrates the pattern matching capabilities of
 * CongraphDB's JavaScript API using the find() method and v() variables.
 *
 * Pattern matching in graph databases is similar to triple stores:
 * - Subject: The starting node
 * - Predicate: The relationship type
 * - Object: The ending node (can be a value or variable)
 *
 * The find() method provides:
 * - Declarative pattern matching
 * - Variable binding with v()
 * - Multi-pattern queries
 * - Property filters
 * - Combining with Navigator for complex queries
 *
 * When to use pattern matching:
 * - Declarative graph queries
 * - Finding specific relationship patterns
 * - Multi-hop patterns with conditions
 * - When you want graph-like query syntax without Cypher
 */

import congraphdb, { CongraphDBAPI, Pattern } from 'congraphdb';
import { createDatabase } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PatternMatching');

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Pattern Matching with find() and v()');

  // ============================================================
  // Setup
  // ============================================================
  logger.subheader('Setup');

  const db = await createDatabase({
    path: './data/pattern-matching.cgraph',
    inMemory: false,
  });

  const api = new CongraphDBAPI(db);
  const conn = db.createConnection();

  // Define schema - E-commerce graph
  logger.info('Creating e-commerce schema...');
  await conn.query(`
    CREATE NODE TABLE Customer (
      id STRING,
      name STRING,
      email STRING,
      tier STRING,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE NODE TABLE Product (
      id STRING,
      name STRING,
      category STRING,
      price INTEGER,
      stock INTEGER,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE NODE TABLE Order (
      id STRING,
      orderDate INTEGER,
      total INTEGER,
      status STRING,
      PRIMARY KEY (id)
    )
  `);

  await conn.query(`
    CREATE REL TABLE PLACED (
      FROM Customer TO Order,
      placedAt INTEGER
    )
  `);

  await conn.query(`
    CREATE REL TABLE CONTAINS (
      FROM Order TO Product,
      quantity INTEGER
    )
  `);

  await conn.query(`
    CREATE REL TABLE REVIEWED (
      FROM Customer TO Product,
      rating INTEGER,
      comment STRING
    )
  `);

  logger.success('✓ Schema created');

  // ============================================================
  // Create E-commerce Data
  // ============================================================
  logger.subheader('Creating E-commerce Data');

  logger.info('Creating customers...');
  const alice = await api.createNode('Customer', {
    id: 'cust1',
    name: 'Alice',
    email: 'alice@example.com',
    tier: 'Gold',
  });
  const bob = await api.createNode('Customer', {
    id: 'cust2',
    name: 'Bob',
    email: 'bob@example.com',
    tier: 'Silver',
  });
  const charlie = await api.createNode('Customer', {
    id: 'cust3',
    name: 'Charlie',
    email: 'charlie@example.com',
    tier: 'Bronze',
  });
  logger.result(3, 'customers created');

  logger.info('Creating products...');
  const laptop = await api.createNode('Product', {
    id: 'prod1',
    name: 'Laptop Pro',
    category: 'Electronics',
    price: 1299,
    stock: 50,
  });
  const mouse = await api.createNode('Product', {
    id: 'prod2',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 29,
    stock: 200,
  });
  const keyboard = await api.createNode('Product', {
    id: 'prod3',
    name: 'Mechanical Keyboard',
    category: 'Electronics',
    price: 89,
    stock: 150,
  });
  const monitor = await api.createNode('Product', {
    id: 'prod4',
    name: '4K Monitor',
    category: 'Electronics',
    price: 499,
    stock: 75,
  });
  logger.result(4, 'products created');

  logger.info('Creating orders...');
  const order1 = await api.createNode('Order', {
    id: 'order1',
    orderDate: Date.now() - 86400000 * 30,
    total: 1328,
    status: 'Delivered',
  });
  const order2 = await api.createNode('Order', {
    id: 'order2',
    orderDate: Date.now() - 86400000 * 15,
    total: 588,
    status: 'Shipped',
  });
  const order3 = await api.createNode('Order', {
    id: 'order3',
    orderDate: Date.now() - 86400000 * 7,
    total: 1299,
    status: 'Processing',
  });
  logger.result(3, 'orders created');

  logger.info('Creating relationships...');
  // Customer placed orders
  await api.createEdge(alice._id, 'PLACED', order1._id);
  await api.createEdge(bob._id, 'PLACED', order2._id);
  await api.createEdge(charlie._id, 'PLACED', order3._id);

  // Orders contain products
  await api.createEdge(order1._id, 'CONTAINS', laptop._id, { quantity: 1 });
  await api.createEdge(order1._id, 'CONTAINS', mouse._id, { quantity: 1 });
  await api.createEdge(order2._id, 'CONTAINS', keyboard._id, { quantity: 2 });
  await api.createEdge(order2._id, 'CONTAINS', monitor._id, { quantity: 1 });
  await api.createEdge(order3._id, 'CONTAINS', laptop._id, { quantity: 1 });

  // Customer reviews
  await api.createEdge(alice._id, 'REVIEWED', laptop._id, { rating: 5, comment: 'Great!' });
  await api.createEdge(bob._id, 'REVIEWED', keyboard._id, { rating: 4, comment: 'Nice feel' });
  await api.createEdge(charlie._id, 'REVIEWED', mouse._id, { rating: 3, comment: 'Okay' });
  logger.success('✓ All relationships created');

  // ============================================================
  // Basic Pattern Matching
  // ============================================================
  logger.subheader('Basic Pattern Matching');

  logger.info('Finding all orders placed by Alice...');
  logger.code(`
const results = await api.find({
  subject: alice._id,
  predicate: 'PLACED',
  object: api.v('order')
});
  `);

  const aliceOrders = await api.find({
    subject: alice._id,
    predicate: 'PLACED',
    object: api.v('order'),
  });

  logger.result(aliceOrders.length, 'orders found');
  for (const row of aliceOrders) {
    logger.data('Order:', {
      id: row.order?.id,
      total: row.order?.total,
      status: row.order?.status,
    });
  }

  // ============================================================
  // Pattern with Property Filters
  // ============================================================
  logger.subheader('Pattern with Property Filters');

  logger.info('Finding delivered orders...');
  logger.code(`
const deliveredOrders = await api.find({
  subject: alice._id,
  predicate: 'PLACED',
  object: api.v('order')
}, {
  where: 'order.status = "Delivered"'
});
  `);

  const deliveredOrders = await api.find(
    {
      subject: alice._id,
      predicate: 'PLACED',
      object: api.v('order'),
    },
    { where: 'order.status = "Delivered"' }
  );

  logger.result(deliveredOrders.length, 'delivered orders');

  // ============================================================
  // Two-Hop Pattern Matching
  // ============================================================
  logger.subheader('Two-Hop Pattern Matching');

  logger.info('Finding products Alice ordered...');
  logger.code(`
const products = await api.find({
  subject: alice._id,
  predicate: 'PLACED',
  object: api.v('order')
});
// Then query each order for CONTAINS relationships
  `);

  // For multi-hop, we need to chain queries or use Cypher
  // Let's use a Pattern object for complex matching
  logger.info('Using Pattern class for complex queries...');

  // First get Alice's orders
  const orders = await api.find({
    subject: alice._id,
    predicate: 'PLACED',
    object: api.v('order'),
  });

  // Then get products in those orders
  let allProducts: any[] = [];
  for (const orderRow of orders) {
    const products = await api.find({
      subject: orderRow.order?._id,
      predicate: 'CONTAINS',
      object: api.v('product'),
    });
    allProducts = allProducts.concat(products);
  }

  logger.result(allProducts.length, 'products found in Alice\'s orders');
  for (const row of allProducts) {
    logger.data('Product:', {
      name: row.product?.name,
      price: row.product?.price,
    });
  }

  // ============================================================
  // Finding Reviews by Customer
  // ============================================================
  logger.subheader('Finding Reviews');

  logger.info('Finding all reviews and their ratings...');
  const reviews = await api.find({
    subject: api.v('customer'),
    predicate: 'REVIEWED',
    object: api.v('product'),
  });

  logger.result(reviews.length, 'reviews found');
  for (const review of reviews) {
    logger.data('Review:', {
      customer: review.customer?.name,
      product: review.product?.name,
      rating: review.rating,
    });
  }

  // ============================================================
  // Finding Highly-Rated Products
  // ============================================================
  logger.subheader('Filtered Pattern Matching');

  logger.info('Finding products with 5-star ratings...');
  logger.code(`
const topRated = await api.find({
  subject: api.v('customer'),
  predicate: 'REVIEWED',
  object: api.v('product')
}, {
  where: 'rating = 5'
});
  `);

  const topRated = await api.find(
    {
      subject: api.v('customer'),
      predicate: 'REVIEWED',
      object: api.v('product'),
    },
    { where: 'rating = 5' }
  );

  logger.result(topRated.length, '5-star products');
  for (const review of topRated) {
    logger.data('Top Rated:', {
      product: review.product?.name,
      customer: review.customer?.name,
    });
  }

  // ============================================================
  // Finding All Customers Who Ordered a Product
  // ============================================================
  logger.subheader('Reverse Pattern Matching');

  logger.info('Finding all customers who ordered the Laptop...');
  logger.code(`
// Step 1: Find orders containing the laptop
const orders = await api.find({
  subject: api.v('order'),
  predicate: 'CONTAINS',
  object: laptop._id
});
// Step 2: Find customers who placed those orders
  `);

  const laptopOrders = await api.find({
    subject: api.v('order'),
    predicate: 'CONTAINS',
    object: laptop._id,
  });

  const customersWhoBoughtLaptop = await Promise.all(
    laptopOrders.map(async (row: any) => {
      const customers = await api.find({
        subject: api.v('customer'),
        predicate: 'PLACED',
        object: row.order?._id,
      });
      return customers;
    })
  ).then(results => results.flat());

  logger.result(customersWhoBoughtLaptop.length, 'customers bought the Laptop');
  for (const row of customersWhoBoughtLaptop) {
    logger.data('Customer:', { name: row.customer?.name, email: row.customer?.email });
  }

  // ============================================================
  // Combining with Navigator
  // ============================================================
  logger.subheader('Combining find() with Navigator');

  logger.info('First find with pattern, then traverse from results...');
  logger.code(`
// Find Alice's orders
const orders = await api.find({
  subject: alice._id,
  predicate: 'PLACED',
  object: api.v('order')
});
// Navigate from each order to find products
for (const row of orders) {
  const products = await api.nav(row.order._id)
    .out('CONTAINS')
    .values();
  // Process products...
}
  `);

  // ============================================================
  // Using the Pattern Class Directly
  // ============================================================
  logger.subheader('Using Pattern Class');

  logger.info('Creating reusable Pattern objects...');
  logger.code(`
const orderPattern = new Pattern({
  subject: api.v('customer'),
  predicate: 'PLACED',
  object: api.v('order')
});
const results = await api.find(orderPattern);
  `);

  const orderPattern = new Pattern({
    subject: api.v('customer'),
    predicate: 'PLACED',
    object: api.v('order'),
  });
  const patternResults = await api.find(orderPattern);

  logger.result(patternResults.length, 'results from Pattern object');

  // ============================================================
  // Variable Scoping and Reuse
  // ============================================================
  logger.subheader('Variable Reuse');

  logger.info('Variables can be reused across multiple queries...');
  const customerVar = api.v('cust');
  const productVar = api.v('prod');

  logger.info('Finding all customer-product interactions...');
  const reviewed = await api.find({
    subject: customerVar,
    predicate: 'REVIEWED',
    object: productVar,
  });

  logger.result(reviewed.length, 'customer-product reviews');

  // ============================================================
  // Complex Business Query
  // ============================================================
  logger.subheader('Complex Business Query');

  logger.info('Question: Which Gold customers bought expensive products?');

  // First, find Gold customers
  const allCustomers = await api.getNodesByLabel('Customer');
  const goldCustomers = allCustomers.filter((c: any) => c.tier === 'Gold');

  logger.result(goldCustomers.length, 'Gold customers');

  // For each Gold customer, find their orders and products
  for (const customer of goldCustomers) {
    const customerOrders = await api.find({
      subject: customer._id,
      predicate: 'PLACED',
      object: api.v('order'),
    });

    for (const orderRow of customerOrders) {
      const products = await api.find({
        subject: orderRow.order?._id,
        predicate: 'CONTAINS',
        object: api.v('product'),
      });

      for (const prodRow of products) {
        if (prodRow.product && prodRow.product.price > 500) {
          logger.data('High-value purchase:', {
            customer: customer.name,
            product: prodRow.product.name,
            price: prodRow.product.price,
          });
        }
      }
    }
  }

  // ============================================================
  // Comparison with Cypher
  // ============================================================
  logger.subheader('Pattern Matching vs Cypher');

  logger.newline();
  logger.dim('Cypher approach (more concise for complex queries):');
  logger.code(`
MATCH (c:Customer {tier: 'Gold'})-[:PLACED]->(o:Order)-[:CONTAINS]->(p:Product)
WHERE p.price > 500
RETURN c.name, p.name, p.price
  `);

  logger.newline();
  logger.dim('JavaScript API approach (programmatic):');
  logger.code(`
// Step by step, programmatically
const customers = await api.getNodesByLabel('Customer');
const goldCustomers = customers.filter(c => c.tier === 'Gold');
// ... iterate and find relationships
  `);

  // ============================================================
  // Summary: When to Use Pattern Matching
  // ============================================================
  logger.subheader('Summary: Pattern Matching Use Cases');

  logger.info('Use find() pattern matching when:');
  logger.newline();
  logger.dim('  ✓ You need declarative relationship queries');
  logger.dim('  ✓ Building queries programmatically');
  logger.dim('  ✓ Simple to medium complexity patterns');
  logger.dim('  ✓ You want JavaScript-based query building');
  logger.newline();

  logger.info('Use Navigator when:');
  logger.newline();
  logger.dim('  ✓ Doing multi-hop traversals');
  logger.dim('  ✓ Fluent chaining is preferred');
  logger.dim('  ✓ Path finding is needed');
  logger.newline();

  logger.info('Use Cypher when:');
  logger.newline();
  logger.dim('  ✓ Complex multi-hop queries');
  logger.dim('  ✓ Aggregations and analytics');
  logger.dim('  ✓ Most concise and readable');
  logger.newline();

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await api.close();
  await db.close();
  logger.success('✓ API and database closed');

  logger.header('Pattern Matching Completed!');
  logger.info('Next: Example 14 - Choosing your query interface');
}
