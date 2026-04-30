import type { NodeProps } from '@xyflow/react';
import { ANNOTATION_STROKE, ANNOTATION_STROKE_WIDTH } from './annotation-style';
import AnnotationResizer from './AnnotationResizer';

interface ShapeAnnotationData {
  kind: 'rect' | 'ellipse';
  size: { width: number; height: number };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface Props extends NodeProps {
  kind: 'rect' | 'ellipse';
  borderRadius: number | string;
}

export default function ShapeAnnotationNode({
  id,
  data,
  selected,
  kind,
  borderRadius,
}: Props) {
  const d = data as unknown as ShapeAnnotationData;

  return (
    <>
      <AnnotationResizer
        id={id}
        isVisible={!!selected}
        minWidth={30}
        minHeight={20}
      />
      <div
        data-testid={`annotation-${kind}-${id}`}
        className={`annotation annotation-${kind} ${selected ? 'selected' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: d.fill ?? 'transparent',
          border: `${d.strokeWidth ?? ANNOTATION_STROKE_WIDTH}px solid ${d.stroke ?? ANNOTATION_STROKE}`,
          borderRadius,
          boxSizing: 'border-box',
        }}
      />
    </>
  );
}
