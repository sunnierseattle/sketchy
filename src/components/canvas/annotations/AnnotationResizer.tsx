import { NodeResizer } from '@xyflow/react';
import { useDiagramStore } from '../../../store/diagram-store';
import { annotationHandleStyle, annotationResizeLineStyle } from './annotation-style';

interface Props {
  id: string;
  isVisible: boolean;
  minWidth: number;
  minHeight: number;
}

export default function AnnotationResizer({
  id,
  isVisible,
  minWidth,
  minHeight,
}: Props) {
  const resizeAnnotation = useDiagramStore((s) => s.resizeAnnotation);

  return (
    <NodeResizer
      isVisible={isVisible}
      minWidth={minWidth}
      minHeight={minHeight}
      color="var(--accent)"
      handleStyle={annotationHandleStyle}
      lineStyle={annotationResizeLineStyle}
      onResizeEnd={(_, p) =>
        resizeAnnotation(id, {
          size: { width: p.width, height: p.height },
          position: { x: p.x, y: p.y },
        })
      }
    />
  );
}
