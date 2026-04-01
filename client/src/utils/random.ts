/**
 * Generates a cryptographically secure random integer between 0 and 999,999.
 */
export function getSecureRandom(): number {
    const array = new Uint32Array(1);
    self.crypto.getRandomValues(array);
    // modulo trick to ensures result is in range [0, 999999]
    const randomNumber = array[0] % 1000000;
    return randomNumber;
}
