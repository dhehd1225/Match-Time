interface JerseyIconProps {
  number: number;
  primaryColor: string;
  secondaryColor: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function JerseyIcon({ number, primaryColor, secondaryColor, size = 'md' }: JerseyIconProps) {
  const sizeClasses = {
    sm: 'w-10 h-12',
    md: 'w-12 h-14',
    lg: 'w-16 h-20',
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Jersey SVG */}
      <svg viewBox="0 0 100 120" className="w-full h-full">
        {/* Vertical stripes pattern */}
        <defs>
          <pattern id={`stripes-${number}`} patternUnits="userSpaceOnUse" width="20" height="120">
            <rect width="10" height="120" fill={primaryColor} />
            <rect x="10" width="10" height="120" fill={secondaryColor} />
          </pattern>
        </defs>

        {/* Jersey body */}
        <path
          d="M 25 20 L 15 30 L 15 50 L 20 50 L 20 100 C 20 105 25 110 30 110 L 70 110 C 75 110 80 105 80 100 L 80 50 L 85 50 L 85 30 L 75 20 L 65 25 L 50 20 L 35 25 Z"
          fill={`url(#stripes-${number})`}
          stroke="#000"
          strokeWidth="1.5"
        />

        {/* Sleeves */}
        <path
          d="M 15 30 L 5 40 L 10 50 L 15 50 Z"
          fill={`url(#stripes-${number})`}
          stroke="#000"
          strokeWidth="1.5"
        />
        <path
          d="M 85 30 L 95 40 L 90 50 L 85 50 Z"
          fill={`url(#stripes-${number})`}
          stroke="#000"
          strokeWidth="1.5"
        />

        {/* Collar */}
        <ellipse
          cx="50"
          cy="22"
          rx="8"
          ry="5"
          fill="white"
          stroke="#000"
          strokeWidth="1"
        />
      </svg>

      {/* Number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ marginTop: '8px' }}>
          {number}
        </span>
      </div>
    </div>
  );
}
