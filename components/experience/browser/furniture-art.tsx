export type FurnitureKind =
  | "bed"
  | "desk"
  | "standing-desk"
  | "office-chair"
  | "wardrobe"
  | "floor-lamp"
  | "desk-lamp"
  | "pendant"
  | "plant"
  | "rug"
  | "frame"
  | "clock"

function shade(hex: string, amount: number) {
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel: number) => Math.max(0, Math.min(255, Math.round(channel + amount * 255)))
  const r = mix((value >> 16) & 255)
  const g = mix((value >> 8) & 255)
  const b = mix(value & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function FurnitureArt({ kind, color }: { kind: FurnitureKind; color: string }) {
  const dark = shade(color, -0.16)
  const light = shade(color, 0.14)
  const metal = "#3b3f47"
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <rect width="120" height="90" fill="#f4f2ee" />
      <ellipse cx="60" cy="80" rx="44" ry="4" fill="#000" opacity="0.08" />
      {kind === "bed" && (
        <g>
          <rect x="16" y="30" width="10" height="48" rx="2" fill={dark} />
          <rect x="22" y="52" width="84" height="16" rx="3" fill={color} />
          <rect x="24" y="46" width="80" height="9" rx="3" fill="#fbfaf7" />
          <rect x="26" y="40" width="18" height="8" rx="4" fill="#e6e1d6" />
          <rect x="52" y="44" width="54" height="12" rx="3" fill={light} />
          <rect x="24" y="68" width="4" height="10" fill={dark} />
          <rect x="100" y="68" width="4" height="10" fill={dark} />
        </g>
      )}
      {kind === "desk" && (
        <g>
          <rect x="14" y="36" width="92" height="6" rx="1.5" fill={color} />
          <rect x="18" y="42" width="4" height="36" fill={dark} />
          <rect x="98" y="42" width="4" height="36" fill={dark} />
          <rect x="70" y="42" width="28" height="18" fill={light} />
          <rect x="80" y="50" width="8" height="2" rx="1" fill={dark} />
        </g>
      )}
      {kind === "standing-desk" && (
        <g>
          <rect x="18" y="24" width="84" height="6" rx="1.5" fill={color} />
          <rect x="30" y="30" width="5" height="46" fill={metal} />
          <rect x="85" y="30" width="5" height="46" fill={metal} />
          <rect x="22" y="76" width="22" height="3" rx="1.5" fill={metal} />
          <rect x="76" y="76" width="22" height="3" rx="1.5" fill={metal} />
          <rect x="48" y="12" width="24" height="12" rx="1" fill="#2a2f3a" />
        </g>
      )}
      {kind === "office-chair" && (
        <g>
          <rect x="42" y="12" width="36" height="34" rx="9" fill={color} />
          <rect x="38" y="46" width="44" height="10" rx="5" fill={dark} />
          <rect x="58" y="56" width="4" height="14" fill={metal} />
          <path d="M36 74 L60 68 L84 74" stroke={metal} strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="36" cy="77" r="3" fill="#1d2027" />
          <circle cx="84" cy="77" r="3" fill="#1d2027" />
          <circle cx="60" cy="76" r="3" fill="#1d2027" />
        </g>
      )}
      {kind === "wardrobe" && (
        <g>
          <rect x="30" y="8" width="60" height="70" rx="2" fill={color} />
          <rect x="33" y="11" width="26" height="64" rx="1" fill={light} />
          <rect x="61" y="11" width="26" height="64" rx="1" fill={light} />
          <rect x="55" y="38" width="2" height="10" rx="1" fill={metal} />
          <rect x="63" y="38" width="2" height="10" rx="1" fill={metal} />
        </g>
      )}
      {kind === "floor-lamp" && (
        <g>
          <path d="M46 10 H74 L80 30 H40 Z" fill={color} />
          <rect x="59" y="30" width="2.5" height="44" fill={metal} />
          <ellipse cx="60" cy="76" rx="12" ry="3" fill={metal} />
          <ellipse cx="60" cy="31" rx="18" ry="3" fill="#fff6d6" opacity="0.8" />
        </g>
      )}
      {kind === "desk-lamp" && (
        <g>
          <ellipse cx="44" cy="74" rx="14" ry="4" fill={metal} />
          <path d="M44 72 L52 40 L76 30" stroke={metal} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M70 22 L90 32 L82 44 L66 34 Z" fill={color} />
          <circle cx="52" cy="40" r="3" fill={dark} />
        </g>
      )}
      {kind === "pendant" && (
        <g>
          <rect x="59" y="0" width="2" height="30" fill={metal} />
          <path d="M40 54 C40 38 48 30 60 30 C72 30 80 38 80 54 Z" fill={color} />
          <ellipse cx="60" cy="56" rx="10" ry="4" fill="#fff3c4" />
        </g>
      )}
      {kind === "plant" && (
        <g>
          <path d="M60 50 C50 30 36 26 30 30 C38 36 48 44 58 52 Z" fill="#4f8a55" />
          <path d="M60 50 C66 26 80 18 90 22 C82 30 70 40 62 52 Z" fill="#5f9e62" />
          <path d="M60 52 C58 30 60 14 64 8 C68 18 66 36 62 52 Z" fill="#3f7646" />
          <path d="M44 50 H76 L72 78 H48 Z" fill={color} />
        </g>
      )}
      {kind === "rug" && (
        <g>
          <path d="M10 60 L36 30 H110 L84 60 Z" fill={color} />
          <path d="M22 56 L42 34 H98 L78 56 Z" fill="none" stroke={light} strokeWidth="2.5" />
          <path d="M34 52 L48 38 H86 L72 52 Z" fill={dark} />
        </g>
      )}
      {kind === "frame" && (
        <g>
          <rect x="30" y="12" width="60" height="58" fill={color} />
          <rect x="35" y="17" width="50" height="48" fill="#fbfaf6" />
          <circle cx="68" cy="32" r="6" fill="#e9a54a" />
          <path d="M38 62 L54 40 L64 52 L72 44 L82 62 Z" fill="#5f8fa8" />
        </g>
      )}
      {kind === "clock" && (
        <g>
          <circle cx="60" cy="42" r="30" fill={color} />
          <circle cx="60" cy="42" r="25" fill="#fbfaf6" />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="59" y="19" width="2" height="4" fill={metal} transform={`rotate(${i * 30} 60 42)`} />
          ))}
          <path d="M60 42 L60 26 M60 42 L71 48" stroke={metal} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
    </svg>
  )
}
