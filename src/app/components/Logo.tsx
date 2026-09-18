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
