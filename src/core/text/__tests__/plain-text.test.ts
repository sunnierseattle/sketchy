import { describe, expect, it } from 'vitest';
import { markdownToPlainText, nodeDisplayLabel } from '../plain-text';

describe('markdownToPlainText', () => {
  it('strips inline formatting', () => {
    expect(markdownToPlainText('**Bold** and _it_ and `code` ~~gone~~')).toBe('Bold and it and code gone');
  });

  it('keeps link text but drops the URL', () => {
    expect(markdownToPlainText('see [docs](https://example.com/secret)')).toBe('see docs');
  });

  it('separates blocks, list items and lines with spaces', () => {
    expect(markdownToPlainText('# Heading\n- one\n- two\n\nlast\nline')).toBe('Heading one two last line');
  });

  it('drops list numbering and task checkboxes', () => {
    expect(markdownToPlainText('1. first\n2. second')).toBe('first second');
    expect(markdownToPlainText('- [ ] todo\n- [x] done')).toBe('todo done');
  });

  it('shows raw HTML as the literal text the node displays', () => {
    expect(markdownToPlainText('a <b>x</b>')).toBe('a <b>x</b>');
  });

  it('returns an empty string for empty or whitespace input', () => {
    expect(markdownToPlainText('')).toBe('');
    expect(markdownToPlainText('  \n ')).toBe('');
  });
});

describe('nodeDisplayLabel', () => {
  it('uses the plain-text label', () => {
    expect(nodeDisplayLabel('**Cost** rises')).toBe('Cost rises');
  });

  it('falls back to Untitled instead of exposing an ID', () => {
    expect(nodeDisplayLabel('')).toBe('Untitled');
    expect(nodeDisplayLabel('**  **')).toBe('Untitled');
  });
});
