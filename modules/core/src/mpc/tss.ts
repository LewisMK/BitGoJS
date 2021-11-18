const assert = require('assert');
import { randomBytes as cryptoRandomBytes } from 'crypto';
import { Ed25519Curve, UnaryOperation, BinaryOperation } from './curves';
import * as BigNum from 'bn.js';
import { sha512 } from 'js-sha512';
import shamir = require('secrets.js-grempe');
const sodium = require('libsodium-wrappers-sumo');
import { split as shamirSplit, combine as shamirCombine } from './shamir';

export default class Eddsa {

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  public static async keyShare(index: number, threshold, numShares) {
    assert(index > 0 && index <= numShares);
    await sodium.ready;

    const randomNumber = new BigNum(cryptoRandomBytes(32));
    const sk = randomNumber.toBuffer('be', Math.floor((randomNumber.bitLength() + 7) / 8));
    const h = new BigNum(sha512.digest(sk)).toBuffer('be');
    const zeroBuffer = Buffer.alloc(64 - h.length);
    const combinedBuffer = Buffer.concat([zeroBuffer, h]);

    let uBuffer = combinedBuffer.slice(0, 32);
    uBuffer[0] &= 248;
    uBuffer[31] &= 63;
    uBuffer[31] |= 64;

    const zeroBuffer32 = Buffer.alloc(32);
    uBuffer = Buffer.concat([zeroBuffer32, uBuffer]);
    const u = Buffer.from(sodium.crypto_core_ed25519_scalar_reduce(uBuffer));
    const y = Buffer.from(sodium.crypto_scalarmult_ed25519_base_noclamp(u));

    const u_hex = u.toString('hex');
    let split_u: string[] | Buffer[] = shamir.share(u_hex, numShares, threshold);
    split_u = split_u.map((uShare) => {
      return Buffer.from(uShare, 'hex');
    });
    
    let prefixBuffer = combinedBuffer.subarray(32, combinedBuffer.length);
    prefixBuffer = Buffer.concat([zeroBuffer32, prefixBuffer]);
    const prefix = Buffer.from(sodium.crypto_core_ed25519_scalar_reduce(prefixBuffer));

    const P_i = {
      i: index,
      y: y,
      u: split_u[index - 1],
      prefix: prefix,
    };
    const shares: any = {
      [index]: P_i,
    };

    for (let ind = 0; ind < split_u.length; ind++) {
      if (ind + 1 === index) {
        continue;
      }
      shares[ind + 1] = {
        i: ind + 1,
        j: P_i['i'],
        y: y,
        u: split_u[ind],
      };
    }
    return shares;
  }

  /**
   * Combine data shared during the key generation protocol. 
   * @param shares 
   */
  public static async keyCombine(shares) {
    await sodium.ready;

    let P_i = shares.filter((share) => {
      return !('j' in share);
    });
    const keys = Object.keys(P_i);
    P_i = P_i[keys[0]];

    const yShares = shares.map(share => share['y']);
    const uShares = shares.map(share => share['u']);
    let y: Buffer = yShares[0];
    let x: Buffer = uShares[0].slice(0, 32);
    for (let ind = 1; ind < yShares.length; ind ++) {
      const share = yShares[ind];
      y = sodium.crypto_core_ed25519_add(y, share);
    }
    for (let ind = 1; ind < uShares.length; ind ++) {
      const share = uShares[ind].slice(0, 32);
      x = sodium.crypto_core_ed25519_scalar_add(x, share);
    }

    P_i = {
      i: P_i['i'],
      y: y,
      x: x,
      prefix: P_i['prefix'],
    };
    const i = P_i['i'];
    const players = {
      [i]: P_i,
    };

    for (let ind = 0; ind < shares.length; ind++) {
      const P_j = shares[ind];
      if ('j' in P_j) {
        players[P_j['j']] = {
          i: P_j['j'],
          j: P_i['i'],
        };
      }
    }
    return players;
  }


