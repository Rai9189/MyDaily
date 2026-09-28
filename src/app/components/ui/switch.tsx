// Visual on/off track. The parent element carries role="switch" + aria-checked.
export function Switch({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
  );
}
