import { InvalidTransactionError } from '@bitgo/sdk-core';
import { Coin } from '@cosmjs/stargate';
import BigNumber from 'bignumber.js';
import { NetworkType } from '@bitgo/statics';
import { CosmosUtils } from '@bitgo/abstract-cosmos';
import * as constants from './constants';

export class HashUtils extends CosmosUtils {
  private networkType: NetworkType;
  constructor(networkType: NetworkType = NetworkType.MAINNET) {
    super();
    this.networkType = networkType;
  }
  /** @inheritdoc */
  isValidAddress(address: string): boolean {
    if (this.networkType === NetworkType.TESTNET) {
      return this.isValidCosmosLikeAddressWithMemoId(address, constants.testnetAccountAddressRegex);
    }
    return this.isValidCosmosLikeAddressWithMemoId(address, constants.mainnetAccountAddressRegex);
  }

  /** @inheritdoc */
  isValidValidatorAddress(address: string): boolean {
    if (this.networkType === NetworkType.TESTNET) {
      return constants.testnetValidatorAddressRegex.test(address);
    }
    return constants.mainnetValidatorAddressRegex.test(address);
  }

  /** @inheritdoc */
  isValidContractAddress(address: string): boolean {
    if (this.networkType === NetworkType.TESTNET) {
      return constants.testnetContractAddressRegex.test(address);
    }
    return constants.mainnetContractAddressRegex.test(address);
  }

  /** @inheritdoc */
  validateAmount(amount: Coin): void {
    const amountBig = BigNumber(amount.amount);
    if (amountBig.isLessThanOrEqualTo(0)) {
      throw new InvalidTransactionError('transactionBuilder: validateAmount: Invalid amount: ' + amount.amount);
    }
    if (!constants.validDenoms.find((denom) => denom === amount.denom)) {
      throw new InvalidTransactionError('transactionBuilder: validateAmount: Invalid denom: ' + amount.denom);
    }
  }
}

const hashUtils: CosmosUtils = new HashUtils();

export default hashUtils;
