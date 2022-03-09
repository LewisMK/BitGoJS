import { BuildTransactionError, InvalidParameterValueError } from '../../baseCoin/errors';
import { ContractCall } from '../contractCall';
import { decodeERC1155TransferData, isValidEthAddress, sendMultiSigData } from '../utils';
import {
  ERC1155BatchTransferTypes,
  ERC1155SafeTransferTypes,
  ERC1155BatchTransferTypeMethodId,
  ERC1155SafeTransferTypeMethodId,
} from '../walletUtil';
import { baseNFTTransferBuilder } from './baseNFTTransferBuilder';

export class ERC1155TransferBuilder extends baseNFTTransferBuilder {
  private _tokenIds: number[];
  private _values: number[];

  constructor(serializedData?: string) {
    super(serializedData);
    if (serializedData) {
      this.decodeTransferData(serializedData);
    } else {
      this._tokenIds = [];
      this._values = [];
    }
  }

  tokenContractAddress(address: string): ERC1155TransferBuilder {
    if (isValidEthAddress(address)) {
      this._tokenContractAddress = address;
      return this;
    }
    throw new InvalidParameterValueError('Invalid address');
  }

  entry(tokenId: number, value: number): ERC1155TransferBuilder {
    this._tokenIds.push(tokenId);
    this._values.push(value);
    return this;
  }

  signAndBuild(): string {
    const hasMandatoryFields = this.hasMandatoryFields();
    if (hasMandatoryFields) {
      if (this._tokenIds.length === 1) {
        const values = [this._fromAddress, this._toAddress, this._tokenIds[0], this._values[0], ''];
        const contractCall = new ContractCall(ERC1155SafeTransferTypeMethodId, ERC1155SafeTransferTypes, values);
        this._data = contractCall.serialize();
      } else {
        const values = [this._fromAddress, this._toAddress, this._tokenIds, this._values, ''];
        const contractCall = new ContractCall(ERC1155BatchTransferTypeMethodId, ERC1155BatchTransferTypes, values);
        this._data = contractCall.serialize();
      }

      return sendMultiSigData(
        this._tokenContractAddress,
        '0', // dummy amount value
        this._data,
        this._expirationTime,
        this._sequenceId,
        this.getSignature(),
      );
    }
    throw new BuildTransactionError(
      `Missing transfer mandatory fields. 
      Amount, destination (to) address, source (from) address, sequenceID, the token contract address, tokenIDs and their values are mandatory`,
    );
  }

  private hasMandatoryFields(): boolean {
    return (
      this._tokenIds !== undefined &&
      this._tokenIds.length !== 0 &&
      this._values.length !== 0 &&
      this._tokenIds.length === this._values.length &&
      this._toAddress != undefined &&
      this._fromAddress != undefined &&
      this._tokenContractAddress != undefined &&
      this._toAddress != undefined &&
      this._sequenceId != undefined
    );
  }
  private decodeTransferData(data: string): void {
    const transferData = decodeERC1155TransferData(data);
    this._toAddress = transferData.to;
    this._expirationTime = transferData.expireTime;
    this._sequenceId = transferData.sequenceId;
    this._signature = transferData.signature;
    this._tokenContractAddress = transferData.tokenContractAddress;
    this._tokenIds = transferData.tokenIds;
    this._values = transferData.values;
    if (transferData.data) {
      this._data = transferData.data;
    }
  }
}
