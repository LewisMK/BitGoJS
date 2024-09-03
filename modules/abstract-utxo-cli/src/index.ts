import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { cmdCreate } from './commands/createWallet';
import { cmdAddress } from './commands/createAddress';

yargs(hideBin(process.argv))
  .option('env', { choices: ['prod', 'test'], default: 'test' } as const)
  .option('coin', { type: 'string', default: 'tbtc' })
  .option('accessToken', { type: 'string' })
  .option('walletPassphrase', { type: 'string', default: 'setec astronomy' })
  .command(cmdCreate)
  .command(cmdAddress)
  .demandCommand()
  .help().argv;
