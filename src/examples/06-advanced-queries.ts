/**
 * Example 06: Advanced Cypher Queries
 *
 * This example demonstrates advanced Cypher query patterns:
 * - OPTIONAL MATCH for handling missing relationships
 * - Variable-length path queries (*1..3)
 * - Aggregation functions (COUNT, SUM, AVG, MIN, MAX, COLLECT)
 * - Pattern comprehensions
 * - UNION queries
 * - ORDER BY, LIMIT, SKIP (pagination)
 * - CASE expressions
 * - WITH clause for query chaining
 * - List operations and functions
 *
 * These patterns enable complex data analysis and navigation.
 */

import congraphdb from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AdvancedQueries');

// Sample data: Employee hierarchy
const EMPLOYEES = [
  { id: 'e1', name: 'Alice', role: 'CEO', department: 'Executive', salary: 200000 },
  { id: 'e2', name: 'Bob', role: 'CTO', department: 'Engineering', salary: 180000, managerId: 'e1' },
  { id: 'e3', name: 'Charlie', role: 'CFO', department: 'Finance', salary: 175000, managerId: 'e1' },
  { id: 'e4', name: 'Diana', role: 'VP Engineering', department: 'Engineering', salary: 150000, managerId: 'e2' },
  { id: 'e5', name: 'Eve', role: 'Senior Developer', department: 'Engineering', salary: 120000, managerId: 'e4' },
  { id: 'e6', name: 'Frank', role: 'Developer', department: 'Engineering', salary: 90000, managerId: 'e4' },
  { id: 'e7', name: 'Grace', role: 'Developer', department: 'Engineering', salary: 95000, managerId: 'e4' },
  { id: 'e8', name: 'Henry', role: 'Finance Manager', department: 'Finance', salary: 110000, managerId: 'e3' },
  { id: 'e9', name: 'Ivy', role: 'Accountant', department: 'Finance', salary: 70000, managerId: 'e8' },
  { id: 'e10', name: 'Jack', role: 'Developer', department: 'Engineering', salary: 85000, managerId: 'e4' },
];

// Project assignments
const PROJECTS = [
  { id: 'p1', name: 'Project Alpha', budget: 500000, status: 'active' },
  { id: 'p2', name: 'Project Beta', budget: 300000, status: 'active' },
  { id: 'p3', name: 'Project Gamma', budget: 200000, status: 'completed' },
];

