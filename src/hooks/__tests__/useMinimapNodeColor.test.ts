import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { useMinimapNodeColor } from '../useMinimapNodeColor';
import { getFramework } from '../../frameworks/registry';
import { computeNodeDegrees, getDerivedIndicators } from '../../core/graph/derived';

const crt = getFramework('crt')!;
const node = (id: string, data: Record<string, unknown> = {}): Node => ({ id, position: { x: 0, y: 0 }, data });

describe('useMinimapNodeColor', () => {
  it('returns the same function while its inputs are unchanged', () => {
    const degrees = computeNodeDegrees([]);
    const { result, rerender } = renderHook(() => useMinimapNodeColor(crt, degrees, '#123456'));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('prefers a custom color, then a tag color, then the fallback', () => {
    // Evaporating Cloud has tags but no derived indicators, so untagged nodes reach the fallback.
    const cloud = getFramework('evaporating-cloud')!;
    const degrees = computeNodeDegrees([]);
    const { result } = renderHook(() => useMinimapNodeColor(cloud, degrees, '#123456'));
    const tag = cloud.nodeTags[0];

    expect(result.current(node('a', { color: '#ff0000', tags: [tag.id] }))).toBe('#ff0000');
    expect(result.current(node('b', { tags: [tag.id] }))).toBe(tag.color);
    expect(result.current(node('c', { tags: [] }))).toBe('#123456');
  });

  it('uses a derived indicator color when the node has one', () => {
    const degrees = computeNodeDegrees([{ id: 'e', source: 'root-cause', target: 'effect' }]);
    const [indicator] = getDerivedIndicators('root-cause', degrees, crt.derivedIndicators);
    expect(indicator).toBeDefined();
    const { result } = renderHook(() => useMinimapNodeColor(crt, degrees, '#123456'));
    expect(result.current(node('root-cause', { tags: [] }))).toBe(indicator.color);
  });
});
