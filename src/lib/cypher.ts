/**
 * Cypher query implementation of database operations
 * Uses raw Cypher queries for all database operations
 */

import type { Connection } from 'congraphdb';
import type {
  CreateNoteInput,
  UpdateNoteInput,
  NoteResponse,
  GraphLink,
  NeighborInfo,
  GraphData,
  SearchResult,
  GraphNode,
  GraphEdge,
  IDatabaseOperations,
} from './types.js';
import {
  idify,
  nodeToNoteResponse,
  extractSnippet,
  calculateScore,
} from './common.js';

/**
 * Schema Service - Handles database schema creation and management using Cypher
 * This service is responsible for DDL (Data Definition Language) operations
 */
export class SchemaService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Ensure database schema exists
   * Creates tables and indexes using Cypher DDL
   */
  async ensureSchema(): Promise<void> {
    console.log('[SchemaService] Creating database schema...');

    await this.createNoteTable();
    await this.createTagTable();
    await this.createTagRelationship();
    await this.createLinkRelationship();
    await this.createIndexes();

    console.log('[SchemaService] ✓ Schema creation complete');
  }

  /**
   * Create Note node table
   */
  private async createNoteTable(): Promise<void> {
    try {
      await this.connection.query(`
        CREATE NODE TABLE Note (
          id STRING,
          title STRING,
          content STRING,
          tags STRING,
          attributes STRING,
          createdAt STRING,
          updatedAt STRING,
          version INT64,
          PRIMARY KEY (id)
        )
      `);
      console.log('[SchemaService] ✓ Note table created');
    } catch (e) {
      const err = e as Error;
      if (!err.message.includes('already exists')) {
        console.error('[SchemaService] Error creating Note table:', err.message);
        throw err;
      }
    }
  }

  /**
   * Create Tag node table
   */
  private async createTagTable(): Promise<void> {
    try {
      await this.connection.query(`
        CREATE NODE TABLE Tag (
          id STRING,
          name STRING,
          createdAt STRING,
          PRIMARY KEY (id)
        )
      `);
      console.log('[SchemaService] ✓ Tag table created');
    } catch (e) {
      const err = e as Error;
      if (!err.message.includes('already exists')) {
        console.error('[SchemaService] Error creating Tag table:', err.message);
        throw err;
      }
    }
  }

  /**
   * Create TAG relationship table
   */
  private async createTagRelationship(): Promise<void> {
    try {
      await this.connection.query(`
        CREATE REL TABLE TAG (
          FROM Note TO Tag,
          createdAt STRING
        )
      `);
      console.log('[SchemaService] ✓ TAG relationship table created');
    } catch (e) {
      const err = e as Error;
      if (!err.message.includes('already exists')) {
        console.error('[SchemaService] Error creating TAG relationship table:', err.message);
        throw err;
      }
    }
  }

  /**
   * Create LINK relationship table
   */
  private async createLinkRelationship(): Promise<void> {
    try {
      await this.connection.query(`
        CREATE REL TABLE LINK (
          FROM Note TO Note,
          createdAt STRING
        )
      `);
      console.log('[SchemaService] ✓ LINK relationship table created');
    } catch (e) {
      const err = e as Error;
      if (!err.message.includes('already exists')) {
        console.error('[SchemaService] Error creating LINK relationship table:', err.message);
        throw err;
      }
    }
  }

  /**
   * Create indexes for performance
   */
  private async createIndexes(): Promise<void> {
    // Index on createdAt
    try {
      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS note_created_at ON Note (createdAt DESC);
      `);
    } catch {
      // Index might already exist
    }

    // Index on updatedAt
    try {
      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS note_updated_at ON Note (updatedAt DESC);
      `);
    } catch {
      // Index might already exist
    }

    console.log('[SchemaService] ✓ Indexes created');
  }
}

interface QueryResult {
  getNext(): Promise<null | Record<string, unknown>>;
  getAll(): Promise<Record<string, unknown>[]>;
}

