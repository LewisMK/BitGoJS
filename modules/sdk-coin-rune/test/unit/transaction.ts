import { toHex, TransactionType } from '../../../sdk-core';
import { coins } from '../../../statics';
import { fromBase64 } from '@cosmjs/encoding';
import should from 'should';
const bech32 = require('bech32-buffer');

import { CosmosTransaction, SendMessage } from '../../../abstract-cosmos';
import { RuneUtils } from '../../src/lib/utils';
import * as testData from '../resources/trune';
import { BitGoAPI } from '../../../sdk-api';
import { Trune } from '../../src';
// import {Tatom} from "../../../../modules/sdk-coin-atom";

describe('Rune Transaction', () => {
  let tx: CosmosTransaction;
  const config = coins.get('tthorchain:rune');
  // const config = coins.get('tatom');
  const utils = new RuneUtils(config.network.type);

  beforeEach(() => {
    tx = new CosmosTransaction(config, utils);
  });

  describe('test', () => {
    it('some test', async function () {
      const bitgo = new BitGoAPI({
        accessToken: 'v2xad7bf418fad6e3a2d91def84cb8702c97b9836992b9f0fd7c88d8591eac68fdb',
        env: 'staging',
        // accessToken: 'v2x61f46356432943365c9262f4571e0860e0dd6241e263479d66fb06c107a32a83',
        // env: 'test',
      });

      const coin = 'tthorchain:rune';
      bitgo.register(coin, Trune.createInstance);
      // const coin = 'tatom';
      // bitgo.register(coin, Tatom.createInstance);

      const walletId = '67359b1a0892a94fb4ccb819ca0ae8d5';
      const walletPassphrase = 'Ghghjkg!455544llll';

      bitgo.unlock({ otp: '000000' });
      const walletInstance = await bitgo.coin(coin).wallets().get({ id: walletId });

      await walletInstance.sendMany({
        recipients: [
          {
            amount: '100000',
            address: 'sthor18shcujd2xsfpll4vnxg4edxz3g3gtkl0agsxnj',
          },
        ],
        walletPassphrase: walletPassphrase,
        type: 'transfer',
      });
    });
  });

  describe('Empty transaction', () => {
    it('should throw empty transaction', function () {
      should.throws(() => tx.toBroadcastFormat(), 'Empty transaction');
    });
  });

  describe('From raw transaction', () => {
    it('should build a transfer from raw signed base64', function () {
      tx.enrichTransactionDetailsFromRawTransaction(testData.TEST_SEND_TX.signedTxBase64);
      const json = tx.toJson();
      should.equal(json.sequence, testData.TEST_SEND_TX.sequence);
      should.deepEqual(json.gasBudget, testData.TEST_SEND_TX.gasBudget);
      should.equal(json.publicKey, toHex(fromBase64(testData.TEST_SEND_TX.pubKey)));
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).toAddress,
        bech32.decode(testData.TEST_SEND_TX.sendMessage.value.toAddress).data
      );
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).amount[0].denom,
        testData.TEST_SEND_TX.sendMessage.value.amount[0].denom
      );
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).amount[0].amount,
        testData.TEST_SEND_TX.sendMessage.value.amount[0].amount
      );
      should.equal(Buffer.from(json.signature as any).toString('base64'), testData.TEST_SEND_TX.signature);
      should.equal(tx.type, TransactionType.Send);
      tx.loadInputsAndOutputs();
      should.deepEqual(tx.inputs, [
        {
          address: bech32.decode(testData.TEST_SEND_TX.sender).data,
          value: testData.TEST_SEND_TX.sendMessage.value.amount[0].amount,
          coin: 'tthorchain:rune',
        },
      ]);
      should.deepEqual(tx.outputs, [
        {
          address: bech32.decode(testData.TEST_SEND_TX.sendMessage.value.toAddress).data,
          value: testData.TEST_SEND_TX.sendMessage.value.amount[0].amount,
          coin: 'tthorchain:rune',
        },
      ]);
    });

    it('should build a transfer from raw signed hex', function () {
      tx.enrichTransactionDetailsFromRawTransaction(toHex(fromBase64(testData.TEST_SEND_TX.signedTxBase64)));
      const json = tx.toJson();
      should.equal(json.sequence, testData.TEST_SEND_TX.sequence);
      should.deepEqual(json.gasBudget, testData.TEST_SEND_TX.gasBudget);
      should.equal(json.publicKey, toHex(fromBase64(testData.TEST_SEND_TX.pubKey)));
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).toAddress,
        bech32.decode(testData.TEST_SEND_TX.sendMessage.value.toAddress).data
      );
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).amount[0].denom,
        testData.TEST_SEND_TX.sendMessage.value.amount[0].denom
      );
      should.deepEqual(
        (json.sendMessages[0].value as SendMessage).amount[0].amount,
        testData.TEST_SEND_TX.sendMessage.value.amount[0].amount
      );
      should.equal(Buffer.from(json.signature as any).toString('base64'), testData.TEST_SEND_TX.signature);
      should.equal(tx.type, TransactionType.Send);
      tx.loadInputsAndOutputs();
      should.deepEqual(tx.inputs, [
        {
          address: bech32.decode(testData.TEST_SEND_TX.sender).data,
          value: testData.TEST_SEND_TX.sendMessage.value.amount[0].amount,
          coin: 'tthorchain:rune',
        },
      ]);
      should.deepEqual(tx.outputs, [
        {
          address: bech32.decode(testData.TEST_SEND_TX.sendMessage.value.toAddress).data,
          value: testData.TEST_SEND_TX.sendMessage.value.amount[0].amount,
          coin: 'tthorchain:rune',
        },
      ]);
    });

    it('should fail to build a transfer from incorrect raw hex', function () {
      should.throws(
        () => tx.enrichTransactionDetailsFromRawTransaction('random' + testData.TEST_SEND_TX.signedTxBase64),
        'incorrect raw data'
      );
    });

    it('should fail to explain transaction with invalid raw hex', function () {
      should.throws(() => tx.enrichTransactionDetailsFromRawTransaction('randomString'), 'Invalid transaction');
    });
  });

  describe('Explain transaction', () => {
    it('should explain a transfer pay transaction', function () {
      tx.enrichTransactionDetailsFromRawTransaction(testData.TEST_SEND_TX.signedTxBase64);
      const explainedTransaction = tx.explainTransaction();
      explainedTransaction.should.deepEqual({
        displayOrder: ['id', 'outputs', 'outputAmount', 'changeOutputs', 'changeAmount', 'fee', 'type'],
        id: testData.TEST_SEND_TX.hash,
        outputs: [
          {
            address: bech32.decode(testData.TEST_SEND_TX.recipient).data,
            amount: testData.TEST_SEND_TX.sendAmount,
          },
        ],
        outputAmount: testData.TEST_SEND_TX.sendAmount,
        changeOutputs: [],
        changeAmount: '0',
        fee: { fee: testData.TEST_SEND_TX.feeAmount },
        type: 0,
      });
    });

    it('should fail to explain transaction with invalid raw base64 string', function () {
      should.throws(() => tx.enrichTransactionDetailsFromRawTransaction('randomString'), 'Invalid transaction');
    });
  });
});
