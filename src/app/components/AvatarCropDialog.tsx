// src/app/components/AvatarCropDialog.tsx
// Lets the user pick the square part of a photo to use as their avatar.
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clampOffset, coverScale, cropRect, zoomOffset } from '../../lib/avatarCrop';

const VIEW = 280;
const OUTPUT_SIZE = 512;
const MAX_ZOOM = 3;
const ARROW_STEP = 10;

interface AvatarCropDialogProps {
  file: File | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

export function AvatarCropDialog({ file, saving, onCancel, onConfirm }: AvatarCropDialogProps) {
  const [src, setSrc]       = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom]     = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef  = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural({ width: 0, height: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const ready = natural.width > 0;
  const scale = ready ? coverScale(natural.width, natural.height, VIEW) * zoom : 1;

  const clamped = (x: number, y: number, s: number) => ({
    x: clampOffset(x, natural.width * s, VIEW),
    y: clampOffset(y, natural.height * s, VIEW),
  });

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const s = coverScale(width, height, VIEW);
    setNatural({ width, height });
    // Start centred, as the old automatic crop would have looked.
    setOffset({ x: (VIEW - width * s) / 2, y: (VIEW - height * s) / 2 });
  };

  const handleZoom = (value: number) => {
    const base = coverScale(natural.width, natural.height, VIEW);
    setOffset(clamped(
      zoomOffset(offset.x, scale, base * value, VIEW),
      zoomOffset(offset.y, scale, base * value, VIEW),
      base * value,
    ));
    setZoom(value);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(clamped(drag.x + e.clientX - drag.pointerX, drag.y + e.clientY - drag.pointerY, scale));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [ARROW_STEP, 0], ArrowRight: [-ARROW_STEP, 0],
      ArrowUp: [0, ARROW_STEP], ArrowDown: [0, -ARROW_STEP],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setOffset(clamped(offset.x + move[0], offset.y + move[1], scale));
  };

  const handleSave = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imgRef.current) return;

    // JPEG has no transparency, so transparent PNGs get a white background.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    const { sx, sy, size } = cropRect(offset.x, offset.y, scale, VIEW);
    ctx.drawImage(imgRef.current, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
      else toast.error('Failed to process photo');
    }, 'image/jpeg', 0.9);
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open && !saving) onCancel(); }}>
      <DialogContent className="bg-card border border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base font-semibold">Adjust Photo</DialogTitle>
        </DialogHeader>

        <div
          role="application"
          aria-label="Drag or use the arrow keys to choose the part of the photo to show"
          tabIndex={0}
          className="relative mx-auto overflow-hidden rounded-xl bg-muted cursor-move select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ width: VIEW, height: VIEW, touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragRef.current = { pointerX: e.clientX, pointerY: e.clientY, x: offset.x, y: offset.y };
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onKeyDown={handleKeyDown}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={handleLoad}
              onError={() => { toast.error('Could not read this image'); onCancel(); }}
              className="absolute top-0 left-0 max-w-none"
              style={{
                width: natural.width * scale || undefined,
                height: natural.height * scale || undefined,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                visibility: ready ? 'visible' : 'hidden',
              }}
            />
          )}
          {/* Shows what the round avatar will keep */}
          <div className="absolute inset-0 rounded-full pointer-events-none shadow-[0_0_0_200px_rgba(0,0,0,0.45)]" />

          {/* Rule-of-thirds guides; drawn over the photo only, never saved */}
          <div data-crop-grid aria-hidden="true" className="absolute inset-0 pointer-events-none">
            {['33.33%', '66.66%'].map(position => (
              <div key={`v${position}`} className="absolute inset-y-0 w-px bg-white/60" style={{ left: position }} />
            ))}
            {['33.33%', '66.66%'].map(position => (
              <div key={`h${position}`} className="absolute inset-x-0 h-px bg-white/60" style={{ top: position }} />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="avatarZoom" className="text-sm text-foreground">Zoom</label>
          <input
            id="avatarZoom" type="range" min={1} max={MAX_ZOOM} step={0.01}
            value={zoom} onChange={(e) => handleZoom(Number(e.target.value))}
            disabled={!ready || saving} className="w-full accent-primary"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={!ready || saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