export class DatabaseCypher implements IDatabaseOperations {
  private connection: Connection;
  private initialized = false;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Initialize the Cypher implementation
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[DatabaseCypher] Initialized');
  }

  /**
   * Helper to format values for Cypher literals
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) return `[${value.map((v) => this.formatValue(v)).join(', ')}]`;
    if (typeof value === 'object') {
      const entries = Object.entries(value).map(([k, v]) => `${k}: ${this.formatValue(v)}`);
      return `{${entries.join(', ')}}`;
    }
    return String(value);
  }

  /**
   * Helper to run a query with parameter substitution
   */
  private async runQuery(query: string, params: Record<string, unknown> = {}): Promise<QueryResult> {
    const paramEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)); 
    let finalQuery = query;
    let paramIndex = 0;

    for (const [key] of paramEntries) {
      const placeholder = `___PARAM_${paramIndex}___`;
      const regex = new RegExp(`\\$${key}\\b`, 'g');
      finalQuery = finalQuery.replace(regex, placeholder);
      paramIndex++;
    }

    paramIndex = 0;
    for (const [, value] of paramEntries) {
      const placeholder = `___PARAM_${paramIndex}___`;
      finalQuery = finalQuery.replaceAll(placeholder, this.formatValue(value));
      paramIndex++;
    }

    finalQuery = finalQuery.trim();
    return await this.connection.query(finalQuery);
  }

  /**
   * Create a new note using Cypher
   */
  async createNote(input: CreateNoteInput): Promise<NoteResponse> {
    const now = new Date().toISOString();
    let id: string;

    if (input.id) {
      id = input.id;
    } else {
      const stubQuery = `MATCH (n:Note) WHERE n.title = $title AND n.attributes CONTAINS 'stub' RETURN n`;
      const sResult = await this.runQuery(stubQuery, { title: input.title });
      let stubRow = await sResult.getNext();
      const stubNode = stubRow?.n as Record<string, unknown> | undefined;

      if (stubNode && typeof stubNode.id === 'string') {
        id = stubNode.id;
        const updateQuery = `MATCH (n:Note) WHERE n.id = $id SET n.content = $content, n.tags = $tags, n.attributes = $attributes, n.updatedAt = $updatedAt RETURN n`;
        const result = await this.runQuery(updateQuery, {
          id,
          content: input.content || '',
          tags: (input.tags || []).join(','),
          attributes: JSON.stringify(input.attributes || {}),
          updatedAt: now,
        } as Record<string, unknown>);

        const row = await result.getNext();
        if (!row || !row.n) {
          throw new Error(`Failed to update stub Note node with title: ${input.title}`);
        }

        const node = row.n as Record<string, unknown>;

        if (input.tags && input.tags.length > 0) {
          for (const tag of input.tags) {
            await this.ensureTagNode(tag);
            const tagQuery = `MATCH (n:Note), (t:Tag) WHERE n.id = $noteId AND t.name = $tagName CREATE (n)-[r:TAG {createdAt: $createdAt}]->(t)`;
            await this.runQuery(tagQuery, { noteId: id, tagName: tag, createdAt: now });
          }
        }
        return nodeToNoteResponse(node);
      }

      id = idify(input.title) + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    }

    const query = `CREATE (n:Note {id: $id, title: $title, content: $content, tags: $tags, attributes: $attributes, createdAt: $createdAt, updatedAt: $updatedAt, version: $version}) RETURN n`;
    const result = await this.runQuery(query, {
      id,
      title: input.title,
      content: input.content || '',
      tags: (input.tags || []).join(','),
      attributes: JSON.stringify(input.attributes || {}),
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as Record<string, unknown>);

    const row = await result.getNext();
    if (!row || !row.n) throw new Error(`Failed to create Note node with title: ${input.title}`);

    const node = row.n as Record<string, unknown>;

    if (input.tags && input.tags.length > 0) {
      for (const tag of input.tags) {
        await this.ensureTagNode(tag);
        const tagQuery = `MATCH (n:Note), (t:Tag) WHERE n.id = $noteId AND t.name = $tagName CREATE (n)-[r:TAG {createdAt: $createdAt}]->(t)`;
        await this.runQuery(tagQuery, { noteId: id, tagName: tag, createdAt: now });
      }
    }

    return nodeToNoteResponse(node);
  }

  async getNote(id: string): Promise<NoteResponse | null> {
    const query = `MATCH (n:Note) WHERE n.id = $id RETURN n`;
    const result = await this.runQuery(query, { id });
    const row = await result.getNext();
    if (!row || !row.n) return null;
    return nodeToNoteResponse(row.n as Record<string, unknown>);
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<NoteResponse | null> {
    const existing = await this.getNote(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const params: Record<string, unknown> = { id };

    if (input.createdAt !== undefined) {
      setClauses.push('n.createdAt = $createdAt');
      params.createdAt = input.createdAt;
    }
    if (input.updatedAt !== undefined) {
      setClauses.push('n.updatedAt = $updatedAt');
      params.updatedAt = input.updatedAt;
    } else {
      setClauses.push('n.updatedAt = $updatedAt');
      params.updatedAt = now;
    }
    if (input.version !== undefined) {
      setClauses.push('n.version = $version');
      params.version = input.version;
    } else {
      const newVersion = (existing.version || 1) + 1;
      setClauses.push('n.version = $version');
      params.version = newVersion;
    }

    if (input.title !== undefined) { setClauses.push('n.title = $title'); params.title = input.title; }
    if (input.content !== undefined) { setClauses.push('n.content = $content'); params.content = input.content; }
    if (input.tags !== undefined) { setClauses.push('n.tags = $tags'); params.tags = (input.tags || []).join(','); }
    if (input.attributes !== undefined) { setClauses.push('n.attributes = $attributes'); params.attributes = JSON.stringify(input.attributes); }

    const query = `MATCH (n:Note) WHERE n.id = $id SET ${setClauses.join(', ')} RETURN n`;
    const result = await this.runQuery(query, params);
    const row = await result.getNext();
    if (!row || !row.n) return null;

    if (input.tags !== undefined) {
      const deleteTagQuery = `MATCH (n:Note)-[r:TAG]->(t:Tag) WHERE n.id = $id DELETE r`;
      await this.runQuery(deleteTagQuery, { id });
      for (const tag of input.tags) {
        await this.ensureTagNode(tag);
        const tagQuery = `MATCH (n:Note), (t:Tag) WHERE n.id = $noteId AND t.name = $tagName CREATE (n)-[r:TAG {createdAt: $createdAt}]->(t)`;
        await this.runQuery(tagQuery, { noteId: id, tagName: tag, createdAt: now });
      }
    }

    if (input.content !== undefined) {
      const deleteLinkQuery = `MATCH (n:Note)-[r:LINK]->(m:Note) WHERE n.id = $id DELETE r`;
      await this.runQuery(deleteLinkQuery, { id });
      await this.parseAndCreateLinks(id, input.content);
    }

    return nodeToNoteResponse(row.n as Record<string, unknown>);
  }

  async deleteNote(id: string): Promise<boolean> {
    const checkQuery = `MATCH (n:Note) WHERE n.id = $id RETURN n.id as id`;
    const checkResult = await this.runQuery(checkQuery, { id });
    const checkRow = await checkResult.getNext();
    if (checkRow === null) return false;
    const deleteQuery = `MATCH (n:Note) WHERE n.id = $id DETACH DELETE n`;
    await this.runQuery(deleteQuery, { id });
    return true;
  }

  async listNotes(limit: number = 100, offset: number = 0): Promise<NoteResponse[]> {
    const result = await this.runQuery(`MATCH (n:Note) RETURN n`);
    const notes: NoteResponse[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.n) notes.push(nodeToNoteResponse(row.n as Record<string, unknown>));
    }
    const sortedNotes = notes.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });
    return sortedNotes.slice(offset, offset + limit);
  }

  async getNeighbors(nodeId: string, depth: number = 1): Promise<NeighborInfo[]> {
    const query = `
      MATCH (start:Note) WHERE start.id = $nodeId
      MATCH path = (start)-[:LINK*1..$depth]-(related:Note)
      RETURN related, length(path) as distance LIMIT 500
    `;
    const result = await this.runQuery(query, { nodeId, depth });
    const neighbors: NeighborInfo[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      const neighbor = (row.related || row.node || row.n || row[Object.keys(row)[0]]) as Record<string, unknown> | undefined;
      if (neighbor) {
        neighbors.push({
          id: String(neighbor.id || ''),
          title: String(neighbor.title || 'Untitled'),
          type: 'note',
          distance: Number(row.distance || 1),
        });
      }
    }
    return neighbors;
  }

  async getGraphData(centerId?: string, radius: number = 2): Promise<GraphData> {
    let nodeIdsSet = new Set<string>();
    if (centerId && centerId !== 'undefined') {
      const radiusQuery = `MATCH (start:Note) WHERE start.id = $centerId MATCH path = (start)-[:LINK*1..$radius]-(related:Note) RETURN DISTINCT related.id as id`;
      const result = await this.runQuery(radiusQuery, { centerId, radius });
      let row;
      while ((row = await result.getNext()) !== null) nodeIdsSet.add(String(row.id || ''));
      nodeIdsSet.add(centerId);
    } else {
      const notes = await this.getAllNotes();
      notes.slice(0, 500).forEach((n) => nodeIdsSet.add(n.id));
    }
    const nodeIds = Array.from(nodeIdsSet);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    if (nodeIds.length > 0) {
      const nodesQuery = `MATCH (n:Note) WHERE n.id IN $ids RETURN n`;
      const nodesResult = await this.runQuery(nodesQuery, { ids: nodeIds });
      let nRow;
      while ((nRow = await nodesResult.getNext()) !== null) {
        const n = nRow.n as Record<string, unknown>;
        nodes.push({
          id: String(n.id || ''),
          label: String(n.title || 'Untitled'),
          type: 'note',
          tags: typeof n.tags === 'string' ? n.tags.split(',').filter((t: string) => t) : [],
        });
      }
      const edgesQuery = `MATCH (a:Note)-[r:LINK]->(b:Note) WHERE a.id IN $ids AND b.id IN $ids RETURN a.id as sourceId, b.id as targetId`;
      const edgesResult = await this.runQuery(edgesQuery, { ids: nodeIds });
      let eRow;
      while ((eRow = await edgesResult.getNext()) !== null) {
        edges.push({
          id: `${String(eRow.sourceId || '')}-${String(eRow.targetId || '')}`,
          source: String(eRow.sourceId || ''),
          target: String(eRow.targetId || ''),
          type: 'LINK' as const,
        });
      }
    }
    return { nodes, edges };
  }

  async searchNotes(query: string, limit: number = 20): Promise<SearchResult[]> {
    const searchTerm = query.toLowerCase();
    const result = await this.runQuery(`MATCH (n:Note) RETURN n`);
    const results: SearchResult[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.n) {
        const n = row.n as Record<string, unknown>;
        const title = String(n.title || 'Untitled').toLowerCase();
        const content = String(n.content || '').toLowerCase();
        if (title.includes(searchTerm) || content.includes(searchTerm)) {
          const score = calculateScore(String(n.title || 'Untitled'), String(n.content || ''), searchTerm);
          results.push({
            ...nodeToNoteResponse(n),
            content: extractSnippet(String(n.content || ''), searchTerm),
            score,
          });
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async searchByTag(tag: string, limit: number = 100): Promise<SearchResult[]> {
    const query = `MATCH (n:Note)-[:TAG]->(t:Tag) WHERE t.name = $tag RETURN n LIMIT $limit`;
    const result = await this.runQuery(query, { tag, limit });
    const results: SearchResult[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.n) results.push({ ...nodeToNoteResponse(row.n as Record<string, unknown>), score: 1 });
    }
    return results;
  }

  async getSuggestions(query: string, limit: number = 10): Promise<Array<{ title: string; id: string; type: string }>> {
    const searchTerm = query.toLowerCase();
    if (!query || query.length < 2) return [];
    const suggestions: Array<{ title: string; id: string; type: string }> = [];
    const nResult = await this.runQuery(`MATCH (n:Note) RETURN n`);
    let nRow;
    while ((nRow = await nResult.getNext()) !== null) {
      if (nRow.n) {
        const n = nRow.n as Record<string, unknown>;
        if (typeof n.title === 'string' && n.title.toLowerCase().includes(searchTerm)) {
          suggestions.push({ title: n.title || 'Untitled', id: String(n.id || ''), type: 'note' });
          if (suggestions.length >= limit) break;
        }
      }
    }
    const tResult = await this.runQuery(`MATCH (t:Tag) RETURN t`);
    let tRow;
    while ((tRow = await tResult.getNext()) !== null) {
      if (tRow.t) {
        const t = tRow.t as Record<string, unknown>;
        if (typeof t.name === 'string' && t.name.toLowerCase().includes(searchTerm)) {
          suggestions.push({ title: t.name, id: 'tag_' + t.name, type: 'tag' });
          if (suggestions.length >= limit * 2) break;
        }
      }
    }
    return suggestions.slice(0, limit);
  }

  async findPath(fromId: string, toId: string, maxDepth: number = 5): Promise<string[] | null> {
    try {
      const notes = await this.getAllNotes();
      const fromNote = notes.find((n: NoteResponse) => n.id === fromId);
      const toNote = notes.find((n: NoteResponse) => n.id === toId);
      if (!fromNote || !toNote) return null;
      const directQuery = `MATCH (a:Note {id: '${fromId}'})-[r:LINK]->(b:Note {id: '${toId}'}) RETURN a, b`;
      const directResult = await this.connection.query(directQuery);
      const directRow = await directResult.getNext();
      if (directRow && directRow.a && directRow.b) return [String((directRow.a as any).id), String((directRow.b as any).id)];
      if (maxDepth >= 2) {
        const outgoingQuery = `MATCH (a:Note {id: '${fromId}'})-[r:LINK]->(m:Note) RETURN m`;
        const outgoingResult = await this.connection.query(outgoingQuery);
        const mids: string[] = [];
        let mRow;
        while ((mRow = await outgoingResult.getNext()) !== null) {
          const m = (mRow.m || mRow) as any;
          if (m && typeof m.id === 'string') mids.push(m.id);
        }
        for (const midId of mids) {
          const verifyQuery = `MATCH (m:Note {id: '${midId}'})-[r:LINK]->(b:Note {id: '${toId}'}) RETURN b`;
          const verifyResult = await this.connection.query(verifyQuery);
          if ((await verifyResult.getNext()) !== null) return [fromId, midId, toId];
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  async getBacklinks(noteId: string): Promise<GraphLink[]> {
    const query = `MATCH (source:Note)-[r:LINK]->(target:Note) WHERE target.id = '${noteId}' RETURN source`;
    const result = await this.connection.query(query);
    const backlinks: GraphLink[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      const sourceNode = (row.source || row) as Record<string, unknown>;
      if (sourceNode && typeof sourceNode.id === 'string') {
        backlinks.push({ id: `${sourceNode.id}-${noteId}`, targetId: sourceNode.id, targetTitle: String(sourceNode.title || 'Untitled'), type: 'LINK' as const });
      }
    }
    return backlinks;
  }

  async getLinks(noteId: string): Promise<GraphLink[]> {
    const query = `MATCH (source:Note)-[r:LINK]->(target:Note) WHERE source.id = $noteId RETURN target`;
    const result = await this.runQuery(query, { noteId });
    const links: GraphLink[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      const target = row.target as Record<string, unknown>;
      links.push({ id: `${noteId}-${String(target.id || '')}`, targetId: String(target.id || ''), targetTitle: String(target.title || 'Untitled'), type: 'LINK' as const });
    }
    return links;
  }

  async ensureTagNode(tag: string): Promise<NoteResponse | null> {
    const now = new Date().toISOString();
    const query = `MERGE (t:Tag {name: $tag}) ON CREATE SET t.id = $tag, t.name = $tag, t.createdAt = $createdAt RETURN t`;
    const result = await this.runQuery(query, { tag, createdAt: now });
    const row = await result.getNext();
    return row?.t ? nodeToNoteResponse(row.t as Record<string, unknown>) : null;
  }

  async parseAndCreateLinks(noteId: string, content: string): Promise<void> {
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const matches = Array.from(content.matchAll(linkRegex));
    const now = new Date().toISOString();

    for (const match of matches) {
      const targetTitle = match[1].split('|')[0].trim();
      if (!targetTitle) continue;

      const query = `
        MATCH (source:Note {id: $noteId})
        MERGE (target:Note {title: $targetTitle})
        ON CREATE SET target.id = $targetId, target.content = '', target.tags = '', target.attributes = $attributes, target.createdAt = $now, target.updatedAt = $now, target.version = 1
        MERGE (source)-[r:LINK]->(target)
        ON CREATE SET r.createdAt = $now
      `;
      
      await this.runQuery(query, {
        noteId,
        targetTitle,
        targetId: idify(targetTitle) + '_' + Date.now().toString(36),
        attributes: JSON.stringify({ stub: true }),
        now
      });
    }
  }

  async getAllNotes(): Promise<NoteResponse[]> {
    const result = await this.runQuery(`MATCH (n:Note) RETURN n`);
    const notes: NoteResponse[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.n) notes.push(nodeToNoteResponse(row.n as Record<string, unknown>));
    }
    return notes;
  }

  async getAllTags(): Promise<unknown[]> {
    const result = await this.runQuery(`MATCH (t:Tag) RETURN t`);
    const tags: unknown[] = [];
    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.t) tags.push(row.t);
    }
    return tags;
  }

  getConnection(): Connection {
    return this.connection;
  }
}
