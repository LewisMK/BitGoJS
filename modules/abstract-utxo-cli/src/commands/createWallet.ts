import { ArgumentsCamelCase, CommandModule } from 'yargs';
import { BitGoApiArgs } from '../bitGoArgs';
import { getBitGoInstance } from '../util/bitGoInstance';
import { AbstractUtxoCoin } from '@bitgo/abstract-utxo';
import { BitGoAPI } from '@bitgo/sdk-api';

type CreateWalletArgs = {
  enterpriseId: string;
  name: string;
  descriptor?: string;
  walletPassphrase: string;
};

async function createDescriptorWallet(
  bitgo: BitGoAPI,
  coin: AbstractUtxoCoin,
  {
    name,
    descriptor,
    enterpriseId,
    walletPassphrase,
  }: {
    name: string;
    descriptor?: string;
    // FIXME - pick a default here
    enterpriseId: string;
    walletPassphrase: string;
  }
): Promise<void> {
  if (!descriptor) {
    throw new Error('Descriptor is required');
  }
  // FIXME remove dummy keychains
  const userKeychain = await coin.keychains().createUserKeychain(walletPassphrase);
  const backupKeychain = await coin.keychains().createBackup();
  const bitgoKeychain = await coin.keychains().createBitGo({ enterprise: enterpriseId });
  const keys = [userKeychain, backupKeychain, bitgoKeychain].map((keychain) => keychain.id);
  console.log(
    await bitgo
      .post(coin.url('/wallet'))
      .send({
        type: 'hot',
        label: name,
        enterprise: enterpriseId,
        keys,
        coinSpecific: {
          descriptors: [
            {
              name: 'default',
              value: descriptor,
              lastIndex: 0,
              signatures: [],
            },
          ],
        },
      })
      .result()
  );
}

export const cmdCreate: CommandModule<BitGoApiArgs, BitGoApiArgs & CreateWalletArgs> = {
  command: 'create',

  builder(y) {
    return y
      .option('enterpriseId', { type: 'string', demandOption: true })
      .option('name', { type: 'string', demandOption: true })
      .option('descriptor', { type: 'string' })
      .option('walletPassphrase', { type: 'string', default: 'setec astronomy' });
  },

  async handler(args: ArgumentsCamelCase<BitGoApiArgs & CreateWalletArgs>): Promise<void> {
    const bitgo = getBitGoInstance(args);
    const coin = bitgo.coin(args.coin);
    if (!(coin instanceof AbstractUtxoCoin)) {
      throw new Error('Coin is not an abstract UTXO coin');
    }
    if ('descriptor' in args) {
      if (!args.descriptor) {
        throw new Error('Descriptor is required');
      }
      await createDescriptorWallet(bitgo, coin, args);
    } else {
      throw new Error('Not implemented');
    }
  },
};
