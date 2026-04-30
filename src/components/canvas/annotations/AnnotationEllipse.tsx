import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import ShapeAnnotationNode from './ShapeAnnotationNode';

function AnnotationEllipse(props: NodeProps) {
  return <ShapeAnnotationNode {...props} kind="ellipse" borderRadius="50%" />;
}

export default memo(AnnotationEllipse);
