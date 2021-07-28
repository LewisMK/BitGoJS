import { coins } from '@bitgo/statics';
import algosdk from 'algosdk';
import should from 'should';
import sinon, { assert } from 'sinon';
import { Transaction } from '../../../../../src/coin/algo';
import { KeyRegistrationBuilder } from '../../../../../src/coin/algo/keyRegistrationBuilder';

import * as AlgoResources from '../../../../resources/algo';

class StubTransactionBuilder extends KeyRegistrationBuilder {
  getTransaction(): Transaction {
    return this._transaction;
  }
}

describe('Algo KeyRegistration Builder', () => {
  const {
    networks: { testnet },
  } = AlgoResources;
  const { genesisHash, genesisID } = testnet;
  let builder: StubTransactionBuilder;

  const sender = AlgoResources.accounts.account1;
  const { rawTx } = AlgoResources;

  beforeEach(() => {
    const config = coins.get('algo');
    builder = new StubTransactionBuilder(config);
  });

  describe('setter validation', () => {
    it('should validate voteKey, is set and is a valid string', () => {
      should.doesNotThrow(() => builder.voteKey(sender.voteKey));
    });

    it('should validate selection key, is set and is a valid string', () => {
      should.doesNotThrow(() => builder.selectionKey(sender.selectionKey));
    });

    it('should validate voteFirst is gt than 0', () => {
      const spy = sinon.spy(builder, 'validateValue');
      should.throws(
        () => builder.voteFirst(-1),
        (e: Error) => e.message === 'Value cannot be less than zero',
      );
      should.doesNotThrow(() => builder.voteFirst(15));
      assert.calledTwice(spy);
    });

    it('should validate voteLast is gt than 0', () => {
      const validateValueSpy = sinon.spy(builder, 'validateValue');
      builder.voteFirst(1);
      should.throws(
        () => builder.voteLast(-1),
        (e: Error) => e.message === 'Value cannot be less than zero',
      );
      should.doesNotThrow(() => builder.voteLast(15));
      assert.calledThrice(validateValueSpy);
    });

    it('should validate vote Key Dilution', () => {
      const validateValueSpy = sinon.spy(builder, 'validateValue');
      builder.voteFirst(5).voteLast(18);
      should.doesNotThrow(() => builder.voteKeyDilution(2));
      assert.calledThrice(validateValueSpy);
    });
  });

  describe('transaction validation', () => {
    beforeEach(() => {
      builder.sender({ address: sender.address }).fee({ feeRate: '1000' }).firstRound(1).lastRound(100).testnet();
    });
    it('should validate a normal transaction', () => {
      builder.voteKey(sender.voteKey).selectionKey(sender.selectionKey).voteFirst(1).voteLast(100).voteKeyDilution(9);
      should.doesNotThrow(() => builder.validateTransaction(builder.getTransaction()));
    });
  });

  describe('build key registration transaction', () => {
    it('should build a key registration transaction', async () => {
      builder
        .sender({ address: sender.address })
        .fee({ feeRate: '1000' })
        .firstRound(1)
        .lastRound(100)
        .voteKey(sender.voteKey)
        .selectionKey(sender.selectionKey)
        .voteFirst(1)
        .voteLast(100)
        .voteKeyDilution(9)
        .testnet()
        .numberOfSigners(1);
      builder.sign({ key: sender.secretKey.toString('hex') });
      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.from, sender.address);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
      should.deepEqual(txJson.genesisID, genesisID.toString());
      should.deepEqual(txJson.genesisHash.toString('base64'), genesisHash);
    });

    it('should build an unsigned key registration transaction', async () => {
      builder
        .sender({ address: sender.address })
        .fee({ feeRate: '1000' })
        .firstRound(1)
        .lastRound(100)
        .voteKey(sender.voteKey)
        .selectionKey(sender.selectionKey)
        .voteFirst(1)
        .voteLast(100)
        .voteKeyDilution(9)
        .testnet();
      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.from, sender.address);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
      should.deepEqual(txJson.genesisID, genesisID.toString());
      should.deepEqual(txJson.genesisHash.toString('base64'), genesisHash);
    });

    it('should build a trx from an unsigned raw transaction', async () => {
      builder.from(rawTx.keyReg.unsigned);
      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.from, sender.address);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
    });

    it('should sign from raw unsigned tx', async () => {
      builder.from(rawTx.keyReg.unsigned);
      builder.numberOfSigners(1);
      builder.sign({ key: sender.secretKey.toString('hex') });
      const tx = await builder.build();
      should.deepEqual(Buffer.from(tx.toBroadcastFormat()).toString('hex'), AlgoResources.rawTx.keyReg.signed);
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.from, sender.address);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
    });
  });

  describe('build multi-sig key registration transaction', () => {
    it('should build a msig registration transaction', async () => {
      const msigAddress = algosdk.multisigAddress({
        version: 1,
        threshold: 2,
        addrs: [AlgoResources.accounts.account1.address, AlgoResources.accounts.account3.address],
      });
      builder
        .sender({ address: sender.address })
        .fee({ feeRate: '1000' })
        .firstRound(1)
        .lastRound(100)
        .voteKey(sender.voteKey)
        .selectionKey(sender.selectionKey)
        .voteFirst(1)
        .voteLast(100)
        .voteKeyDilution(9)
        .testnet()
        .numberOfSigners(2)
        .setSigners([AlgoResources.accounts.account1.address, AlgoResources.accounts.account3.address])
        .sign({ key: AlgoResources.accounts.account1.secretKey.toString('hex') });
      builder.sign({ key: AlgoResources.accounts.account3.secretKey.toString('hex') });
      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.from, msigAddress);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
      should.deepEqual(txJson.genesisID, genesisID.toString());
      should.deepEqual(txJson.genesisHash.toString('base64'), genesisHash);
    });
  });

  describe('fee flow test', () => {
    it('fee value should be updated when signing and building for the first the first time', async () => {
      builder
        .sender({ address: sender.address })
        .fee({ feeRate: '500' })
        .firstRound(1)
        .lastRound(100)
        .voteKey(sender.voteKey)
        .selectionKey(sender.selectionKey)
        .voteFirst(1)
        .voteLast(100)
        .voteKeyDilution(9)
        .testnet()
        .numberOfSigners(1)
        .sign({ key: sender.secretKey.toString('hex') });

      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.fee, 152000);
      should.deepEqual(txJson.from, sender.address);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
      should.deepEqual(txJson.genesisID, genesisID.toString());
      should.deepEqual(txJson.genesisHash.toString('base64'), genesisHash);
    });

    it('fee value should be maintained when building an already signed keyRegistration', async () => {
      const msigAddress = algosdk.multisigAddress({
        version: 1,
        threshold: 3,
        addrs: [
          AlgoResources.accounts.account1.address,
          AlgoResources.accounts.account3.address,
          AlgoResources.accounts.account4.address,
        ],
      });

      builder
        .sender({ address: sender.address })
        .fee({ feeRate: '90' })
        .firstRound(1)
        .lastRound(100)
        .voteKey(sender.voteKey)
        .selectionKey(sender.selectionKey)
        .voteFirst(1)
        .voteLast(100)
        .voteKeyDilution(9)
        .testnet()
        .numberOfSigners(3)
        .setSigners([
          AlgoResources.accounts.account1.address,
          AlgoResources.accounts.account3.address,
          AlgoResources.accounts.account4.address,
        ])
        .sign({ key: AlgoResources.accounts.account1.secretKey.toString('hex') });

      builder.sign({ key: AlgoResources.accounts.account3.secretKey.toString('hex') });

      const tx = await builder.build();
      const txJson = tx.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: txJson.voteKey }));
      should.deepEqual(txJson.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: txJson.selectionKey }));
      should.deepEqual(txJson.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(txJson.fee, 27180);
      should.deepEqual(txJson.from, msigAddress);
      should.deepEqual(txJson.firstRound, 1);
      should.deepEqual(txJson.lastRound, 100);
      should.deepEqual(txJson.voteFirst, 1);
      should.deepEqual(txJson.voteLast, 100);
      should.deepEqual(txJson.voteKeyDilution, 9);
      should.deepEqual(txJson.genesisID, genesisID.toString());
      should.deepEqual(txJson.genesisHash.toString('base64'), genesisHash);

      const builder2 = new KeyRegistrationBuilder(coins.get('algo'));
      builder2.from(tx.toBroadcastFormat());
      builder2
        .numberOfSigners(3)
        .setSigners([
          AlgoResources.accounts.account1.address,
          AlgoResources.accounts.account3.address,
          AlgoResources.accounts.account4.address,
        ])
        .sign({ key: AlgoResources.accounts.account4.secretKey.toString('hex') });

      const tx2 = await builder2.build();
      const tx2Json = tx2.toJson();
      should.doesNotThrow(() => builder.validateKey({ key: tx2Json.voteKey }));
      should.deepEqual(tx2Json.voteKey.toString('base64'), sender.voteKey);
      should.doesNotThrow(() => builder.validateKey({ key: tx2Json.selectionKey }));
      should.deepEqual(tx2Json.selectionKey.toString('base64'), sender.selectionKey);
      should.deepEqual(tx2Json.fee, 27180);
      should.deepEqual(tx2Json.from, msigAddress);
      should.deepEqual(tx2Json.firstRound, 1);
      should.deepEqual(tx2Json.lastRound, 100);
      should.deepEqual(tx2Json.voteFirst, 1);
      should.deepEqual(tx2Json.voteLast, 100);
      should.deepEqual(tx2Json.voteKeyDilution, 9);
      should.deepEqual(tx2Json.genesisID, genesisID.toString());
      should.deepEqual(tx2Json.genesisHash.toString('base64'), genesisHash);
    });
  });
});
