import type { Annotation, AnnotationType } from '../types';

/** Position for highlight: quad points or bounding rect */
export interface HighlightPosition {
  pageIndex: number;
  rects: { x: number; y: number; width: number; height: number }[];
}

/** Position for note: anchor point on page */
export interface NotePosition {
  pageIndex: number;
  x: number;
  y: number;
}

/** Position for rect: rectangle on page */
export interface RectPosition {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Position = HighlightPosition | NotePosition | RectPosition;

export function isHighlightPosition(p: Record<string, unknown>): p is HighlightPosition {
  return Array.isArray((p as HighlightPosition).rects);
}

export function isNotePosition(p: Record<string, unknown>): p is NotePosition {
  return (
    typeof (p as NotePosition).pageIndex === 'number' &&
    typeof (p as NotePosition).x === 'number' &&
    typeof (p as NotePosition).y === 'number' &&
    !('rects' in p)
  );
}

export function isRectPosition(p: Record<string, unknown>): p is RectPosition {
  return (
    typeof (p as RectPosition).width === 'number' &&
    typeof (p as RectPosition).height === 'number' &&
    typeof (p as RectPosition).x === 'number' &&
    typeof (p as RectPosition).y === 'number'
  );
}
