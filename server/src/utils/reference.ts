import { randomBytes } from 'node:crypto'

// Ambiguous characters (0, O, 1, I) are excluded so references are easy to
// read back over the phone or from a printed slip.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generates a reservation reference in the form WYN-XXXXX, e.g. WYN-8F42K9.
 * ~33 million combinations; uniqueness is enforced by a unique index plus a
 * retry loop in the reservation service.
 */
export function generateReference(): string {
  const bytes = randomBytes(5)
  let code = ''
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length]
  }
  return `WYN-${code}`
}