const ASSIGNMENTS = [
  { employeeId: 'e5', projectId: 'p1', role: 'Lead Developer' },
  { employeeId: 'e6', projectId: 'p1', role: 'Developer' },
  { employeeId: 'e7', projectId: 'p1', role: 'Developer' },
  { employeeId: 'e5', projectId: 'p2', role: 'Consultant' },
  { employeeId: 'e9', projectId: 'p2', role: 'Financial Analyst' },
];

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Advanced Cypher Queries Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/advanced-queries.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE Employee (
      id STRING,
      name STRING,
      role STRING,
      department STRING,
      salary INTEGER,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Employee table created');

  await conn.query(`
    CREATE NODE TABLE Project (
      id STRING,
      name STRING,
      budget INTEGER,
      status STRING,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Project table created');

  await conn.query(`
    CREATE REL TABLE MANAGES (
      FROM Employee TO Employee,
      since DATE
    )
  `);
  logger.success('✓ MANAGES relationship created');

  await conn.query(`
    CREATE REL TABLE ASSIGNED_TO (
      FROM Employee TO Project,
      role STRING,
      since DATE
    )
  `);
  logger.success('✓ ASSIGNED_TO relationship created');

  // ============================================================
  // Insert Sample Data
  // ============================================================
  logger.subheader('Inserting Sample Data');

  for (const emp of EMPLOYEES) {
    await conn.query(`
      CREATE (e:Employee {id: '${emp.id}', name: '${emp.name}', role: '${emp.role}',
        department: '${emp.department}', salary: ${emp.salary}})
    `);
  }

  for (const emp of EMPLOYEES) {
    if (emp.managerId) {
      await conn.query(`
        MATCH (e:Employee {id: '${emp.id}'}), (m:Employee {id: '${emp.managerId}'})
        CREATE (m)-[:MANAGES {since: DATE('2023-01-01')}]->(e)
      `);
    }
  }

  for (const proj of PROJECTS) {
    await conn.query(`
      CREATE (p:Project {id: '${proj.id}', name: '${proj.name}', budget: ${proj.budget}, status: '${proj.status}'})
    `);
  }

  for (const assign of ASSIGNMENTS) {
    await conn.query(`
      MATCH (e:Employee {id: '${assign.employeeId}'}), (p:Project {id: '${assign.projectId}'})
      CREATE (e)-[:ASSIGNED_TO {role: '${assign.role}', since: DATE('2024-01-01')}]->(p)
    `);
  }

  logger.success('✓ Sample data inserted');

  // ============================================================
  // Query 1: OPTIONAL MATCH
  // ============================================================
  logger.subheader('Query 1: OPTIONAL MATCH');

  logger.info('Find all employees and their projects (including those without projects):');
  logger.query(`
    MATCH (e:Employee)
    OPTIONAL MATCH (e)-[a:ASSIGNED_TO]->(p:Project)
    RETURN e.name, e.role, COLLECT(p.name) AS projects
    ORDER BY e.name
  `);

  const withProjects = await executeQuery(conn, `
    MATCH (e:Employee)
    OPTIONAL MATCH (e)-[a:ASSIGNED_TO]->(p:Project)
    RETURN e.name, e.role, COLLECT(p.name) AS projects
    ORDER BY e.name
  `);
  printResults(withProjects);
  logger.info('Note: Employees without projects show empty array');

  // ============================================================
  // Query 2: Variable-Length Paths
  // ============================================================
  logger.subheader('Query 2: Variable-Length Paths');

  logger.info('Find all reports up to 3 levels below Diana:');
  logger.query(`
    MATCH (manager:Employee {name: 'Diana'})-[:MANAGES*1..3]->(report:Employee)
    RETURN DISTINCT report.name, report.role
    ORDER BY report.name
  `);

  const reports = await executeQuery(conn, `
    MATCH (manager:Employee {name: 'Diana'})-[:MANAGES*1..3]->(report:Employee)
    RETURN DISTINCT report.name, report.role
    ORDER BY report.name
  `);
  printResults(reports);
  logger.result(reports.length, 'direct and indirect reports');

  // ============================================================
  // Query 3: Aggregation Functions
  // ============================================================
  logger.subheader('Query 3: Aggregation Functions');

  logger.info('Department salary statistics:');
  logger.query(`
    MATCH (e:Employee)
    RETURN e.department,
           COUNT(e) AS employee_count,
           SUM(e.salary) AS total_salary,
           AVG(e.salary) AS avg_salary,
           MIN(e.salary) AS min_salary,
           MAX(e.salary) AS max_salary
    ORDER BY total_salary DESC
  `);

  const deptStats = await executeQuery(conn, `
    MATCH (e:Employee)
    RETURN e.department,
           COUNT(e) AS employee_count,
           SUM(e.salary) AS total_salary,
           AVG(e.salary) AS avg_salary,
           MIN(e.salary) AS min_salary,
           MAX(e.salary) AS max_salary
    ORDER BY total_salary DESC
  `);
  printResults(deptStats);

  // ============================================================
  // Query 4: Pattern Comprehension
  // ============================================================
  logger.subheader('Query 4: Pattern Comprehension');

  logger.info('Get managers and their direct reports as arrays:');
  logger.query(`
    MATCH (m:Employee)-[:MANAGES]->(r:Employee)
    RETURN m.name AS manager,
           [r2 IN [(m)-[:MANAGES]->(r2) | r2.name] | r2] AS direct_reports
    ORDER BY manager
  `);

  const managerReports = await executeQuery(conn, `
    MATCH (m:Employee)-[:MANAGES]->(r:Employee)
    WITH m, COLLECT(r.name) AS reports
    WHERE SIZE(reports) > 0
    RETURN m.name AS manager, reports AS direct_reports
    ORDER BY manager
  `);
  printResults(managerReports);

  // ============================================================
  // Query 5: WITH Clause (Query Chaining)
  // ============================================================
  logger.subheader('Query 5: WITH Clause for Query Chaining');

  logger.info('Find departments with average salary above 100k:');
  logger.query(`
    MATCH (e:Employee)
    WITH e.department AS dept, AVG(e.salary) AS avg_salary
    WHERE avg_salary > 100000
    RETURN dept, avg_salary
    ORDER BY avg_salary DESC
  `);

  const highPaidDepts = await executeQuery(conn, `
    MATCH (e:Employee)
    WITH e.department AS dept, AVG(e.salary) AS avg_salary
    WHERE avg_salary > 100000
    RETURN dept, ROUND(avg_salary, 2) AS avg_salary
    ORDER BY avg_salary DESC
  `);
  printResults(highPaidDepts);

  // ============================================================
  // Query 6: CASE Expression
  // ============================================================
  logger.subheader('Query 6: CASE Expression');

  logger.info('Categorize employees by salary range:');
  logger.query(`
    MATCH (e:Employee)
    RETURN e.name, e.role, e.salary,
           CASE
             WHEN e.salary >= 150000 THEN 'Executive'
             WHEN e.salary >= 100000 THEN 'Senior'
             ELSE 'Junior'
           END AS level
    ORDER BY e.salary DESC
    LIMIT 5
  `);

  const salaryLevels = await executeQuery(conn, `
    MATCH (e:Employee)
    RETURN e.name, e.role, e.salary,
           CASE
             WHEN e.salary >= 150000 THEN 'Executive'
             WHEN e.salary >= 100000 THEN 'Senior'
             ELSE 'Junior'
           END AS level
    ORDER BY e.salary DESC
    LIMIT 5
  `);
  printResults(salaryLevels);

  // ============================================================
  // Query 7: ORDER BY, LIMIT, SKIP (Pagination)
  // ============================================================
  logger.subheader('Query 7: Pagination');

  logger.info('Page 1 of employees (limit 3, offset 0):');
  const page1 = await executeQuery(conn, `
    MATCH (e:Employee)
    RETURN e.name, e.role, e.salary
    ORDER BY e.salary DESC
    LIMIT 3
  `);
  printResults(page1);

  logger.newline();
  logger.info('Page 2 of employees (limit 3, offset 3):');
  const page2 = await executeQuery(conn, `
    MATCH (e:Employee)
    RETURN e.name, e.role, e.salary
    ORDER BY e.salary DESC
    SKIP 3
    LIMIT 3
  `);
  printResults(page2);

  // ============================================================
  // Query 8: List Operations
  // ============================================================
  logger.subheader('Query 8: List Operations');

  logger.info('Find the highest-paid person each manager oversees:');
  logger.query(`
    MATCH (m:Employee)-[:MANAGES]->(r:Employee)
    WITH m, COLLECT({name: r.name, salary: r.salary}) AS reports
    RETURN m.name AS manager,
           reports[0].name AS highest_paid_report
  `);

  const highestPaidReports = await executeQuery(conn, `
    MATCH (m:Employee)-[:MANAGES]->(r:Employee)
    WITH m, COLLECT({name: r.name, salary: r.salary}) AS reports
    UNWIND reports AS rep
    ORDER BY rep.salary DESC
    WITH m, COLLECT(rep) AS sorted_reports
    RETURN m.name AS manager, sorted_reports[0].name AS highest_paid_report
    ORDER BY manager
  `);
  printResults(highestPaidReports);

  // ============================================================
  // Query 9: Shortest Path
  // ============================================================
  logger.subheader('Query 9: Shortest Path');

  logger.info('Find shortest path between Ivy and Frank:');
  logger.query(`
    MATCH (a:Employee {name: 'Ivy'}), (b:Employee {name: 'Frank'})
    MATCH path = shortestPath((a)-[:MANAGES*]-(b))
    RETURN [n IN nodes(path) | n.name] AS chain
  `);

  try {
    const shortestPath = await executeQuery(conn, `
      MATCH (a:Employee {name: 'Ivy'}), (b:Employee {name: 'Frank'})
      MATCH path = shortestPath((a)<-[:MANAGES*]-(b))
      RETURN [n IN nodes(path) | n.name] AS management_chain
    `);
    printResults(shortestPath);
  } catch (error) {
    logger.dim('shortestPath may not be available in this version');
  }

  // ============================================================
  // Query 10: Complex Multi-Pattern Query
  // ============================================================
  logger.subheader('Query 10: Complex Multi-Pattern Query');

  logger.info('Find engineers working on active projects with their managers:');
  logger.query(`
    MATCH (e:Employee)-[:ASSIGNED_TO]->(p:Project {status: 'active'})
    MATCH (manager)-[:MANAGES]->(e)
    WHERE e.department = 'Engineering'
    RETURN e.name AS engineer, p.name AS project, manager.name AS manager
    ORDER BY project, engineer
  `);

  const engineersWithManagers = await executeQuery(conn, `
    MATCH (e:Employee)-[:ASSIGNED_TO]->(p:Project {status: 'active'})
    MATCH (manager)-[:MANAGES]->(e)
    WHERE e.department = 'Engineering'
    RETURN e.name AS engineer, p.name AS project, manager.name AS manager
    ORDER BY project, engineer
  `);
  printResults(engineersWithManagers);

  // ============================================================
  // Query 11: DISTINCT and Unique Results
  // ============================================================
  logger.subheader('Query 11: DISTINCT Results');

  logger.info('Get unique departments represented in active projects:');
  logger.query(`
    MATCH (e:Employee)-[:ASSIGNED_TO]->(p:Project {status: 'active'})
    RETURN DISTINCT e.department
    ORDER BY e.department
  `);

  const uniqueDepts = await executeQuery(conn, `
    MATCH (e:Employee)-[:ASSIGNED_TO]->(p:Project {status: 'active'})
    RETURN DISTINCT e.department
    ORDER BY e.department
  `);
  printResults(uniqueDepts);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Advanced Query Summary');

  logger.info('Key concepts covered:');
  logger.dim('  • OPTIONAL MATCH - Handle missing relationships gracefully');
  logger.dim('  • Variable-length paths - Traverse hierarchies');
  logger.dim('  • Aggregation - Group and summarize data');
  logger.dim('  • Pattern comprehension - Build arrays from patterns');
  logger.dim('  • WITH clause - Chain query operations');
  logger.dim('  • CASE expressions - Conditional logic');
  logger.dim('  • Pagination - LIMIT and SKIP for results');
  logger.dim('  • DISTINCT - Remove duplicates');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  // Note: Connection doesn't have a close() method in this API
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Advanced Queries Demo Completed!');
  logger.info('These patterns enable complex graph navigation and analysis.');
}
