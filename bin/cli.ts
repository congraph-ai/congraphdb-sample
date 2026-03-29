#!/usr/bin/env node
/**
 * CLI entry point for CongraphDB Server
 */

import { startServer } from './server.js';

/**
 * Parse command line arguments and start server
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Record<string, string | boolean | number> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-p' || arg === '--port') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '-h' || arg === '--host') {
      options.host = args[++i];
    } else if (arg === '-d' || arg === '--db-path') {
      options.dbPath = args[++i];
    } else if (arg === '-m' || arg === '--memory') {
      options.inMemory = true;
    } else if (arg === '--no-auth') {
      options.noAuth = true;
    } else if (arg === '--log-level') {
      options.logLevel = args[++i];
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version') {
      console.log('congraphdb-server v0.1.0');
      process.exit(0);
    } else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  await startServer(options);
}

function printHelp(): void {
  console.log(`
CongraphDB Server v0.1.0

USAGE:
  congraphdb-server start [OPTIONS]

OPTIONS:
  -p, --port <port>        Port to listen on (default: 3000)
  -h, --host <host>        Host to bind to (default: 0.0.0.0)
  -d, --db-path <path>     Path to database file
  -m, --memory             Use in-memory database
  --no-auth                Disable authentication
  --log-level <level>      Log level (trace|debug|info|warn|error|fatal)
  --help                   Display this help message
  --version                Display version information

ENVIRONMENT VARIABLES:
  CONGRAPH_PORT            Port to listen on
  CONGRAPH_HOST            Host to bind to
  CONGRAPH_DB_PATH         Path to database file
  CONGRAPH_DB_IN_MEMORY    Use in-memory database (true/false)
  CONGRAPH_AUTH_ENABLED    Enable authentication (true/false)
  CONGRAPH_JWT_SECRET      JWT secret key
  CONGRAPH_API_KEY         API key for programmatic access
  CONGRAPH_LOG_LEVEL       Log level

EXAMPLES:
  # Start with default settings
  congraphdb-server start

  # Start on custom port with in-memory database
  congraphdb-server start --port 8080 --memory

  # Start without authentication
  congraphdb-server start --no-auth

For more information, visit https://github.com/congraph-ai/congraphdb-server
`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
