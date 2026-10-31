// Geometry for AvatarCropDialog. The image sits behind a square viewport:
// x and y are the image's top-left corner relative to the viewport, so they
// are always zero or negative.

export function coverScale(width: number, height: number, view: number): number {
  return view / Math.min(width, height);
}

// Keeps the image covering the viewport, so the crop never shows an empty edge.
export function clampOffset(offset: number, displayedSize: number, view: number): number {
  return Math.min(0, Math.max(view - displayedSize, offset));
}

// Zooming keeps the point at the middle of the viewport in place.
export function zoomOffset(offset: number, oldScale: number, newScale: number, view: number): number {
  return view / 2 - ((view / 2 - offset) * newScale) / oldScale;
}

export function cropRect(x: number, y: number, scale: number, view: number) {
  return { sx: -x / scale, sy: -y / scale, size: view / scale };
}
