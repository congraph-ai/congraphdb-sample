/**
 * CongraphDB SDK - high-level driver for CongraphDB
 * Provides note-taking and graph operations with filesystem synchronization
 */

import { Database, Connection } from 'congraphdb';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  CreateNoteInput, 
  UpdateNoteInput, 
  NoteResponse, 
  NeighborInfo, 
  GraphData, 
  SearchResult, 
  GraphLink,
  QueryDbType,
  IDatabaseOperations
} from './types.js';
import { DatabaseJavaScript } from './javascript.js';
import { DatabaseCypher, SchemaService } from './cypher.js';

export class CongraphSDK {
  private db: Database;
  private connection: Connection | null = null;
  private impl: IDatabaseOperations | null = null;
  private initialized = false;
  private notesPath: string;
  private dbPath: string;
  private queryDbType: QueryDbType;

  constructor(dbPath: string = ':memory:', notesPath?: string, queryDbType: QueryDbType = 'javascript') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.queryDbType = queryDbType;

    // Set notes path for filesystem synchronization
    if (notesPath) {
      this.notesPath = notesPath;
    } else if (dbPath === ':memory:') {
      this.notesPath = path.join(process.cwd(), 'data', 'notes');
    } else {
      const dbDir = path.dirname(dbPath);
      this.notesPath = path.resolve(process.cwd(), dbDir, 'notes');
    }

