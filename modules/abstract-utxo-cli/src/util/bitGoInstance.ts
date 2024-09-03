import { BitGoAPI } from '@bitgo/sdk-api';
import { CoinConstructor } from '@bitgo/sdk-core';

import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { Bch, Tbch } from '@bitgo/sdk-coin-bch';
import { Btg } from '@bitgo/sdk-coin-btg';
import { Ltc, Tltc } from '@bitgo/sdk-coin-ltc';
import { Dash, Tdash } from '@bitgo/sdk-coin-dash';
import { Doge, Tdoge } from '@bitgo/sdk-coin-doge';
import { Zec, Tzec } from '@bitgo/sdk-coin-zec';

import { BitGoApiArgs } from '../bitGoArgs';

function getBuilder(coin: string): CoinConstructor {
  switch (coin) {
    case 'btc':
      return Btc.createInstance;
    case 'tbtc':
      return Tbtc.createInstance;
    case 'bch':
      return Bch.createInstance;
    case 'tbch':
      return Tbch.createInstance;
    case 'btg':
      return Btg.createInstance;
    case 'ltc':
      return Ltc.createInstance;
    case 'tltc':
      return Tltc.createInstance;
    case 'dash':
      return Dash.createInstance;
    case 'tdash':
      return Tdash.createInstance;
    case 'doge':
      return Doge.createInstance;
    case 'tdoge':
      return Tdoge.createInstance;
    case 'zec':
      return Zec.createInstance;
    case 'tzec':
      return Tzec.createInstance;
  }
  throw new Error(`Unsupported coin: ${coin}`);
}

function getAccessTokenFromEnv(): string {
  const accessToken = process.env.BITGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('ACCESS_TOKEN environment variable is not set');
  }
  return accessToken;
}

export function getBitGoInstance({ env, accessToken = getAccessTokenFromEnv(), coin }: BitGoApiArgs): BitGoAPI {
  const api = new BitGoAPI({ env });
  api.authenticateWithAccessToken({ accessToken });
  api.register(coin, getBuilder(coin));
  return api;
}
