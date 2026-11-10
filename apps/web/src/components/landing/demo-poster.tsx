export function DemoPoster({
  id,
  kicker,
  headline,
  line,
  price,
}: {
  id: string
  kicker: string
  headline: string
  line: string
  price: string
}) {
  return (
    <svg
      viewBox="0 0 800 500"
      role="img"
      aria-label={`Café poster reading ${kicker}, ${headline}, ${line}, ${price}`}
      className="block h-full w-full"
    >
      <defs>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 0.22 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2d3a33" />
          <stop offset="1" stopColor="#1c2621" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#${id}-wall)`} />
      <rect width="800" height="500" fill="#000" filter={`url(#${id}-grain)`} opacity="0.9" />
      <g transform="rotate(-3 400 250)">
        <rect x="150" y="70" width="500" height="360" rx="6" fill="#f3e9d6" />
        <rect
          x="150"
          y="70"
          width="500"
          height="360"
          rx="6"
          fill="#000"
          filter={`url(#${id}-grain)`}
        />
        <rect
          x="172"
          y="92"
          width="456"
          height="316"
          rx="3"
          fill="none"
          stroke="#b5452c"
          strokeWidth="2"
        />
        <text
          x="400"
          y="148"
          textAnchor="middle"
          fill="#b5452c"
          style={{ font: "500 18px var(--font-geist-mono), monospace", letterSpacing: "0.3em" }}
        >
          {kicker}
        </text>
        <text
          x="400"
          y="248"
          textAnchor="middle"
          fill="#1f2a24"
          style={{ font: "italic 84px var(--font-instrument-serif), Georgia, serif" }}
        >
          {headline}
        </text>
        <text
          x="400"
          y="306"
          textAnchor="middle"
          fill="#3b4a41"
          style={{ font: "400 26px var(--font-instrument-serif), Georgia, serif" }}
        >
          {line}
        </text>
        <circle cx="400" cy="362" r="2.5" fill="#b5452c" />
        <text
          x="400"
          y="392"
          textAnchor="middle"
          fill="#1f2a24"
          style={{ font: "600 20px var(--font-geist-sans), sans-serif", letterSpacing: "0.12em" }}
        >
          {price}
        </text>
      </g>
    </svg>
  )
}