    console.log(`[CongraphSDK] Using ${this.queryDbType} engine for database operations`);
  }

  /**
   * Initialize the SDK, connection, and schema
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.db.init();
    const conn = this.db.createConnection();
    this.connection = conn;
    this.initialized = true;

    // Initialize the implementation
    if (this.queryDbType === 'cypher') {
      this.impl = new DatabaseCypher(conn);
    } else {
      this.impl = new DatabaseJavaScript(conn);
    }

    await this.impl.init();

    // Ensure notes directory exists
    try {
      await fs.mkdir(this.notesPath, { recursive: true });
    } catch (err) {
      console.error(`[CongraphSDK] Failed to create notes directory: ${this.notesPath}`, err);
    }

    // Initialize schema
    const schemaService = new SchemaService(this.connection!);
    await schemaService.ensureSchema();

    // Restore from filesystem if not in-memory
    if (this.dbPath !== ':memory:') {
      await this.restoreFromFilesystem();
    }
  }

  /**
   * Restore notes from the filesystem
   */
  async restoreFromFilesystem(): Promise<{ restored: number; total: number }> {
    if (!this.impl) throw new Error('SDK not initialized');

    try {
      const files = await fs.readdir(this.notesPath);
      const mdFiles = files.filter((f) => f.endsWith('.md'));

      if (mdFiles.length === 0) return { restored: 0, total: 0 };

      console.log(`[CongraphSDK] Restoring ${mdFiles.length} notes from disk...`);

      let restoredCount = 0;

      for (const file of mdFiles) {
        try {
          const filePath = path.join(this.notesPath, file);
          const content = await fs.readFile(filePath, 'utf8');

          const parts = content.split(/---(?:\r?\n|$)/);
          if (parts.length < 3) continue;

          const frontmatter = parts[1];
          const noteContent = parts.slice(2).join('---\n');

          const lines = frontmatter.split('\n');
          const data: Record<string, any> = {};
          for (const line of lines) {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const key = line.substring(0, colonIdx).trim();
              const value = line.substring(colonIdx + 1).trim();
              
              if (key === 'title') {
                data[key] = value.replace(/^["']|["']$/g, '').replace(/\\"/g, '"');
              } else if (key === 'tags') {
                data[key] = value.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(s => s);
              } else if (key === 'version') {
                data[key] = parseInt(value, 10);
              } else {
                data[key] = value;
              }
            }
          }

          if (!data.id) continue;

          const existingNote = await this.impl.getNote(String(data.id));

          if (!existingNote) {
            await this.impl.createNote({
              id: String(data.id),
              title: String(data.title || 'Untitled'),
              content: noteContent.trim(),
              tags: Array.isArray(data.tags) ? data.tags : [],
              attributes: typeof data.attributes === 'object' ? data.attributes : {},
            });
            restoredCount++;
          }
        } catch (err) {
          console.error(`[CongraphSDK] Failed to restore note from file ${file}:`, err);
        }
      }

      return { restored: restoredCount, total: mdFiles.length };
    } catch (err) {
      console.error('[CongraphSDK] Failed to restore notes from filesystem:', err);
      return { restored: 0, total: 0 };
    }
  }

  /**
   * Create a new note
   */
  async createNote(input: CreateNoteInput): Promise<NoteResponse> {
    if (!this.impl) throw new Error('SDK not initialized');

    const note = await this.impl.createNote(input);
    await this.syncNoteToFile(note);
    await this.impl.parseAndCreateLinks(note.id, input.content || '');

    return note;
  }

  /**
   * Get a note by ID
   */
  async getNote(id: string): Promise<NoteResponse | null> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getNote(id);
  }

  /**
   * Update a note
   */
  async updateNote(id: string, input: UpdateNoteInput): Promise<NoteResponse | null> {
    if (!this.impl) throw new Error('SDK not initialized');

    const note = await this.impl.updateNote(id, input);
    if (note) {
      await this.syncNoteToFile(note);
    }
    return note;
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    if (!this.impl) throw new Error('SDK not initialized');

    const success = await this.impl.deleteNote(id);
    if (success) {
      await this.deleteNoteFile(id);
    }
    return success;
  }

  /**
   * List all notes
   */
  async listNotes(limit = 100, offset = 0): Promise<NoteResponse[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.listNotes(limit, offset);
  }

  /**
   * Get neighbors of a node
   */
  async getNeighbors(nodeId: string, depth = 1): Promise<NeighborInfo[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getNeighbors(nodeId, depth);
  }

  /**
   * Get graph data for visualization
   */
  async getGraphData(centerId?: string, radius = 2): Promise<GraphData> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getGraphData(centerId, radius);
  }

  /**
   * Search notes
   */
  async searchNotes(query: string, limit = 20): Promise<SearchResult[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.searchNotes(query, limit);
  }

  /**
   * Search by tag
   */
  async searchByTag(tag: string, limit = 100): Promise<SearchResult[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.searchByTag(tag, limit);
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit = 10): Promise<Array<{ title: string; id: string; type: string }>> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getSuggestions(query, limit);
  }

  /**
   * Find shortest path
   */
  async findPath(fromId: string, toId: string, maxDepth = 5): Promise<string[] | null> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.findPath(fromId, toId, maxDepth);
  }

  /**
   * Get backlinks
   */
  async getBacklinks(noteId: string): Promise<GraphLink[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getBacklinks(noteId);
  }

  /**
   * Get links
   */
  async getLinks(noteId: string): Promise<GraphLink[]> {
    if (!this.impl) throw new Error('SDK not initialized');
    return await this.impl.getLinks(noteId);
  }

  /**
   * Sync a note to the file system as a markdown file
   */
  private async syncNoteToFile(note: NoteResponse): Promise<void> {
    try {
      const fileName = `${note.id}.md`;
      const filePath = path.join(this.notesPath, fileName);

      let frontmatter = '---\n';
      frontmatter += `id: ${note.id}\n`;
      frontmatter += `title: "${note.title.replace(/"/g, '\\"')}"\n`;
      if (note.tags && note.tags.length > 0) {
        frontmatter += `tags: [${note.tags.join(', ')}]\n`;
      }
      frontmatter += `createdAt: ${note.createdAt}\n`;
      frontmatter += `updatedAt: ${note.updatedAt}\n`;
      frontmatter += `version: ${note.version}\n`;

      if (note.attributes && Object.keys(note.attributes).length > 0) {
        for (const [key, value] of Object.entries(note.attributes)) {
          frontmatter += `${key}: ${JSON.stringify(value)}\n`;
        }
      }

      frontmatter += '---\n\n';

      const fileContent = frontmatter + (note.content || '');
      await fs.writeFile(filePath, fileContent, 'utf8');
    } catch (err) {
      console.error(`[CongraphSDK] Failed to sync note ${note.id} to file:`, err);
    }
  }

  /**
   * Delete a note's markdown file
   */
  private async deleteNoteFile(id: string): Promise<void> {
    try {
      const fileName = `${id}.md`;
      const filePath = path.join(this.notesPath, fileName);
      await fs.unlink(filePath).catch(() => {});
    } catch (err) {
      console.error(`[CongraphSDK] Failed to delete file for note ${id}:`, err);
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      this.connection = null;
    }
    this.db.close();
    this.initialized = false;
  }

  /**
   * Get the underlying connection
   */
  getConnection(): Connection {
    if (!this.connection) throw new Error('SDK not initialized');
    return this.connection;
  }
}
