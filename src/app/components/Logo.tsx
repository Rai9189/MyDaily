interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 192, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Circle */}
      <circle cx="96" cy="96" r="96" fill="url(#gradient)" />
      
      {/* Gradient Definition */}
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      
      {/* Calendar Icon */}
      <rect x="48" y="52" width="96" height="88" rx="8" fill="white" fillOpacity="0.2" />
      <rect x="48" y="52" width="96" height="20" rx="8" fill="white" fillOpacity="0.3" />
      
      {/* Calendar Dots */}
      <circle cx="68" cy="92" r="4" fill="white" />
      <circle cx="88" cy="92" r="4" fill="white" />
      <circle cx="108" cy="92" r="4" fill="white" />
      <circle cx="128" cy="92" r="4" fill="white" />
      
      <circle cx="68" cy="108" r="4" fill="white" />
      <circle cx="88" cy="108" r="4" fill="white" />
      <circle cx="108" cy="108" r="4" fill="white" />
      <circle cx="128" cy="108" r="4" fill="white" />
      
      <circle cx="68" cy="124" r="4" fill="white" />
      <circle cx="88" cy="124" r="4" fill="white" />
      <circle cx="108" cy="124" r="4" fill="#10B981" />
      
      {/* Wallet/Money Icon Overlay */}
      <path
        d="M120 110 L132 110 C135 110 137 112 137 115 L137 125 C137 128 135 130 132 130 L120 130 L120 110 Z"
        fill="#FBBF24"
        fillOpacity="0.9"
      />
      <circle cx="128" cy="120" r="2.5" fill="#1F2937" />
    </svg>
  );
}

// Favicon variants
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
