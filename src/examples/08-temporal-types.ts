/**
 * Example 08: Temporal Types and Functions
 *
 * This example demonstrates CongraphDB's temporal data types and functions:
 * - DATE type for calendar dates (year, month, day)
 * - DATETIME type for timestamps with milliseconds since epoch
 * - DURATION type for time spans
 * - date() function - Parse or create date values
 * - datetime() function - Get current datetime or parse strings
 * - timestamp() function - Get current Unix timestamp in milliseconds
 * - duration() function - Parse ISO 8601 duration strings
 * - Date arithmetic and comparisons
 * - Duration calculations
 *
 * Use cases:
 * - Event scheduling and management
 * - Time-based analytics
 * - Historical data tracking
 * - Deadline and reminder systems
 * - Audit trails and logging
 */

import congraphdb from '@congraph-ai/congraphdb';
import { createDatabase, executeQuery, printResults } from '../utils/helpers.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TemporalTypes');

// Sample data: Events with dates and times
const EVENTS = [
  { id: 'e1', name: 'Team Standup', date: '2024-01-15', time: '09:00:00', duration: 'PT30M', location: 'Room A' },
  { id: 'e2', name: 'Sprint Planning', date: '2024-01-15', time: '14:00:00', duration: 'PT2H', location: 'Room B' },
  { id: 'e3', name: 'Code Review', date: '2024-01-16', time: '10:30:00', duration: 'PT1H', location: 'Virtual' },
  { id: 'e4', name: 'Product Demo', date: '2024-01-17', time: '15:00:00', duration: 'PT45M', location: 'Auditorium' },
  { id: 'e5', name: 'Retrospective', date: '2024-01-19', time: '16:00:00', duration: 'PT1H30M', location: 'Room A' },
];

// Sample data: Projects with timelines
const PROJECTS = [
  { id: 'p1', name: 'Website Redesign', startDate: '2024-01-01', endDate: '2024-03-31', budget: 50000 },
  { id: 'p2', name: 'Mobile App', startDate: '2024-02-01', endDate: '2024-06-30', budget: 120000 },
  { id: 'p3', name: 'API Integration', startDate: '2024-01-15', endDate: '2024-02-28', budget: 30000 },
  { id: 'p4', name: 'Database Migration', startDate: '2024-03-01', endDate: '2024-04-15', budget: 40000 },
];

// Sample data: Time tracking entries
const TIME_ENTRIES = [
  { id: 't1', projectId: 'p1', employee: 'Alice', date: '2024-01-10', hours: 6, task: 'Design mockups' },
  { id: 't2', projectId: 'p1', employee: 'Bob', date: '2024-01-10', hours: 4, task: 'Backend setup' },
  { id: 't3', projectId: 'p2', employee: 'Charlie', date: '2024-01-10', hours: 8, task: 'Architecture planning' },
  { id: 't4', projectId: 'p1', employee: 'Alice', date: '2024-01-11', hours: 7, task: 'Frontend development' },
  { id: 't5', projectId: 'p3', employee: 'Diana', date: '2024-01-11', hours: 5, task: 'API specification' },
  { id: 't6', projectId: 'p2', employee: 'Bob', date: '2024-01-11', hours: 6, task: 'Mobile framework setup' },
];

