const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const KEY_LENGTH = 6;

export function generateKey(): string {
  const bytes = new Uint8Array(KEY_LENGTH);
  let result = "";

  while (result.length < KEY_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (result.length >= KEY_LENGTH) break;
      // Reject bytes that would introduce modulo bias against the 32-symbol alphabet.
      if (byte >= 256 - (256 % ALPHABET.length)) continue;
      result += ALPHABET[byte % ALPHABET.length];
    }
  }

  return result;
}
