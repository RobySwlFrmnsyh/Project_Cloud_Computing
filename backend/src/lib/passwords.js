import { randomInt } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

export function generateTemporaryPassword(length = 12) {
  let password = ''
  for (let index = 0; index < length; index += 1) {
    password += ALPHABET[randomInt(ALPHABET.length)]
  }
  return password
}
