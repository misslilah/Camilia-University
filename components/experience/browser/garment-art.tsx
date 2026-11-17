export type GarmentKind = "tee" | "longsleeve" | "knit" | "jeans" | "chinos" | "shorts" | "skirt" | "sneakers" | "boots" | "boxers" | "set"

function shade(hex: string, amount: number) {
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel: number) => Math.max(0, Math.min(255, Math.round(channel + amount * 255)))
  const r = mix((value >> 16) & 255)
  const g = mix((value >> 8) & 255)
  const b = mix(value & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

export function GarmentArt({ kind, color, sole = "#f3f1ea", backdrop = "#efece6" }: { kind: GarmentKind; color: string; sole?: string; backdrop?: string }) {
  const line = shade(color, color === "#1e1f23" || color === "#202024" || color === "#1d1d20" ? 0.18 : -0.18)
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden>
      <rect width="120" height="150" fill={backdrop} />
      <g stroke={line} strokeWidth="1.2" strokeLinejoin="round">
        {(kind === "tee" || kind === "longsleeve" || kind === "knit") && (
          <g>
            {kind === "tee" ? (
              <path d="M42 34 L24 44 L30 62 L38 58 V118 H82 V58 L90 62 L96 44 L78 34 Z" fill={color} />
            ) : (
              <path d="M42 34 L26 42 L16 108 L27 110 L38 64 V118 H82 V64 L93 110 L104 108 L94 42 L78 34 Z" fill={color} />
            )}
            <path d="M48 34 Q60 44 72 34" fill="none" />
            {kind === "knit" && (
              <g fill="none" opacity="0.6">
                <path d="M38 112 H82 M38 115 H82" />
                <path d="M50 52 V106 M60 52 V106 M70 52 V106" strokeDasharray="2 3" />
              </g>
            )}
          </g>
        )}
        {(kind === "jeans" || kind === "chinos") && (
          <g>
            <path d="M38 22 H82 L88 132 H66 L60 62 L54 132 H32 Z" fill={color} />
            <path d="M38 30 H82" fill="none" />
            {kind === "jeans" && <path d="M44 32 Q46 44 56 44 M76 32 Q74 44 64 44" fill="none" stroke="#d9a35a" strokeOpacity="0.8" />}
            {kind === "chinos" && <path d="M47 34 L46 128 M73 34 L74 128" fill="none" opacity="0.35" />}
          </g>
        )}
        {kind === "shorts" && (
          <g>
            <path d="M36 44 H84 L90 102 H64 L60 74 L56 102 H30 Z" fill={color} />
            <path d="M36 52 H84" fill="none" />
          </g>
        )}
        {kind === "skirt" && (
          <g>
            <path d="M44 28 H76 L94 128 H26 Z" fill={color} />
            <path d="M44 36 H76 M52 36 L44 128 M68 36 L76 128" fill="none" opacity="0.4" />
          </g>
        )}
        {(kind === "sneakers" || kind === "boots") && (
          <g>
            {kind === "sneakers" ? (
              <path d="M22 94 Q22 74 34 70 L56 66 Q64 76 78 80 L96 86 Q102 90 100 100 H22 Z" fill={color} />
            ) : (
              <path d="M30 44 H58 V74 Q70 80 86 84 Q100 88 98 100 H28 Z" fill={color} />
            )}
            <rect x="20" y="100" width="82" height="8" rx="3" fill={sole} />
            {kind === "sneakers" ? <path d="M42 72 L52 82 M48 70 L58 80" fill="none" /> : <path d="M34 52 H54 M34 60 H54" fill="none" opacity="0.5" />}
          </g>
        )}
        {kind === "boxers" && (
          <g>
            <path d="M32 48 H88 L92 100 H66 L60 84 L54 100 H28 Z" fill={color} />
            <rect x="32" y="48" width="56" height="9" fill={shade(color, -0.08)} />
          </g>
        )}
        {kind === "set" && (
          <g>
            <path d="M34 34 Q42 26 50 34 L56 52 H30 Z M70 34 Q78 26 86 34 L90 52 H64 Z" fill={color} />
            <path d="M30 52 H90 V58 H30 Z" fill={shade(color, -0.08)} />
            <path d="M38 34 L40 22 M82 34 L80 22" fill="none" />
            <path d="M34 82 H86 L80 96 Q68 112 60 112 Q52 112 40 96 Z" fill={color} />
            <path d="M34 82 H86 V87 H34 Z" fill={shade(color, -0.08)} />
          </g>
        )}
      </g>
    </svg>
  )
}
