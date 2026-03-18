/**
 * CongraphDB Sample Project - Main Entry Point
 *
 * A comprehensive demo showcasing CongraphDB features:
 * - Basic CRUD operations
 * - Social network graph queries
 * - Transactions with ACID guarantees
 * - Vector similarity search
 * - Database configuration options
 * - Advanced Cypher query patterns
 *
 * Usage:
 *   npm start                 - Run all examples
 *   npm start basics          - Run basics example only
 *   npm start social-network  - Run social network example only
 *   npm start -- --verbose    - Run with verbose output
 *   npm start -- --interactive - Interactive mode
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

// Import all examples
import { run as runBasics } from './examples/01-basics.js';
import { run as runSocialNetwork } from './examples/02-social-network.js';
import { run as runTransactions } from './examples/03-transactions.js';
import { run as runVectorSearch } from './examples/04-vector-search.js';
import { run as runConfiguration } from './examples/05-configuration.js';
import { run as runAdvancedQueries } from './examples/06-advanced-queries.js';
import { run as runPathFinding } from './examples/07-path-finding.js';
import { run as runTemporalTypes } from './examples/08-temporal-types.js';
import { run as runAdvancedFeatures } from './examples/09-advanced-features.js';
import { run as runJavaScriptApiBasics } from './examples/10-javascript-api-basics.js';
import { run as runJavaScriptApiCrud } from './examples/11-javascript-api-crud.js';
import { run as runNavigatorTraversal } from './examples/12-navigator-traversal.js';
import { run as runPatternMatching } from './examples/13-pattern-matching.js';
import { run as runWhenToUseWhat } from './examples/14-when-to-use-what.js';

// Example metadata
const EXAMPLES = [
  {
    name: 'basics',
    description: 'Basic CRUD operations',
    module: runBasics,
    order: 1,
  },
  {
    name: 'social-network',
    description: 'Social network graph demo',
    module: runSocialNetwork,
    order: 2,
  },
  {
    name: 'transactions',
    description: 'Transaction demo (ACID)',
    module: runTransactions,
    order: 3,
  },
  {
    name: 'vector-search',
    description: 'AI/Embedding similarity search',
    module: runVectorSearch,
    order: 4,
  },
  {
    name: 'configuration',
    description: 'Database configuration options',
    module: runConfiguration,
    order: 5,
  },
  {
    name: 'advanced-queries',
    description: 'Complex Cypher patterns',
    module: runAdvancedQueries,
    order: 6,
  },
  {
    name: 'path-finding',
    description: 'Path finding algorithms',
    module: runPathFinding,
    order: 7,
  },
  {
    name: 'temporal-types',
    description: 'Temporal data types',
    module: runTemporalTypes,
    order: 8,
  },
  {
    name: 'advanced-features',
    description: 'Multi-label, regex, maps',
    module: runAdvancedFeatures,
    order: 9,
  },
  {
    name: 'javascript-api-basics',
    description: 'JavaScript API basics',
    module: runJavaScriptApiBasics,
    order: 10,
  },
  {
    name: 'javascript-api-crud',
    description: 'JavaScript API CRUD operations',
    module: runJavaScriptApiCrud,
    order: 11,
  },
  {
    name: 'navigator-traversal',
    description: 'Navigator fluent traversal',
    module: runNavigatorTraversal,
    order: 12,
  },
  {
    name: 'pattern-matching',
    description: 'Pattern matching with find()',
    module: runPatternMatching,
    order: 13,
  },
  {
    name: 'when-to-use-what',
    description: 'Choosing query interface',
    module: runWhenToUseWhat,
    order: 14,
  },
];

// Global options
let verbose = false;
let spinner: Ora | null = null;

/**
 * Print the welcome banner
 */
function printBanner(): void {
  console.log('');
  console.log(chalk.bgBlue.white.bold(' CongraphDB Sample Project '));
  console.log(chalk.blue('─'.repeat(50)));
  console.log(chalk.dim('A comprehensive demo of CongraphDB features'));
  console.log('');
}

/**
 * Print the goodbye message
 */
function printGoodbye(): void {
  console.log('');
  console.log(chalk.bgGreen.white.bold(' Demo Complete! '));
  console.log(chalk.green('─'.repeat(50)));
  console.log('');
  console.log(chalk.dim('Learn more at: https://github.com/your-repo/congraphdb'));
  console.log('');
}

/**
 * Run a specific example
 */
