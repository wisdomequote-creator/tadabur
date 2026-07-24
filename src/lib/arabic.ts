// Normalize Arabic text for search: strip diacritics/marks and fold letter
// variants, so a plain query like the Arabic for "al-Hajj" matches a diacritized
// stored name. Implemented with numeric codepoints (no literal Arabic in the
// source) to keep the mark ranges exact and unambiguous.

const ALEF = 0x0627 // ا
const YAA = 0x064a // ي
const HAA = 0x0647 // ه

function foldChar(cp: number): string | null {
  // Combining marks — drop them:
  //   0610–061A signs · 064B–065F harakat/tanwin/shadda/sukun ·
  //   0670 dagger alef · 06D6–06ED Quranic marks · 0640 tatweel · bidi controls
  if (
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06ed) ||
    cp === 0x0640 ||
    cp === 0x200e ||
    cp === 0x200f ||
    cp === 0x061c
  ) {
    return null
  }
  // Fold letter variants:
  if (cp === 0x0622 || cp === 0x0623 || cp === 0x0625 || cp === 0x0671) {
    return String.fromCharCode(ALEF) // آ أ إ ٱ → ا
  }
  if (cp === 0x0649) return String.fromCharCode(YAA) // ى → ي
  if (cp === 0x0629) return String.fromCharCode(HAA) // ة → ه
  return String.fromCharCode(cp)
}

export function normalizeArabic(input: string): string {
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const folded = foldChar(input.charCodeAt(i))
    if (folded !== null) out += folded
  }
  return out.trim()
}