export async function run(verbose: boolean = false): Promise<void> {
  logger.header('Temporal Types Demo');

  // ============================================================
  // Setup Database
  // ============================================================
  logger.subheader('Setting up database');

  const db = await createDatabase({
    path: './data/temporal-types.cgraph',
    inMemory: false,
  });

  const conn = db.createConnection();

  // ============================================================
  // Define Schema
  // ============================================================
  logger.subheader('Defining Schema');

  await conn.query(`
    CREATE NODE TABLE Event (
      id STRING,
      name STRING,
      event_date DATE,
      event_time DATETIME,
      duration STRING,
      location STRING,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Event table created');

  await conn.query(`
    CREATE NODE TABLE Project (
      id STRING,
      name STRING,
      start_date DATE,
      end_date DATE,
      budget INTEGER,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ Project table created');

  await conn.query(`
    CREATE NODE TABLE TimeEntry (
      id STRING,
      project_id STRING,
      employee STRING,
      work_date DATE,
      hours INTEGER,
      task STRING,
      PRIMARY KEY (id)
    )
  `);
  logger.success('✓ TimeEntry table created');

  await conn.query(`
    CREATE REL TABLE WORKED_ON (
      FROM TimeEntry TO Project,
      on_date DATE
    )
  `);
  logger.success('✓ WORKED_ON relationship created');

  // ============================================================
  // Insert Sample Data
  // ============================================================
  logger.subheader('Inserting Sample Data');

  for (const event of EVENTS) {
    await conn.query(`
      CREATE (e:Event {id: '${event.id}', name: '${event.name}',
        event_date: DATE('${event.date}'),
        event_time: DATETIME('${event.date}T${event.time}'),
        duration: '${event.duration}',
        location: '${event.location}'})
    `);
  }
  logger.success('✓ Events inserted');

  for (const project of PROJECTS) {
    await conn.query(`
      CREATE (p:Project {id: '${project.id}', name: '${project.name}',
        start_date: DATE('${project.startDate}'),
        end_date: DATE('${project.endDate}'),
        budget: ${project.budget}})
    `);
  }
  logger.success('✓ Projects inserted');

  for (const entry of TIME_ENTRIES) {
    await conn.query(`
      CREATE (t:TimeEntry {id: '${entry.id}', project_id: '${entry.projectId}',
        employee: '${entry.employee}', work_date: DATE('${entry.date}'),
        hours: ${entry.hours}, task: '${entry.task}'})
    `);
    await conn.query(`
      MATCH (t:TimeEntry {id: '${entry.id}'}), (p:Project {id: '${entry.projectId}'})
      CREATE (t)-[:WORKED_ON {on_date: DATE('${entry.date}')}]->(p)
    `);
  }
  logger.success('✓ Time entries inserted');

  // ============================================================
  // Query 1: Current Date/Time Functions
  // ============================================================
  logger.subheader('Query 1: Current Date and Time');

  logger.info('Get current date, datetime, and timestamp:');
  logger.query(`
    RETURN
      date() AS today,
      datetime() AS now,
      timestamp() AS epoch_millis
  `);

  const current = await executeQuery(conn, `
    RETURN
      date() AS today,
      datetime() AS now,
      timestamp() AS epoch_millis
  `);
  printResults(current);

  // ============================================================
  // Query 2: Date Comparisons
  // ============================================================
  logger.subheader('Query 2: Date Comparisons');

  logger.info('Find events scheduled for today or later:');
  logger.query(`
    MATCH (e:Event)
    WHERE e.event_date >= DATE('2024-01-16')
    RETURN e.name, e.event_date, e.location
    ORDER BY e.event_date
  `);

  const upcomingEvents = await executeQuery(conn, `
    MATCH (e:Event)
    WHERE e.event_date >= DATE('2024-01-16')
    RETURN e.name, e.event_date, e.location
    ORDER BY e.event_date
  `);
  printResults(upcomingEvents);

  // ============================================================
  // Query 3: Date Arithmetic
  // ============================================================
  logger.subheader('Query 3: Date Arithmetic');

  logger.info('Find projects starting within the next 30 days:');
  logger.query(`
    MATCH (p:Project)
    WHERE p.start_date >= DATE('2024-01-01')
      AND p.start_date <= DATE('2024-01-01') + DURATION('P30D')
    RETURN p.name, p.start_date, p.end_date, p.budget
    ORDER BY p.start_date
  `);

  const startingSoon = await executeQuery(conn, `
    MATCH (p:Project)
    WHERE p.start_date >= DATE('2024-01-15')
      AND p.start_date <= DATE('2024-01-15') + DURATION('P30D')
    RETURN p.name, p.start_date, p.end_date, p.budget
    ORDER BY p.start_date
  `);
  printResults(startingSoon);

  // ============================================================
  // Query 4: Duration Between Dates
  // ============================================================
  logger.subheader('Query 4: Duration Calculations');

  logger.info('Calculate project durations in days:');
  logger.query(`
    MATCH (p:Project)
    RETURN p.name,
           p.start_date,
           p.end_date,
           DATETIME(p.end_date) - DATETIME(p.start_date) AS duration_ms,
           p.budget
    ORDER BY duration_ms DESC
  `);

  const projectDurations = await executeQuery(conn, `
    MATCH (p:Project)
    RETURN p.name,
           p.start_date,
           p.end_date,
           p.budget
    ORDER BY p.end_date
  `);
  printResults(projectDurations);

  // ============================================================
  // Query 5: Active Projects on a Date
  // ============================================================
  logger.subheader('Query 5: Active Projects');

  logger.info('Find projects active on a specific date:');
  logger.query(`
    MATCH (p:Project)
    WHERE DATE('2024-02-15') >= p.start_date
      AND DATE('2024-02-15') <= p.end_date
    RETURN p.name, p.start_date, p.end_date,
           'Active' AS status
    ORDER BY p.name
  `);

  const activeProjects = await executeQuery(conn, `
    MATCH (p:Project)
    WHERE DATE('2024-02-15') >= p.start_date
      AND DATE('2024-02-15') <= p.end_date
    RETURN p.name, p.start_date, p.end_date,
           'Active' AS status
    ORDER BY p.name
  `);
  printResults(activeProjects);

  // ============================================================
  // Query 6: Time Tracking by Date Range
  // ============================================================
  logger.subheader('Query 6: Time Tracking Analytics');

  logger.info('Total hours worked per week:');
  logger.query(`
    MATCH (t:TimeEntry)
    WHERE t.work_date >= DATE('2024-01-08')
      AND t.work_date <= DATE('2024-01-14')
    RETURN t.employee,
           SUM(t.hours) AS total_hours,
           COUNT(t) AS entries
    ORDER BY total_hours DESC
  `);

  const weeklyHours = await executeQuery(conn, `
    MATCH (t:TimeEntry)
    WHERE t.work_date >= DATE('2024-01-10')
      AND t.work_date <= DATE('2024-01-11')
    RETURN t.employee,
           SUM(t.hours) AS total_hours,
           COUNT(t) AS entries,
           COLLECT(t.task) AS tasks
    ORDER BY total_hours DESC
  `);
  printResults(weeklyHours);

  // ============================================================
  // Query 7: Events by Duration
  // ============================================================
  logger.subheader('Query 7: Event Duration Analysis');

  logger.info('Parse ISO 8601 duration strings:');
  logger.query(`
    MATCH (e:Event)
    RETURN e.name, e.duration, e.location
    ORDER BY e.event_date
  `);

  const eventDurations = await executeQuery(conn, `
    MATCH (e:Event)
    RETURN e.name, e.event_date, e.duration, e.location
    ORDER BY e.event_date, e.event_time
  `);
  printResults(eventDurations);

  // ============================================================
  // Query 8: Date Functions (YEAR, MONTH, DAY)
  // ============================================================
  logger.subheader('Query 8: Date Component Extraction');

  logger.info('Group events by month:');
  logger.query(`
    MATCH (e:Event)
    RETURN e.name, e.event_date
    ORDER BY e.event_date
  `);

  const byDate = await executeQuery(conn, `
    MATCH (e:Event)
    RETURN e.name, e.event_date, e.location
    ORDER BY e.event_date
  `);
  printResults(byDate);

  // ============================================================
  // Query 9: Overlapping Date Ranges
  // ============================================================
  logger.subheader('Query 9: Finding Overlapping Periods');

  logger.info('Find projects with overlapping timelines:');
  logger.query(`
    MATCH (p1:Project), (p2:Project)
    WHERE p1.name < p2.name
      AND p1.start_date <= p2.end_date
      AND p1.end_date >= p2.start_date
    RETURN p1.name AS project1,
           p1.start_date AS start1,
           p1.end_date AS end1,
           p2.name AS project2,
           p2.start_date AS start2,
           p2.end_date AS end2,
           'Overlap' AS relationship
    ORDER BY project1
  `);

  const overlaps = await executeQuery(conn, `
    MATCH (p1:Project), (p2:Project)
    WHERE p1.name < p2.name
      AND p1.start_date <= p2.end_date
      AND p1.end_date >= p2.start_date
    RETURN p1.name AS project1,
           p1.start_date AS start1,
           p1.end_date AS end1,
           p2.name AS project2,
           p2.start_date AS start2,
           p2.end_date AS end2
    ORDER BY project1
  `);
  printResults(overlaps);

  // ============================================================
  // Query 10: Time-Based Aggregations
  // ============================================================
  logger.subheader('Query 10: Time-Based Analytics');

  logger.info('Project budget by duration category:');
  logger.query(`
    MATCH (p:Project)
    RETURN p.name,
           p.budget,
           CASE
             WHEN p.end_date < p.start_date + DURATION('P30D') THEN 'Short'
             WHEN p.end_date < p.start_date + DURATION('P90D') THEN 'Medium'
             ELSE 'Long'
           END AS duration_category
    ORDER BY budget DESC
  `);

  const budgetByDuration = await executeQuery(conn, `
    MATCH (p:Project)
    RETURN p.name,
           p.budget,
           p.start_date,
           p.end_date,
           CASE
             WHEN p.end_date < p.start_date + DURATION('P30D') THEN 'Short'
             WHEN p.end_date < p.start_date + DURATION('P90D') THEN 'Medium'
             ELSE 'Long'
           END AS duration_category
    ORDER BY budget DESC
  `);
  printResults(budgetByDuration);

  // ============================================================
  // Summary
  // ============================================================
  logger.subheader('Temporal Types Summary');

  logger.info('Key concepts covered:');
  logger.dim('  • DATE type - Calendar dates (year, month, day)');
  logger.dim('  • DATETIME type - Timestamps with millisecond precision');
  logger.dim('  • DURATION type - Time spans');
  logger.dim('  • date() - Create/parse date values');
  logger.dim('  • datetime() - Get current datetime or parse ISO strings');
  logger.dim('  • timestamp() - Unix epoch milliseconds');
  logger.dim('  • duration() - Parse ISO 8601 durations');
  logger.dim('  • Date comparisons and arithmetic');
  logger.dim('  • Date range queries');

  logger.newline();
  logger.info('ISO 8601 Duration examples:');
  logger.dim('  • PT30M - 30 minutes');
  logger.dim('  • PT2H - 2 hours');
  logger.dim('  • P1D - 1 day');
  logger.dim('  • P1W - 1 week');
  logger.dim('  • P1M - 1 month');
  logger.dim('  • P1Y - 1 year');
  logger.dim('  • PT1H30M - 1 hour 30 minutes');

  logger.newline();
  logger.info('Use cases:');
  logger.dim('  • Event scheduling and calendars');
  logger.dim('  • Project timeline management');
  logger.dim('  • Time tracking and billing');
  logger.dim('  • Historical data analysis');
  logger.dim('  • Deadline and reminder systems');

  // ============================================================
  // Cleanup
  // ============================================================
  logger.subheader('Cleanup');
  await db.close();
  logger.success('✓ Database closed');

  logger.header('Temporal Types Demo Completed!');
  logger.info('Temporal types enable sophisticated time-based queries.');
}
