/**
 * Implementation of No Small Factors ($\Pi^\text{fac}).
 * https://eprint.iacr.org/2020/492.pdf Section B.4
 */
import { createHash } from 'crypto';
import { bitLength, randBetween } from 'bigint-crypto-utils';
import { modPow } from 'bigint-mod-arith';
import { bigIntFromBufferBE, bigIntToBufferBE } from '../../util';
import { DeserializedNoSmallFactorsProof } from './types';

const ORDER = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const ELL = BigInt(256);
const EPSILON = BigInt(BigInt(2) * ELL);

/**
 * Generate pseudo-random challenge value $e$ for $(N, w)$.
 * @param N - the prime number to verify is a product of two large primes.
 * @param w - a random number with the same bitLength as N, that satisfies the Jacobi of w is -1 wrt N.
 * @returns {bigint} - challenge value $e$.
 */
function generateE(N: bigint, w: bigint): bigint {
  const digest = createHash('shake256', { outputLength: 1 + Math.floor((bitLength(ORDER) + 7) / 8) })
    .update(bigIntToBufferBE(N))
    .update('$')
    .update(bigIntToBufferBE(w))
    .update('$')
    .digest();
  const e = bigIntFromBufferBE(digest.subarray(1)) % ORDER;
  if (digest[0] & 1) {
    return -e;
  }
  return e;
}

/**
 * Calculate the closest integer square root of $n$.
 * @param n - the number to calculate the square root of.
 * @returns {bigint} - $n$'s closest integer square root.
 */
function isqrt(n: bigint): bigint {
  if (n < BigInt(0)) {
    throw new Error();
  }
  if (n < BigInt(2)) {
    return n;
  }
  function newtonIteration(n: bigint, x0: bigint) {
    const x1 = (n / x0 + x0) >> BigInt(1);
    if (x0 === x1 || x0 === x1 - BigInt(1)) {
      return x0;
    }
    return newtonIteration(n, x1);
  }
  return newtonIteration(n, BigInt(1));
}

/**
 * Prove that $n0$ has no small factors, where $n0$ is the product of two large primes.
 * @param p - a large prime.
 * @param q - a large prime.
 * @param w - a random number with the same bitLength as $p * q$, that satisfies the Jacobi of w is -1 wrt $n0$.
 * @param nHat - a safe bi-prime, such as that returned from rangeProof.generateNTilde.
 * @param s - security parameters for $nHat$ such as the $h1$ value returned from rangeProof.generateNTilde.
 * @param t - security parameters for $nHat$ such as the $h2$ value returned from rangeProof.generateNTilde.
 * @returns proof that the product of $p * q$ has no small factors.
 */
export function prove(
  p: bigint,
  q: bigint,
  w: bigint,
  nHat: bigint,
  s: bigint,
  t: bigint
): DeserializedNoSmallFactorsProof {
  const n0 = p * q;
  const e = generateE(n0, w);
  const sqrtN0 = isqrt(n0);
  const alpha = randBetween(sqrtN0 << (ELL + EPSILON), -sqrtN0 << (ELL + EPSILON));
  const beta = randBetween(sqrtN0 << (ELL + EPSILON), -sqrtN0 << (ELL + EPSILON));
  const rho = randBetween((nHat * n0) << ELL, -(nHat * n0) << ELL);
  // Commit to p.
  const mu = randBetween(BigInt(1) << ELL, BigInt(-1) << ELL);
  const P = (modPow(s, p, nHat) * modPow(t, mu, nHat)) % nHat;
  // Commit to q.
  const nu = randBetween(BigInt(1) << ELL, BigInt(-1) << ELL);
  const Q = (modPow(s, q, nHat) * modPow(t, nu, nHat)) % nHat;
  // Commit to alpha.
  const x = randBetween(BigInt(1) << (ELL + EPSILON), BigInt(-1) << (ELL + EPSILON));
  const A = (modPow(s, alpha, nHat) * modPow(t, x, nHat)) % nHat;
  // Commit to beta.
  const y = randBetween(BigInt(1) << (ELL + EPSILON), BigInt(-1) << (ELL + EPSILON));
  const B = (modPow(s, beta, nHat) * modPow(t, y, nHat)) % nHat;
  // Commit to Q and alpha.
  const r = randBetween((nHat * n0) << (ELL + EPSILON), -(nHat * n0) << (ELL + EPSILON));
  const T = (modPow(Q, alpha, nHat) * modPow(t, r, nHat)) % nHat;

  const rhoHat = rho - nu * p;
  const z1 = alpha + e * p;
  const z2 = beta + e * q;
  const w1 = x + e * mu;
  const w2 = y + e * nu;
  const v = r + e * rhoHat;

  return { P, Q, A, B, T, rho, z1, z2, w1, w2, v };
}

/**
 * Verify that $n0$ is not the product of any small factors.
 * @param n0 - a modulus that is the product of $p$ and $q$.
 * @param w - a random number with the same bitLength as $n0$, that satisfies the Jacobi of w is -1 wrt $n0$.
 * @param nHat - a safe bi-prime, such as that returned from rangeProof.generateNTilde.
 * @param s - security parameters for $nHat$ such as the $h1$ value returned from rangeProof.generateNTilde.
 * @param t - security parameters for $nHat$ such as the $h2$ value returned from rangeProof.generateNTilde.
 * @param proof - a proof generated by noSmallFactors.prove.
 * @returns true if verification successful.
 */
export function verify(
  n0: bigint,
  w: bigint,
  nHat: bigint,
  s: bigint,
  t: bigint,
  proof: DeserializedNoSmallFactorsProof
): boolean {
  const { P, Q, A, B, T, rho, z1, z2, w1, w2, v } = proof;
  const e = generateE(n0, w);
  const sqrtN0 = isqrt(n0);
  const R = (modPow(s, n0, nHat) * modPow(t, rho, nHat)) % nHat;
  if ((modPow(s, z1, nHat) * modPow(t, w1, nHat)) % nHat !== (A * modPow(P, e, nHat)) % nHat) {
    throw new Error('Could not verify no small factors proof');
  }
  if ((modPow(s, z2, nHat) * modPow(t, w2, nHat)) % nHat !== (B * modPow(Q, e, nHat)) % nHat) {
    throw new Error('Could not verify no small factors proof');
  }
  if ((modPow(Q, z1, nHat) * modPow(t, v, nHat)) % nHat !== (T * modPow(R, e, nHat)) % nHat) {
    throw new Error('Could not verify no small factors proof');
  }
  if (z1 < -sqrtN0 << (ELL + EPSILON) || z1 > sqrtN0 << (ELL + EPSILON)) {
    throw new Error('Could not verify no small factors proof');
  }
  if (z2 < -sqrtN0 << (ELL + EPSILON) || z2 > sqrtN0 << (ELL + EPSILON)) {
    throw new Error('Could not verify no small factors proof');
  }
  return true;
}