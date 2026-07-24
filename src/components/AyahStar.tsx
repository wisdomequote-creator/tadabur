import { toArabicNumerals } from '../lib/numerals'

/** Eight-point star (khātim) — two overlapping squares, the manuscript seal. */
function buildStarPath(cx: number, cy: number, outer: number, inner: number): string {
  const points = 8
  const step = Math.PI / points
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + i * step
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `
  }
  return `${d}Z`
}

const STAR = buildStarPath(50, 50, 47, 25.5)

interface AyahStarProps {
  n: number
  size?: number
}

export default function AyahStar({ n, size = 34 }: AyahStarProps) {
  const label = toArabicNumerals(n)
  // Keep the numeral inside the star's inner field regardless of digit count.
  const fontSize = label.length >= 3 ? 25 : label.length === 2 ? 32 : 37
  return (
    <svg
      className="ayah-star"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <path d={STAR} className="ayah-star__seal" />
      <text
        x="50"
        y="50"
        className="ayah-star__num"
        fontSize={fontSize}
        dominantBaseline="central"
        textAnchor="middle"
      >
        {label}
      </text>
    </svg>
  )
}
