#!/usr/bin/env node
import * as yargs from 'yargs';
import {
  cmdGenerateAddress,
  cmdGenerateKeypair,
  cmdParseAddress,
  cmdParseScript,
  cmdParseTx,
  cmdParseXpub,
} from '../src/commands';

yargs
  .command(cmdParseTx)
  .command(cmdParseAddress)
  .command(cmdParseScript)
  .command(cmdGenerateAddress)
  .command(cmdGenerateKeypair)
  .command(cmdParseXpub)
  .demandCommand()
  .help()
  .parse();
