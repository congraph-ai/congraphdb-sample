/**
 * Core types for CongraphDB SDK
 */

// Node types in the knowledge graph
export type NodeType = 'note' | 'tag' | 'reference' | 'media' | 'attachment';

// Edge types (relationship types)
export type EdgeType = 'LINK' | 'TAG' | 'REFERENCE' | 'EMBED' | 'MENTION' | 'PARENT';

// Selection of query engine
export type QueryDbType = 'javascript' | 'cypher';

// Note creation input
export interface CreateNoteInput {
  id?: string; // Optional ID for restore purposes
  title: string;
  content: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

// Note update input
export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
  createdAt?: string; // Optional for restore purposes
  updatedAt?: string; // Optional for restore purposes
  version?: number; // Optional for restore purposes
}

// Note response with graph info
export interface NoteResponse {
  id: string;
  title: string;
  content: string;
  tags: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
  // Graph info
  links?: GraphLink[];
  backlinks?: GraphLink[];
  neighbors?: NeighborInfo[];
}

// Graph link info
export interface GraphLink {
  id: string;
  targetId: string;
  targetTitle: string;
  type: EdgeType;
}

// Neighbor info for graph visualization
export interface NeighborInfo {
  id: string;
  title: string;
  type: NodeType;
  distance: number;
}

// Search result
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  score: number;
  path?: string[]; // Connection path from current note
}

// Graph node for visualization
export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  tags?: string[];
}

// Graph edge for visualization
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  color?: string;
}

// Graph data for visualization
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Operations interface
export interface IDatabaseOperations {
  init(): Promise<void>;
  createNote(input: CreateNoteInput): Promise<NoteResponse>;
  getNote(id: string): Promise<NoteResponse | null>;
  updateNote(id: string, input: UpdateNoteInput): Promise<NoteResponse | null>;
  deleteNote(id: string): Promise<boolean>;
  listNotes(limit: number, offset: number): Promise<NoteResponse[]>;
  getNeighbors(nodeId: string, depth: number): Promise<NeighborInfo[]>;
  getGraphData(centerId?: string, radius?: number): Promise<GraphData>;
  searchNotes(query: string, limit: number): Promise<SearchResult[]>;
  searchByTag(tag: string, limit: number): Promise<SearchResult[]>;
  getSuggestions(query: string, limit: number): Promise<Array<{ title: string; id: string; type: string }>>;
  findPath(fromId: string, toId: string, maxDepth: number): Promise<string[] | null>;
  getBacklinks(noteId: string): Promise<GraphLink[]>;
  getLinks(noteId: string): Promise<GraphLink[]>;
  parseAndCreateLinks(noteId: string, content: string): Promise<void>;
}