async function runExample(name: string): Promise<boolean> {
  const example = EXAMPLES.find(e => e.name === name || e.name === name);

  if (!example) {
    console.error(chalk.red(`Unknown example: ${name}`));
    console.error(chalk.dim('Run with --help to see available examples'));
    return false;
  }

  const title = `Example ${example.order}: ${example.description}`;
  console.log('');
  console.log(chalk.bgCyan.black.bold(` ${title} `));

  try {
    await example.module(verbose);
    console.log('');
    console.log(chalk.green('✓') + ' ' + chalk.gray('Example completed successfully'));
    return true;
  } catch (error) {
    console.log('');
    console.error(chalk.red('✗') + ' ' + chalk.gray('Example failed:'));
    console.error(chalk.red((error as Error).message));
    if (verbose && (error as Error).stack) {
      console.error(chalk.gray((error as Error).stack));
    }
    return false;
  }
}

/**
 * Run all examples in sequence
 */
async function runAllExamples(): Promise<void> {
  printBanner();

  console.log(chalk.cyan('Running all examples...\n'));

  const results: { name: string; success: boolean }[] = [];

  for (const example of EXAMPLES) {
    const success = await runExample(example.name);
    results.push({ name: example.name, success: success });

    // Add spacing between examples
    if (example.order < EXAMPLES.length) {
      console.log('');
      console.log(chalk.gray(''.padEnd(50, '─')));
    }
  }

  // Print summary
  console.log('');
  console.log(chalk.bgYellow.black.bold(' Summary '));
  console.log(chalk.yellow('─'.repeat(50)));

  for (const result of results) {
    const status = result.success
      ? chalk.green('✓')
      : chalk.red('✗');
    const name = EXAMPLES.find(e => e.name === result.name)?.description || result.name;
    console.log(`${status} ${chalk.gray(name)}`);
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log('');
  console.log(chalk.dim(`${successCount}/${totalCount} examples completed successfully`));

  printGoodbye();
}

/**
 * Interactive mode - let user select which example to run
 */
async function interactiveMode(): Promise<void> {
  printBanner();

  console.log(chalk.cyan('Interactive Mode\n'));

  // List available examples
  console.log(chalk.dim('Available examples:'));
  console.log('');

  for (const example of EXAMPLES) {
    console.log(`  ${chalk.cyan(example.order.toString().padStart(2))}. ${chalk.white(example.description)}`);
    console.log(`     ${chalk.dim(example.name)}`);
    console.log('');
  }

  console.log(`  ${chalk.cyan(' 0').padStart(3)}. ${chalk.white('Run all examples')}`);
  console.log(`  ${chalk.cyan(' q').padStart(3)}. ${chalk.white('Quit')}`);
  console.log('');

  // In a real CLI with readline, we'd prompt for input
  // For this demo, we'll just show the menu
  console.log(chalk.dim('To run an example, use: npm start <example-name>'));
  console.log(chalk.dim('Example: npm start basics'));
  console.log('');
}

/**
 * List all available examples
 */
function listExamples(): void {
  console.log('');
  console.log(chalk.bgCyan.black.bold(' Available Examples '));
  console.log(chalk.cyan('─'.repeat(50)));

  for (const example of EXAMPLES) {
    console.log(`  ${chalk.cyan(example.name.padEnd(20))} ${chalk.gray(example.description)}`);
  }

  console.log('');
  console.log(chalk.dim('Usage: npm start <example-name>'));
  console.log(chalk.dim('Example: npm start basics'));
  console.log('');
}

/**
 * Main CLI setup
 */
function main(): void {
  const program = new Command();

  program
    .name('congraphdb-sample')
    .description('CongraphDB Sample Project - Comprehensive demo')
    .version('0.1.0')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('-i, --interactive', 'Interactive mode (select example to run)', false)
    .option('-l, --list', 'List all available examples', false)
    .argument('[example]', 'Example to run (basics, social-network, etc.)')
    .action(async (exampleName: string | undefined, options) => {
      verbose = options.verbose;

      if (options.list) {
        listExamples();
        return;
      }

      if (options.interactive) {
        await interactiveMode();
        return;
      }

      if (!exampleName) {
        // No example specified - run all
        await runAllExamples();
        return;
      }

      // Run specific example
      printBanner();
      const success = await runExample(exampleName);

      if (!success) {
        process.exit(1);
      }

      printGoodbye();
    });

  program.parse();
}

// Run the CLI
main();
