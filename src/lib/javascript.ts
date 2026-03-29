/**
 * JavaScript API implementation of database operations
 * Uses the low-level EdgeAPI and NodeAPI for operations
 */

import type { Connection } from 'congraphdb';
import { NodeAPI, EdgeAPI } from 'congraphdb';
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

interface NodeRecord extends Record<string, unknown> {
  _id: string;
  id: string;
  title?: string;
  content?: string;
  tags?: string;
  attributes?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  _label?: string;
  name?: string; // For Tag nodes
}

interface EdgeRecord {
  _id: string;
  _from: string;
  _to: string;
  _type: string;
  createdAt?: string;
}

interface NodeAPIType {
  getByLabel(label: string): Promise<NodeRecord[]>;
  create(label: string, props: Record<string, unknown>): Promise<NodeRecord>;
  update(id: string, props: Record<string, unknown>): Promise<NodeRecord | null>;
  delete(id: string, detach?: boolean): Promise<boolean>;
}

interface EdgeAPIType {
  getOutgoing(id: string, type?: string): Promise<EdgeRecord[]>;
  getIncoming(id: string, type?: string): Promise<EdgeRecord[]>;
  delete(id: string): Promise<boolean>;
}

export class DatabaseJavaScript implements IDatabaseOperations {
  private connection: Connection;
  private nodeApi: NodeAPIType | null = null;
  private edgeApi: EdgeAPIType | null = null;
  private initialized = false;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Initialize the JavaScript implementation
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.nodeApi = new NodeAPI(this.connection) as unknown as NodeAPIType;
    this.edgeApi = new EdgeAPI(this.connection) as unknown as EdgeAPIType;
    this.initialized = true;
    console.log('[DatabaseJavaScript] Initialized');
  }

  /**
   * Create a new note using JavaScript API
   */
  async createNote(input: CreateNoteInput): Promise<NoteResponse> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    // Use provided ID if available (for restore), otherwise generate new ID
    const id = input.id ||
      idify(input.title) +
      '_' +
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 5);

    console.log('[DatabaseJavaScript] Creating node with id:', id, 'title:', input.title);

    // Check if a node with this ID or title already exists
    const allNotes = await this.nodeApi.getByLabel('Note');
    let existing = allNotes.find((n: NodeRecord) => n.id === id);
    
    // Also check for stub nodes by title if ID is not provided
    if (!existing && !input.id) {
      existing = allNotes.find((n: NodeRecord) => n.title === input.title && n.attributes?.includes('stub'));
    }

    if (existing) {
      console.log('[DatabaseJavaScript] Updating existing/stub node:', existing.id);
      const updated = await this.nodeApi.update(existing._id, {
        title: input.title,
        content: input.content || '',
        tags: (input.tags || []).join(','),
        attributes: JSON.stringify(input.attributes || {}),
        updatedAt: now,
        version: (existing.version || 0) + 1,
      });
      return nodeToNoteResponse(updated!);
    }

    const node = await this.nodeApi.create('Note', {
      id,
      title: input.title,
      content: input.content || '',
      tags: (input.tags || []).join(','),
      attributes: JSON.stringify(input.attributes || {}),
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    if (!node) {
      throw new Error(`Failed to create Note node with title: ${input.title}`);
    }

    // Create Tag relationships
    if (input.tags && input.tags.length > 0) {
      for (const tag of input.tags) {
        const tagNode = await this.ensureTagNode(tag);
        if (tagNode) {
          try {
            // Use raw Cypher to create TAG edge since NodeAPI/EdgeAPI might have limitations on mixed labels
            const tagQuery = `MATCH (n:Note), (t:Tag) WHERE n.id = '${id}' AND t.name = '${tag}' CREATE (n)-[r:TAG {createdAt: '${now}'}]->(t) RETURN r`;
            await this.connection.query(tagQuery);
          } catch {
            // Ignore errors
            console.warn('[DatabaseJavaScript] Failed to create TAG edge');
          }
        }
      }
    }

    return nodeToNoteResponse(node);
  }

  /**
   * Get a note by ID using JavaScript API
   */
  async getNote(id: string): Promise<NoteResponse | null> {
    if (!this.nodeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const note = notes.find((n: NodeRecord) => n.id === id);

    if (!note) return null;
    return nodeToNoteResponse(note);
  }

  /**
   * Update a note using JavaScript API
   */
  async updateNote(id: string, input: UpdateNoteInput): Promise<NoteResponse | null> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const existing = notes.find((n: NodeRecord) => n.id === id);
    if (!existing) return null;

    const now = new Date().toISOString();

    const updateProps: Record<string, unknown> = {};
    if (input.createdAt !== undefined) updateProps.createdAt = input.createdAt;
    if (input.updatedAt !== undefined) {
      updateProps.updatedAt = input.updatedAt;
    } else {
      updateProps.updatedAt = now;
    }
    if (input.version !== undefined) {
      updateProps.version = input.version;
    } else {
      updateProps.version = (existing.version || 0) + 1;
    }
    if (input.title !== undefined) updateProps.title = input.title;
    if (input.content !== undefined) updateProps.content = input.content;
    if (input.tags !== undefined) updateProps.tags = (input.tags || []).join(',');
    if (input.attributes !== undefined) updateProps.attributes = JSON.stringify(input.attributes);

    const updated = await this.nodeApi.update(existing._id, updateProps);
    if (!updated) return null;

    // Update tag relationships if tags changed
    if (input.tags !== undefined) {
      const outgoingEdges = await this.edgeApi.getOutgoing(existing._id);
      for (const edge of outgoingEdges) {
        if (edge._type === 'TAG') {
          await this.edgeApi.delete(edge._id);
        }
      }

      for (const tag of input.tags) {
        const tagNode = await this.ensureTagNode(tag);
        if (tagNode) {
          try {
            const tagQuery = `MATCH (n:Note), (t:Tag) WHERE n.id = '${existing.id}' AND t.name = '${tag}' CREATE (n)-[r:TAG {createdAt: '${now}'}]->(t) RETURN r`;
            await this.connection.query(tagQuery);
          } catch {
            console.warn('[DatabaseJavaScript] Failed to create TAG edge');
          }
        }
      }
    }

    // Links parsing is typically called by the SDK wrapper
    return nodeToNoteResponse(updated);
  }

  /**
   * Delete a note using JavaScript API
   */
  async deleteNote(id: string): Promise<boolean> {
    if (!this.nodeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const note = notes.find((n: NodeRecord) => n.id === id);
    if (!note) return false;

    await this.nodeApi.delete(note._id, true); // detach: true to remove edges
    return true;
  }

  /**
   * List notes using JavaScript API
   */
  async listNotes(limit: number = 100, offset: number = 0): Promise<NoteResponse[]> {
    if (!this.nodeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const sortedNotes = notes.sort((a: NodeRecord, b: NodeRecord) => {
      const dateA = new Date(a.updatedAt || 0).getTime();
      const dateB = new Date(b.updatedAt || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id.localeCompare(a.id);
    });

    return sortedNotes.slice(offset, offset + limit).map(nodeToNoteResponse);
  }

  /**
   * Get neighbors using BFS traversal with JavaScript API
   */
  async getNeighbors(nodeId: string, depth: number = 1): Promise<NeighborInfo[]> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const allNotes = await this.nodeApi.getByLabel('Note');
    const notesMap = new Map(allNotes.map((n: NodeRecord) => [n._id, n]));
    const startNode = allNotes.find((n: NodeRecord) => n.id === nodeId);

    if (!startNode) return [];

    const result: NeighborInfo[] = [];
    const visited = new Set<string>([startNode._id]);
    const queue: Array<{ id: string; dist: number }> = [{ id: startNode._id, dist: 0 }];

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      if (dist >= depth) continue;

      const outgoing = await this.edgeApi.getOutgoing(id, 'LINK');
      const incoming = await this.edgeApi.getIncoming(id, 'LINK');
      const edges = [...outgoing, ...incoming];

      for (const edge of edges) {
        const neighborId = edge._from === id ? edge._to : edge._from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const node = notesMap.get(neighborId);
          if (node) {
            result.push({
              id: node.id,
              title: node.title || 'Untitled',
              type: 'note',
              distance: dist + 1,
            });
            queue.push({ id: neighborId, dist: dist + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Get graph data using JavaScript API
   */
  async getGraphData(centerId?: string, radius: number = 2): Promise<GraphData> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const allNotes = await this.nodeApi.getByLabel('Note');
    const notesMap = new Map<string, NodeRecord>(allNotes.map((n: NodeRecord) => [n._id, n]));

    let visibleNodeIds = new Set<string>();

    if (centerId && centerId !== 'undefined') {
      const startNode = allNotes.find((n: NodeRecord) => n.id === centerId);
      if (startNode) {
        visibleNodeIds.add(startNode._id);
        const queue = [{ id: startNode._id, dist: 0 }];
        const visited = new Set([startNode._id]);

        while (queue.length > 0) {
          const { id, dist } = queue.shift()!;
          if (dist >= radius) continue;

          const outgoing = await this.edgeApi.getOutgoing(id, 'LINK');
          const incoming = await this.edgeApi.getIncoming(id, 'LINK');
          const edges = [...outgoing, ...incoming];

          for (const edge of edges) {
            const neighborId = edge._from === id ? edge._to : edge._from;
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              visibleNodeIds.add(neighborId);
              queue.push({ id: neighborId, dist: dist + 1 });
            }
          }
        }
      }
    } else {
      allNotes.slice(0, 500).forEach((n: NodeRecord) => visibleNodeIds.add(n._id));
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const nodeId of visibleNodeIds) {
      const node = notesMap.get(nodeId);
      if (node) {
        nodes.push({
          id: node.id,
          label: node.title || 'Untitled',
          type: 'note',
          tags: node.tags ? node.tags.split(',').filter((t: string) => t) : [],
        });

        const outgoing = await this.edgeApi.getOutgoing(nodeId, 'LINK');

        for (const edge of outgoing) {
          if (visibleNodeIds.has(edge._to)) {
            const targetNode = notesMap.get(edge._to);
            edges.push({
              id: String(edge._id),
              source: node.id,
              target: targetNode?.id || edge._to,
              type: 'LINK',
            });
          }
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Search notes using JavaScript API
   */
  async searchNotes(query: string, limit: number = 20): Promise<SearchResult[]> {
    if (!this.nodeApi) throw new Error('Database not initialized');

    const searchTerm = query.toLowerCase();
    const notes = await this.nodeApi.getByLabel('Note');

    const results = notes
      .map((n: NodeRecord) => {
        const title = n.title || 'Untitled';
        const content = n.content || '';
        const score = calculateScore(title, content, searchTerm);
        return {
          ...nodeToNoteResponse(n),
          content: extractSnippet(content, searchTerm),
          score,
        };
      })
      .filter((r: SearchResult) => r.score > 0)
      .sort((a: SearchResult, b: SearchResult) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Search by tag using JavaScript API
   */
  async searchByTag(tag: string, limit: number = 100): Promise<SearchResult[]> {
    if (!this.connection) throw new Error('Database not initialized');

    const query = `MATCH (n:Note)-[r:TAG]->(t:Tag) WHERE t.name = '${tag}' RETURN n`;
    const result = await this.connection.query(query);
    const results: SearchResult[] = [];

    let row;
    while ((row = await result.getNext()) !== null) {
      if (row.n) {
        results.push({ ...nodeToNoteResponse(row.n as Record<string, unknown>), score: 1 });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Get suggestions using JavaScript API
   */
  async getSuggestions(
    query: string,
    limit: number = 10
  ): Promise<Array<{ title: string; id: string; type: string }>> {
    if (!this.nodeApi) throw new Error('Database not initialized');

    const searchTerm = query.toLowerCase();
    const suggestions: Array<{ title: string; id: string; type: string }> = [];

    const notes = await this.nodeApi.getByLabel('Note');
    for (const note of notes) {
      if (note.title && note.title.toLowerCase().includes(searchTerm)) {
        suggestions.push({ title: note.title, id: note.id, type: 'note' });
      }
    }

    const tags = await this.nodeApi.getByLabel('Tag');
    for (const tag of tags) {
      if (tag.name && tag.name.toLowerCase().includes(searchTerm)) {
        suggestions.push({ title: tag.name, id: 'tag_' + tag.name, type: 'tag' });
      }
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Find shortest path using BFS with JavaScript API
   */
  async findPath(fromId: string, toId: string, maxDepth: number = 5): Promise<string[] | null> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const allNotes = await this.nodeApi.getByLabel('Note');
    const notesMap = new Map(allNotes.map((n: NodeRecord) => [n._id, n]));
    const startNode = allNotes.find((n: NodeRecord) => n.id === fromId);
    const endNode = allNotes.find((n: NodeRecord) => n.id === toId);

    if (!startNode || !endNode) return null;

    const queue: Array<{ id: string; path: string[] }> = [
      { id: startNode._id, path: [startNode.id] },
    ];
    const visited = new Set<string>([startNode._id]);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === endNode._id) return path;
      if (path.length > maxDepth) continue;

      const outgoing = await this.edgeApi.getOutgoing(id, 'LINK');
      const incoming = await this.edgeApi.getIncoming(id, 'LINK');
      const edges = [...outgoing, ...incoming];

      for (const edge of edges) {
        const neighborId = edge._from === id ? edge._to : edge._from;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const node = notesMap.get(neighborId);
          if (node) {
            queue.push({ id: neighborId, path: [...path, node.id] });
          }
        }
      }
    }

    return null;
  }

  /**
   * Get backlinks using JavaScript API
   */
  async getBacklinks(noteId: string): Promise<GraphLink[]> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const note = notes.find((n: NodeRecord) => n.id === noteId);
    if (!note) return [];

    const incoming = await this.edgeApi.getIncoming(note._id, 'LINK');
    const notesMap = new Map(notes.map((n: NodeRecord) => [n._id, n]));

    return incoming
      .map((edge: EdgeRecord): GraphLink | null => {
        const sourceNode = notesMap.get(edge._from);
        if (!sourceNode) return null;
        return {
          id: String(edge._id),
          targetId: sourceNode.id,
          targetTitle: sourceNode.title || 'Untitled',
          type: 'LINK',
        };
      })
      .filter((l): l is GraphLink => l !== null);
  }

  /**
   * Get links using JavaScript API
   */
  async getLinks(noteId: string): Promise<GraphLink[]> {
    if (!this.edgeApi || !this.nodeApi) throw new Error('Database not initialized');

    const notes = await this.nodeApi.getByLabel('Note');
    const note = notes.find((n: NodeRecord) => n.id === noteId);
    if (!note) return [];

    const outgoing = await this.edgeApi.getOutgoing(note._id, 'LINK');
    const notesMap = new Map<string, NodeRecord>(notes.map((n: NodeRecord) => [n._id, n]));

    return outgoing
      .map((edge: EdgeRecord): GraphLink | null => {
        const targetNode = notesMap.get(edge._to);
        if (!targetNode) return null;
        return {
          id: String(edge._id),
          targetId: targetNode.id,
          targetTitle: targetNode.title || 'Untitled',
          type: 'LINK',
        };
      })
      .filter((l): l is GraphLink => l !== null);
  }

  /**
   * Ensure tag node exists
   */
  async ensureTagNode(tag: string): Promise<NoteResponse | null> {
    if (!this.nodeApi) throw new Error('Database not initialized');
    const tags = await this.nodeApi.getByLabel('Tag');
    let tagNode = tags.find((t: NodeRecord) => t.name === tag);
    if (!tagNode) {
      tagNode = await this.nodeApi.create('Tag', {
        id: tag,
        name: tag,
        createdAt: new Date().toISOString(),
      });
    }
    return tagNode ? nodeToNoteResponse(tagNode) : null;
  }

  /**
   * Parse links from content
   */
  async parseAndCreateLinks(noteId: string, content: string): Promise<void> {
    if (!this.nodeApi || !this.edgeApi) throw new Error('Database not initialized');

    const allNotes = await this.nodeApi.getByLabel('Note');
    const sourceNode = allNotes.find((n: NodeRecord) => n.id === noteId);
    if (!sourceNode) return;

    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const matches = Array.from(content.matchAll(linkRegex));

    for (const match of matches) {
      const targetTitle = match[1].split('|')[0].trim();
      if (!targetTitle) continue;

      let targetNode = allNotes.find(
        (n: NodeRecord) => n.title && n.title.toLowerCase() === targetTitle.toLowerCase()
      );

      if (!targetNode) {
        const id = idify(targetTitle) + '_' + Date.now().toString(36);
        targetNode = await this.nodeApi.create('Note', {
          id,
          title: targetTitle,
          content: '',
          tags: '',
          attributes: JSON.stringify({ stub: true }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        });
      }

      if (targetNode && targetNode._id !== sourceNode._id) {
        try {
          // Use MERGE-like logic: check if link exists before creating
          const checkQuery = `MATCH (a:Note)-[r:LINK]->(b:Note) WHERE a.id = '${sourceNode.id}' AND b.id = '${targetNode.id}' RETURN r`;
          const existingLinks = await this.connection.query(checkQuery);
          if (!(await existingLinks.getNext())) {
            const linkQuery = `MATCH (a:Note), (b:Note) WHERE a.id = '${sourceNode.id}' AND b.id = '${targetNode.id}' CREATE (a)-[r:LINK {createdAt: '${new Date().toISOString()}'}]->(b) RETURN r`;
            await this.connection.query(linkQuery);
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  async getAllNotes(): Promise<NoteResponse[]> {
    if (!this.nodeApi) throw new Error('Database not initialized');
    const notes = await this.nodeApi.getByLabel('Note');
    return notes.map((n: NodeRecord) => nodeToNoteResponse(n));
  }

  async getAllTags(): Promise<unknown[]> {
    if (!this.nodeApi) throw new Error('Database not initialized');
    return await this.nodeApi.getByLabel('Tag');
  }

  getConnection(): Connection {
    return this.connection;
  }
}