  public static async signShare(message: Buffer, shares, threshold, numShares) {
    await sodium.ready;
    let S_i = shares.filter((share) => {
      return !('j' in share);
    });
    const keys = Object.keys(S_i);
    S_i = S_i[keys[0]];

    const randomBuffer = Buffer.from(sodium.crypto_core_ed25519_scalar_random());
    const combinedBuffer = Buffer.concat([S_i['prefix'], message, randomBuffer]);
    const digest = Buffer.from(sha512.digest(combinedBuffer));

    const r = Buffer.from(sodium.crypto_core_ed25519_scalar_reduce(digest));
    const R = Buffer.from(sodium.crypto_scalarmult_ed25519_base_noclamp(r));

    const r_hex = r.toString('hex');
    let split_r: string[] | Buffer[] = shamir.share(r_hex, numShares, threshold);
    split_r = split_r.map((rShare) => {
      return Buffer.from(rShare, 'hex');
    });

    const resultShares: any = {
      [S_i['i']]: {
        i: S_i['i'],
        y: S_i['y'],
        x: S_i['x'],
        r: split_r[S_i['i']],
        R: R,
      },
    };

    for (let ind = 0; ind < shares.length; ind++) {
      const S_j = shares[ind];
      if ('j' in S_j) {
        resultShares[S_j['i']] = {
          i: S_j['i'],
          j: S_i['i'],
          r: split_r[S_j['i']],
          R: R,
        };
      }
    }

    return resultShares;
  }

  public static async sign(message: Buffer, shares) {
    let S_i = shares.filter((share) => {
      return !('j' in share);
    });
    S_i = Object.keys(S_i)[0];

    const rShares = shares.map(share => share['R']);
    const R = rShares.reduce(async (partial, share) => {
      return await Ed25519Curve.pointAdd(partial, share);
    });

    const r_buffer = Buffer.alloc(32);
    const si_buffer = Buffer.alloc(32);
    r_buffer.writeInt32LE(R, 0);
    si_buffer.writeInt32LE(S_i['y'], 0);
    const combinedBuffer = Buffer.concat([r_buffer, si_buffer, message]);
    const digest = sha512.digest(combinedBuffer);
    const L = new BigNum(digest);
    const k = await Ed25519Curve.scalarReduce(L);

    const little_r_shares = shares.map(share => share['r']);
    const r = little_r_shares.reduce((partial, share) => {
      return Ed25519Curve.binaryOperation(partial, share, BinaryOperation.scalarAdd);
    });
    const gamma = await Ed25519Curve.binaryOperation(r,
      await Ed25519Curve.binaryOperation(k, S_i['x'], BinaryOperation.scalarMultiply),
      BinaryOperation.scalarAdd
    );

    return {
      i: S_i['i'],
      y: S_i['y'],
      gamma: gamma,
      R: R,
    };
  }

  public static async signCombine(shares) {
    const y = Object.keys(shares)[0]['y'];
    const R = Object.keys(shares)[0]['R'];

    const resultShares = {};
    for (let ind = 0; ind < Object.keys(shares).length; ind++) {
      const S_i = shares[ind];
      resultShares[S_i['i']] = S_i['gamma'];
    }
    const sigma = shamirCombine(resultShares);
    return {
      y: y,
      R: R,
      sigma: sigma,
    };
  }

  public static async verify(message, signature): Promise<boolean> {
    const y_buffer = Buffer.alloc(32);
    const r_buffer = Buffer.alloc(32);
    const sigma_buffer = Buffer.alloc(32);
    y_buffer.writeUInt32LE(signature['y'], 0);
    r_buffer.writeUInt32LE(signature['R'], 0);
    sigma_buffer.writeUInt32LE(signature['sigma'], 0);

    const combinedBuffer = Buffer.concat([r_buffer, sigma_buffer]);
    return await Ed25519Curve.verify(y_buffer, message, combinedBuffer);
  }
}
