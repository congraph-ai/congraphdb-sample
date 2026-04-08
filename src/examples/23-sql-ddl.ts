import { Database } from 'congraphdb';
import chalk from 'chalk';

/**
 * Example 23: SQL DDL & Insert Support
 * 
 * Showcases the SQL-style syntax introduced in v0.1.10 for 
 * database schema definition and data manipulation.
 */
export async function run(verbose: boolean = false): Promise<void> {
  console.log(chalk.cyan('\n--- CongraphDB SQL DDL Demo ---'));

  // Initialize database
  const db = new Database(':memory:');
  await db.init();
  const conn = db.createConnection();

  try {
    // 1. CREATE NODE TABLE with SQL syntax
    console.log(chalk.blue('\n1. Creating Node Tables with SQL DDL'));
    
    console.log(chalk.gray('Executing: CREATE NODE TABLE User(id STRING, name STRING, age INT64, PRIMARY KEY (id))'));
    await conn.query(`
      CREATE NODE TABLE User (
        id STRING, 
        name STRING NOT NULL, 
        age INT64, 
        PRIMARY KEY (id)
      )
    `);
    console.log(chalk.green('✓ Created User table'));

    console.log(chalk.gray('Executing: CREATE NODE TABLE Project(id SERIAL, name STRING, budget FLOAT, PRIMARY KEY (id))'));
    await conn.query(`
      CREATE NODE TABLE Project (
        id SERIAL, 
        name STRING, 
        budget FLOAT, 
        PRIMARY KEY (id)
      )
    `);
    console.log(chalk.green('✓ Created Project table'));

    // 2. CREATE REL TABLE with SQL syntax
    console.log(chalk.blue('\n2. Creating Relationship Tables'));
    
    console.log(chalk.gray('Executing: CREATE REL TABLE WORKS_ON(FROM User TO Project, role STRING)'));
    await conn.query(`
      CREATE REL TABLE WORKS_ON (
        FROM User TO Project,
        role STRING,
        since DATE
      )
    `);
    console.log(chalk.green('✓ Created WORKS_ON relationship table'));

    // 3. SHOW TABLES (New Cypher command)
    console.log(chalk.blue('\n3. Listing Tables'));
    const tables = await conn.query('SHOW TABLES');
    console.log(chalk.white('Current Tables:'));
    tables.all().forEach((t: any) => console.log(chalk.dim(`- ${t.name} (${t.type})`)));

    // 4. INSERT INTO (SQL-style)
    console.log(chalk.blue('\n4. Inserting Data with SQL Syntax'));
    
    console.log(chalk.gray("Executing: INSERT INTO User(id, name, age) VALUES ('u1', 'Alice', 30)"));
    await conn.query("INSERT INTO User(id, name, age) VALUES ('u1', 'Alice', 30)");
    
    console.log(chalk.gray("Executing: INSERT INTO User(id, name, age) VALUES ('u2', 'Bob', 25)"));
    await conn.query("INSERT INTO User(id, name, age) VALUES ('u2', 'Bob', 25)");

    console.log(chalk.gray("Executing: INSERT INTO Project(name, budget) VALUES ('AI Engine', 50000.0)"));
    await conn.query("INSERT INTO Project(name, budget) VALUES ('AI Engine', 50000.0)");

    // 5. Querying with Cypher (Interoperability)
    console.log(chalk.blue('\n5. Interoperability (SQL Insert -> Cypher Query)'));
    
    // Create relationship using Cypher
    await conn.query(`
      MATCH (u:User {id: 'u1'}), (p:Project {name: 'AI Engine'})
      CREATE (u)-[:WORKS_ON {role: 'Lead Developer'}]->(p)
    `);
    
    const result = await conn.query(`
      MATCH (u:User)-[r:WORKS_ON]->(p:Project)
      RETURN u.name as user, r.role as role, p.name as project
    `);

    console.log(chalk.white('\nAssignments:'));
    result.all().forEach((row: any) => {
      console.log(chalk.green(`✓ ${row.user}`) + chalk.gray(` is `) + chalk.white(row.role) + chalk.gray(` on `) + chalk.blue(row.project));
    });

  } catch (error) {
    console.error(chalk.red('Error in SQL DDL demo:'), error);
    throw error;
  } finally {
    await db.close();
  }
}
