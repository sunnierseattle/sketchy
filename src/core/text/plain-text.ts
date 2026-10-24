import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toString } from 'mdast-util-to-string';
import { gfm } from 'micromark-extension-gfm';
import type { Nodes } from 'mdast';

const UNTITLED = 'Untitled';
const CACHE_LIMIT = 1000;
const cache = new Map<string, string>();

// Containers whose children are separate blocks or lines; their text is
// joined with spaces so "# A\n- b" reads "A b", not "Ab".
const BLOCK_CONTAINERS = new Set(['root', 'list', 'listItem', 'blockquote', 'table', 'tableRow']);

function blockText(node: Nodes): string {
  if (BLOCK_CONTAINERS.has(node.type) && 'children' in node) {
    return node.children.map((child) => blockText(child as Nodes)).join(' ');
  }
  return toString(node);
}

/** The text a reader sees when a node label is rendered as Markdown. */
export function markdownToPlainText(markdown: string): string {
  const cached = cache.get(markdown);
  if (cached !== undefined) return cached;

  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const text = blockText(tree).replace(/\s+/g, ' ').trim();

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(markdown, text);
  return text;
}

/** A node's label for panels and lists: plain text, never an internal ID. */
export function nodeDisplayLabel(label: string): string {
  return markdownToPlainText(label) || UNTITLED;
}
