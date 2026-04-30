import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import ShapeAnnotationNode from './ShapeAnnotationNode';

function AnnotationRect(props: NodeProps) {
  return <ShapeAnnotationNode {...props} kind="rect" borderRadius={4} />;
}

export default memo(AnnotationRect);
