/**
 * Common types, interfaces, and utilities for database implementations
 * Shared by both JavaScript API and Cypher query implementations
 */

import type { NoteResponse } from './types.js';

/**
 * Slugify a title to create an ID
 */
export function idify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || 'note'
  );
}

/**
 * Convert database node to NoteResponse
 */
export function nodeToNoteResponse(node: Record<string, unknown>): NoteResponse {
  if (!node) {
    throw new Error('Node is undefined or null');
  }

  // Handle both top-level properties and nested properties field
  // or a row-like object from DuckDB/CongraphDB
  const props = (node.properties || node) as Record<string, unknown>;

  const getProp = (key: string): any => {
    if (props[key] !== undefined) return props[key];
    if (node[key] !== undefined) return node[key];
    return undefined;
  };

  return {
    id: String(getProp('id') || ''),
    title: String(getProp('title') || 'Untitled'),
    content: String(getProp('content') || ''),
    tags: getProp('tags')
      ? typeof getProp('tags') === 'string'
        ? String(getProp('tags')).split(',').filter((t: string) => t)
        : Array.isArray(getProp('tags'))
          ? (getProp('tags') as string[])
          : []
      : [],
    attributes: (typeof getProp('attributes') === 'string'
      ? JSON.parse(String(getProp('attributes')))
      : getProp('attributes') || {}) as Record<string, unknown>,
    createdAt: String(getProp('createdAt') || ''),
    updatedAt: String(getProp('updatedAt') || ''),
    version: Number(getProp('version') || 1),
  };
}

/**
 * Extract snippet from content containing search term
 */
export function extractSnippet(
  content: string,
  searchTerm: string,
  maxLength: number = 200
): string {
  if (!content) return '';
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(searchTerm.toLowerCase());

  if (index === -1) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + searchTerm.length + 50);

  let snippet = content.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  return snippet;
}

/**
 * Calculate search relevance score
 */
export function calculateScore(title: string, content: string, searchTerm: string): number {
  const lowerTitle = (title || '').toLowerCase();
  const lowerContent = (content || '').toLowerCase();
  const lowerTerm = (searchTerm || '').toLowerCase();

  let score = 0;

  // Title match is worth more
  if (lowerTitle.includes(lowerTerm)) {
    score += 100;
    if (lowerTitle === lowerTerm) score += 50;
  }

  // Content matches
  const contentMatches = (lowerContent.match(new RegExp(lowerTerm, 'g')) || []).length;
  score += contentMatches * 10;

  return score;
}
