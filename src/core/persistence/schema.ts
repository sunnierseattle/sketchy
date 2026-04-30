import { SCHEMA_VERSION } from '../types';
import type {
  Annotation,
  AnnotationKind,
  Diagram,
  DiagramEdge,
  DiagramNode,
  DiagramSettings,
  EdgeConfidence,
  EdgePolarity,
  JunctionType,
} from '../types';
import { migrations } from './migrations';
import { isHandleSide } from '../graph/ports';

const LAYOUT_DIRECTIONS = ['TB', 'BT', 'LR', 'RL'] as const;
const EDGE_ROUTING_MODES = ['dynamic', 'fixed'] as const;
const JUNCTION_TYPES = ['and', 'or', 'add', 'multiply'] as const;
const EDGE_CONFIDENCE = ['high', 'medium', 'low'] as const;
const EDGE_POLARITY = ['positive', 'negative'] as const;
const ANNOTATION_KINDS = ['text', 'rect', 'ellipse', 'line'] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizePosition(raw: unknown): { x: number; y: number } {
  const p = asRecord(raw);
  return {
    x: p && isFiniteNumber(p.x) ? p.x : 0,
    y: p && isFiniteNumber(p.y) ? p.y : 0,
  };
}

function normalizeSize(raw: unknown): { width: number; height: number } | undefined {
  const s = asRecord(raw);
  if (!s || !isFiniteNumber(s.width) || !isFiniteNumber(s.height)) return undefined;
  if (s.width <= 0 || s.height <= 0) return undefined;
  return { width: s.width, height: s.height };
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string')));
}

function normalizeSettings(raw: unknown): DiagramSettings {
  const s = asRecord(raw) ?? {};
  const layoutDirection = enumValue(s.layoutDirection, LAYOUT_DIRECTIONS, 'BT');
  const edgeRoutingMode = enumValue(s.edgeRoutingMode, EDGE_ROUTING_MODES, 'dynamic');
  return {
    layoutDirection,
    showGrid: typeof s.showGrid === 'boolean' ? s.showGrid : true,
    snapToGrid: typeof s.snapToGrid === 'boolean' ? s.snapToGrid : false,
    edgeRoutingMode,
  };
}

function normalizeNodes(raw: unknown): DiagramNode[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): DiagramNode[] => {
    const record = asRecord(entry);
    if (!record || typeof record.id !== 'string' || record.id.length === 0) {
      return [];
    }
    const data = asRecord(record.data) ?? {};
    const size = normalizeSize(record.size);
    const node: DiagramNode = {
      id: record.id,
      type: 'entity',
      position: normalizePosition(record.position),
      ...(size ? { size } : {}),
      data: {
        label: typeof data.label === 'string' ? data.label : '',
        tags: normalizeStringArray(data.tags),
        junctionType: enumValue<JunctionType>(data.junctionType, JUNCTION_TYPES, 'or'),
        ...(optionalString(data.notes) ? { notes: optionalString(data.notes) } : {}),
        ...(isFiniteNumber(data.value) ? { value: data.value } : {}),
        ...(optionalString(data.unit) ? { unit: optionalString(data.unit) } : {}),
        ...(optionalString(data.color) ? { color: optionalString(data.color) } : {}),
        ...(optionalString(data.textColor) ? { textColor: optionalString(data.textColor) } : {}),
        ...(data.locked === true ? { locked: true } : {}),
      },
    };
    return [node];
  });
}

