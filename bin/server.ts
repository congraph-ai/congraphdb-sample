/**
 * Server entry point
 * Starts the CongraphDB server
 */

import { buildApp } from '../src/app.js';
import { getConfig } from '../src/config/index.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  dbPath?: string;
  inMemory?: boolean;
  noAuth?: boolean;
  logLevel?: string;
}

/**
 * Start the server
 */
export async function startServer(options: ServerOptions = {}): Promise<void> {
  // Build configuration from options
  const config = {
    server: {
      port: options.port || parseInt(process.env.CONGRAPH_PORT || '3000', 10),
      host: options.host || process.env.CONGRAPH_HOST || '0.0.0.0',
      corsOrigin: process.env.CONGRAPH_CORS_ORIGIN || '*',
      logLevel: (options.logLevel || process.env.CONGRAPH_LOG_LEVEL || 'info') as any,
    },
    database: {
      path: options.inMemory ? ':memory:' : (options.dbPath || process.env.CONGRAPH_DB_PATH || './data/congraphdb'),
      inMemory: !!options.inMemory,
      bufferSize: parseInt(process.env.CONGRAPH_DB_BUFFER_SIZE || '0', 10),
      compression: process.env.CONGRAPH_DB_COMPRESSION !== 'false',
      readOnly: process.env.CONGRAPH_DB_READ_ONLY === 'true',
      maxDbSize: process.env.CONGRAPH_DB_MAX_SIZE ? parseInt(process.env.CONGRAPH_DB_MAX_SIZE, 10) : undefined,
    },
    auth: {
      enabled: options.noAuth ? false : (process.env.CONGRAPH_AUTH_ENABLED !== 'false'),
      jwtSecret: process.env.CONGRAPH_JWT_SECRET || 'change-me-in-production',
      jwtExpiresIn: process.env.CONGRAPH_JWT_EXPIRES_IN || '24h',
      apiKey: process.env.CONGRAPH_API_KEY || '',
    },
    rateLimit: {
      enabled: process.env.CONGRAPH_RATE_LIMIT_ENABLED === 'true',
      max: parseInt(process.env.CONGRAPH_RATE_LIMIT_MAX || '100', 10),
      window: parseInt(process.env.CONGRAPH_RATE_LIMIT_WINDOW || '60000', 10),
    },
    backup: {
      enabled: process.env.CONGRAPH_BACKUP_ENABLED === 'true',
      interval: parseInt(process.env.CONGRAPH_BACKUP_INTERVAL || '300000', 10),
      retention: parseInt(process.env.CONGRAPH_BACKUP_RETENTION || '10', 10),
      path: process.env.CONGRAPH_BACKUP_PATH || './backups',
      compression: process.env.CONGRAPH_BACKUP_COMPRESSION !== 'false',
    },
  };

  // Build and start the app
  const app = await buildApp({ config });

  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log(`CongraphDB Server is running at http://${config.server.host}:${config.server.port}`);
    console.log(`Health check: http://${config.server.host}:${config.server.port}/health`);
    console.log(`GUI: http://${config.server.host}:${config.server.port}/gui`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
