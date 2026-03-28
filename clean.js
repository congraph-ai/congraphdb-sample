import { unlinkSync, rmSync, existsSync, readdirSync } from 'fs';

// Remove dist directory
if (existsSync('dist')) {
  rmSync('dist', { recursive: true, force: true });
}

// Remove data files with specific extensions
if (existsSync('data')) {
  const files = readdirSync('data');
  for (const file of files) {
    if (file.endsWith('.cgraph') || file.endsWith('.wal')) {
      unlinkSync(`data/${file}`);
    }
  }
}
