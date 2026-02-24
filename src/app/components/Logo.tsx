interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 192, className = '' }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="MyDaily Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

// Favicon variants tetap pakai SVG (dipakai di tempat lain, bukan di halaman Login/Register)
export function Favicon16() {
  return (
    <svg width="16" height="16" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="96" cy="96" r="96" fill="#3B82F6" />
      <rect x="48" y="52" width="96" height="88" rx="8" fill="white" fillOpacity="0.9" />
      <rect x="48" y="52" width="96" height="20" rx="8" fill="#1D4ED8" />
    </svg>
  );
}

export function Favicon32() {
  return (
    <svg width="32" height="32" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="96" cy="96" r="96" fill="#3B82F6" />
      <rect x="48" y="52" width="96" height="88" rx="8" fill="white" fillOpacity="0.2" />
      <rect x="48" y="52" width="96" height="20" rx="8" fill="white" fillOpacity="0.3" />
      <circle cx="108" cy="124" r="4" fill="#10B981" />
    </svg>
  );
}