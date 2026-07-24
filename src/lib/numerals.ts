// One shared helper for every number the user sees. Arabic-Indic digits only.

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const

/** 30 → "٣٠". Accepts number or string; leaves non-digits untouched. */
export function toArabicNumerals(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)] ?? d)
}

/** "٣٠" → "30". Normalizes Arabic-Indic back to ASCII (for search input). */
export function toAsciiNumerals(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => {
    const idx = ARABIC_INDIC.indexOf(d as (typeof ARABIC_INDIC)[number])
    return idx === -1 ? d : String(idx)
  })
}

/** Inclusive range label like "٣١–٦٠". */
export function toArabicRange(from: number, to: number): string {
  return `${toArabicNumerals(from)}–${toArabicNumerals(to)}`
}