function normalizeEdges(raw: unknown): DiagramEdge[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): DiagramEdge[] => {
    const record = asRecord(entry);
    if (!record || typeof record.source !== 'string' || typeof record.target !== 'string') {
      return [];
    }
    const sourceSide = typeof record.sourceSide === 'string' && isHandleSide(record.sourceSide)
      ? record.sourceSide
      : undefined;
    const targetSide = typeof record.targetSide === 'string' && isHandleSide(record.targetSide)
      ? record.targetSide
      : undefined;
    const edge: DiagramEdge = {
      id: typeof record.id === 'string' && record.id.length > 0 ? record.id : `edge-${index + 1}`,
      source: record.source,
      target: record.target,
      ...(sourceSide ? { sourceSide } : {}),
      ...(targetSide ? { targetSide } : {}),
      ...(typeof record.confidence === 'string' && (EDGE_CONFIDENCE as readonly string[]).includes(record.confidence)
        ? { confidence: record.confidence as EdgeConfidence }
        : {}),
      ...(typeof record.polarity === 'string' && (EDGE_POLARITY as readonly string[]).includes(record.polarity)
        ? { polarity: record.polarity as EdgePolarity }
        : {}),
      ...(record.delay === true ? { delay: true } : {}),
      ...(optionalString(record.edgeTag) ? { edgeTag: optionalString(record.edgeTag) } : {}),
      ...(optionalString(record.notes) ? { notes: optionalString(record.notes) } : {}),
    };
    return [edge];
  });
}

function normalizeAnnotationData(raw: unknown): Annotation['data'] {
  const data = asRecord(raw) ?? {};
  return {
    ...(optionalString(data.text) ? { text: optionalString(data.text) } : {}),
    ...(optionalString(data.fill) ? { fill: optionalString(data.fill) } : {}),
    ...(optionalString(data.stroke) ? { stroke: optionalString(data.stroke) } : {}),
    ...(isFiniteNumber(data.strokeWidth) && data.strokeWidth >= 0 ? { strokeWidth: data.strokeWidth } : {}),
    ...(isFiniteNumber(data.fontSize) && data.fontSize > 0 ? { fontSize: data.fontSize } : {}),
    ...(optionalString(data.textColor) ? { textColor: optionalString(data.textColor) } : {}),
    ...(data.flipped === true ? { flipped: true } : {}),
  };
}

function normalizeAnnotations(raw: unknown): Annotation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry, index): Annotation[] => {
    const record = asRecord(entry);
    if (!record) return [];
    const kind = enumValue<AnnotationKind>(record.kind, ANNOTATION_KINDS, 'rect');
    const data = normalizeAnnotationData(record.data);
    const id = typeof record.id === 'string' && record.id.length > 0 ? record.id : `annotation-${index + 1}`;

    if (kind === 'line') {
      const legacyPosition = normalizePosition(record.position);
      const legacySize = normalizeSize(record.size) ?? { width: 200, height: 120 };
      const start = asRecord(record.start)
        ? normalizePosition(record.start)
        : legacyPosition;
      const end = asRecord(record.end)
        ? normalizePosition(record.end)
        : data.flipped
          ? { x: legacyPosition.x + legacySize.width, y: legacyPosition.y }
          : { x: legacyPosition.x + legacySize.width, y: legacyPosition.y + legacySize.height };

      return [{
        id,
        kind,
        start,
        end,
        data,
      }];
    }

    const size = normalizeSize(record.size);
    if (!size) return [];
    return [{
      id,
      kind,
      position: normalizePosition(record.position),
      size,
      data,
    }];
  });
}

function normalizeDiagramShape(diagram: Diagram): Diagram {
  return {
    ...diagram,
    name: typeof diagram.name === 'string' && diagram.name.length > 0 ? diagram.name : 'Untitled Diagram',
    settings: normalizeSettings(diagram.settings),
    nodes: normalizeNodes(diagram.nodes),
    edges: normalizeEdges(diagram.edges),
    annotations: normalizeAnnotations(diagram.annotations),
  };
}

export function migrate(data: Record<string, unknown>): Diagram {
  let version = (data.schemaVersion as number) ?? 0;

  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Schema version ${version} is newer than supported (${SCHEMA_VERSION})`,
    );
  }

  let result = data;
  while (version < SCHEMA_VERSION) {
    const migrator = migrations[version];
    if (!migrator) {
      throw new Error(`No migration from version ${version}`);
    }
    result = migrator(result);
    version++;
  }

  const migrated = result as unknown as Diagram;
  return normalizeDiagramShape({ ...migrated, settings: normalizeSettings(migrated.settings) });
}

export function validateDiagramShape(data: unknown): data is Diagram {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.schemaVersion === 'number' &&
    typeof d.id === 'string' &&
    typeof d.frameworkId === 'string' &&
    Array.isArray(d.nodes) &&
    Array.isArray(d.edges)
  );
}
