import { toArabicNumerals } from '../lib/numerals'

interface AyahStarProps {
  n: number
  size?: number
}

// 8 rosette dots between the two rings.
const DOTS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI / 4) * i - Math.PI / 2
  return [50 + 40.5 * Math.cos(a), 50 + 40.5 * Math.sin(a)] as const
})

/**
 * The ayah-number marker — a decorated circle in the manuscript tradition:
 * a double ring with a ring of small rosette dots, the number in the centre.
 */
export default function AyahStar({ n, size = 34 }: AyahStarProps) {
  const label = toArabicNumerals(n)
  const fontSize = label.length >= 3 ? 24 : label.length === 2 ? 30 : 34
  return (
    <svg
      className="ayah-star"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="50" cy="50" r="46" className="ayah-star__ring" />
      <circle cx="50" cy="50" r="34.5" className="ayah-star__ring ayah-star__ring--inner" />
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.3" className="ayah-star__dot" />
      ))}
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
