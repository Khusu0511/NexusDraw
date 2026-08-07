/**
 * Shared helper utilities for the frontend.
 */

/** Escape HTML to prevent XSS. */
export const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Extract 1-2 character uppercase initials from a name. */
export const getInitials = (name) =>
  (name || '?').trim().slice(0, 2).toUpperCase();

/** Deterministic avatar colour from a name. */
const AVATAR_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#d97706', '#dc2626', '#db2777', '#7e22ce', '#0f766e',
];

export function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/** The 25 CNN categories. */
export const CNN_CATEGORIES = [
  'airplane', 'apple', 'bicycle', 'bird', 'book',
  'butterfly', 'car', 'cat', 'circle', 'clock',
  'cloud', 'dog', 'fish', 'flower', 'guitar',
  'house', 'moon', 'pizza', 'shoe', 'square',
  'star', 'sun', 'tree', 'triangle', 'umbrella',
];

/** Canvas logical dimensions. */
export const CW = 840;
export const CH = 540;

/** Palette colours. */
export const PALETTE = [
  '#111111', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207', '#166534',
  '#7c3aed', '#64748b',
];

/** Available brush sizes. */
export const BRUSH_SIZES = [3, 7, 14, 24];
