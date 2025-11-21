import React from 'react'
import { nativeCurrency, safeClone } from '..'
import { TData } from '../../components/Table'
import { add } from '../calc'
import { decodeJsonMemo } from '../format'

// sourse address and destination address is the same
// sometimes source tag is added to show the dapp
// so if there is no destintaion tag, no need the source tag to be the same
export const isConvertionTx = (specification) => {
  if (!specification) return false
  return (
    specification?.source?.address === specification?.destination?.address &&
    (specification?.source?.tag === specification?.destination?.tag || !specification?.destination?.tag)
  )
}

// Function to get balance changes for a specific address
const getBalanceChanges = (data, address) => {
  const balanceChange = data.filter((entry) => entry.address === address)
  return balanceChange[0]?.balanceChanges
}

export const addressBalanceChanges = (data, address) => {
  if (!data) return null
  const { outcome, specification } = data
  if (!outcome) return null
  let allSourceBalanceChanges = getBalanceChanges(outcome.balanceChanges, address)
  if (specification.source.address !== address) {
    // if address we looking for is not an executor, return as it is
    return allSourceBalanceChanges
  }
  // if address is an executor - check for the fee
  allSourceBalanceChanges = safeClone(allSourceBalanceChanges)
  let balanceChanges = []
  const fee = outcome.fee // string in nativeCurrency not drops
  for (let i = 0; i < allSourceBalanceChanges?.length; i++) {
    const change = allSourceBalanceChanges[i]
    if (!(change.currency === nativeCurrency && change.value === '-' + fee)) {
      if (change.currency === nativeCurrency) {
        change.value = add(change.value, fee)
      }
      balanceChanges.push(change)
    }
  }
  return balanceChanges
}

export const shortErrorCode = (code) => {
  // replace DST_TAG with Destination Tag
  code = code.replace('DST', 'Destination')
  code = code.replace('ENTRY', 'object')
  // remove first three characters from the error code
  // replace _ with space
  // make lower case
  code = code.slice(3).replace(/_/g, ' ').toLowerCase()
  // make the first letter in the string capital
  return code.charAt(0).toUpperCase() + code.slice(1)
}

export const errorCodeDescription = (code) => {
  const codes = {
    tecAMM_DIRECT_PAYMENT:
      'The transaction tried to send money directly to an AccountRoot object that is part of an Automated Market Maker (AMM) . AMM AccountRoot entries cannot send or receive money directly except through AMMWithdraw and AMMDeposit transactions.',
    tecAMM_EXISTS:
      'The AMMCreate transaction  tried to create an Automated Market Maker (AMM) instance that already exists. There can only be at most one AMM per unique currency pair.',
    tecAMM_FAILED_DEPOSIT:
      "The AMMDeposit transaction  failed, probably because the sender does not have enough of the specified assets, or because the deposit requested an effective price that isn't possible with the available amounts.",
    tecAMM_FAILED_WITHDRAW:
      "The AMMWithdraw transaction  failed, probably because the sender does not have enough LP Tokens, or because the withdraw requested an effective price that isn't possible with the available amounts.",
    tecAMM_FAILED_BID:
      "The AMMBid transaction  failed, probably because the price to win the auction was higher than the specified maximum value or the sender's current balance.",
    tecAMM_FAILED_VOTE:
      "The AMMVote transaction  failed, probably because there are already too many votes from accounts that hold more LP Tokens for this AMM. (This can still recalculate the AMM's trading fee.)",
    tecAMM_INVALID_TOKENS:
      'The AMM-related transaction  failed due to insufficient LP Tokens or problems with rounding; for example, depositing a very small amount of assets could fail if the amount of LP Tokens to be returned rounds down to zero.',
    tecCANT_ACCEPT_OWN_NFTOKEN_OFFER:
      'The transaction tried to accept an offer that was placed by the same account to buy or sell a non-fungible token.',
    tecCLAIM: 'Unspecified failure, with transaction cost destroyed.',
    tecCRYPTOCONDITION_ERROR:
      'This EscrowCreate or EscrowFinish transaction contained a malformed or mismatched crypto-condition.',
    tecDIR_FULL:
      "The transaction tried to add an object (such as a trust line, Check, Escrow, or Payment Channel) to an account's owner directory, but that account cannot own any more objects in the ledger.",
    tecDUPLICATE:
      'The transaction tried to create an object (such as a DepositPreauth authorization) that already exists.',
    tecDST_TAG_NEEDED:
      'The Payment transaction omitted a destination tag, but the destination account has the lsfRequireDestTag flag enabled.',
    tecEXPIRED:
      'The transaction tried to create an object (such as an Offer or a Check) whose provided Expiration time has already passed.',
    tecFAILED_PROCESSING: 'An unspecified error occurred when processing the transaction.',
    tecFROZEN:
      'The OfferCreate transaction failed because one or both of the assets involved are subject to a global freeze.',
    tecHAS_OBLIGATIONS:
      'The AccountDelete transaction failed because the account to be deleted owns objects that cannot be deleted. See Deletion of Accounts for details.',
    tecINSUF_RESERVE_LINE:
      'The transaction failed because the sending account does not have enough to create a new trust line. This error occurs when the counterparty already has a trust line in a non-default state to the sending account for the same currency.',
    tecINSUF_RESERVE_OFFER:
      'The transaction failed because the sending account does not have enough ' +
      nativeCurrency +
      ' to create a new Offer.',
    tecINSUFF_FEE:
      'The transaction failed because the sending account does not have enough ' +
      nativeCurrency +
      " to pay the transaction cost that it specified. (In this case, the transaction processing destroys all of the sender's " +
      nativeCurrency +
      " even though that amount is lower than the specified transaction cost.) This result only occurs if the account's balance decreases after this transaction has been distributed to enough of the network to be included in a consensus set. Otherwise, the transaction fails with terINSUF_FEE_B before being distributed.",
    tecINSUFFICIENT_FUNDS: 'One of the accounts involved does not hold enough of a necessary asset.',
    tecINSUFFICIENT_PAYMENT:
      'The amount specified is not enough to pay all fees involved in the transaction. For example, when trading a non-fungible token, the buy amount may not be enough to pay both the broker fee and the sell amount.',
    tecINSUFFICIENT_RESERVE:
      "The transaction would increase the reserve requirement higher than the sending account's balance.",
    tecINTERNAL:
      'Unspecified internal error, with transaction cost applied. This error code should not normally be returned. If you can reproduce this error, please report an issue .',
    tecINVARIANT_FAILED:
      'An invariant check failed when trying to execute this transaction. Added by the EnforceInvariants amendment. If you can reproduce this error, please report an issue .',
    tecKILLED:
      'Error occurs if the transaction specifies tfFillOrKill, and the full amount cannot be filled, it also occurs when the transaction specifies tfImmediateOrCancel and executes without moving funds.',
    tecMAX_SEQUENCE_REACHED:
      'A sequence number field is already at its maximum. This includes the MintedNFTokens field.',
    tecNEED_MASTER_KEY:
      'This transaction tried to cause changes that require the master key, such as disabling the master key or giving up the ability to freeze balances.',
    tecNFTOKEN_BUY_SELL_MISMATCH:
      'The NFTokenAcceptOffer transaction attempted to match incompatible offers to buy and sell a non-fungible token.',
    tecNFTOKEN_OFFER_TYPE_MISMATCH:
      'One or more of the offers specified in the transaction was not the right type of offer. (For example, a buy offer was specified in the NFTokenSellOffer field.)',
    tecNO_ALTERNATIVE_KEY:
      'The transaction tried to remove the only available method of authorizing transactions. This could be a SetRegularKey transaction to remove the regular key, a SignerListSet transaction to delete a SignerList, or an AccountSet transaction to disable the master key.',
    tecNO_AUTH:
      'The transaction failed because it needs to add a balance on a trust line to an account with the lsfRequireAuth flag enabled, and that trust line has not been authorized. If the trust line does not exist at all, tecNO_LINE occurs instead.',
    tecNO_DST:
      'The account on the receiving end of the transaction does not exist. This includes Payment and TrustSet transaction types. (It could be created if it received enough ' +
      nativeCurrency +
      '.)',
    tecNO_DST_INSUF_XRP:
      'The account on the receiving end of the transaction does not exist, and the transaction is not sending enough ' +
      nativeCurrency +
      ' to create it.',
    tecNO_ENTRY:
      'The transaction tried to modify a ledger object, such as a Check, Payment Channel, or Deposit Preauthorization, but the specified object does not exist. It may have already been deleted by a previous transaction or the transaction may have an incorrect value in an ID field such as CheckID, Channel, Unauthorize.',
    tecNO_ISSUER: 'The account specified in the issuer field of a currency amount does not exist.',
    tecNO_LINE:
      'The TakerPays field of the OfferCreate transaction specifies an asset whose issuer has lsfRequireAuth enabled, and the account making the offer does not have a trust line for that asset. (Normally, making an offer implicitly creates a trust line if necessary, but in this case it does not bother because you cannot hold the asset without authorization.) If the trust line exists, but is not authorized, tecNO_AUTH occurs instead.',
    tecNO_LINE_INSUF_RESERVE:
      'The transaction failed because the sending account does not have enough ' +
      nativeCurrency +
      ' to create a new trust line. This error occurs when the counterparty does not have a trust line to this account for the same currency.',
    tecNO_LINE_REDUNDANT:
      'The transaction failed because it tried to set a trust line to its default state, but the trust line did not exist.',
    tecNO_PERMISSION:
      'The sender does not have permission to do this operation. For example, the EscrowFinish transaction tried to release a held payment before its FinishAfter time, someone tried to use PaymentChannelFund on a channel the sender does not own, or a Payment tried to deliver funds to an account with the "DepositAuth" flag enabled.',
    tecNO_REGULAR_KEY:
      'The AccountSet transaction tried to disable the master key, but the account does not have another way to authorize transactions. If multi-signing is enabled, this code is deprecated and tecNO_ALTERNATIVE_KEY is used instead.',
    tecNO_SUITABLE_NFTOKEN_PAGE:
      'The transaction tried to mint or acquire a non-fungible token but the account receiving the NFToken does not have a directory page that can hold it. This situation is rare.',
    tecNO_TARGET:
      "The transaction referenced an Escrow or PayChannel ledger object that doesn't exist, either because it never existed or it has already been deleted. (For example, another EscrowFinish transaction has already executed the held payment.) Alternatively, the destination account has asfDisallowXRP set so it cannot be the destination of this PaymentChannelCreate or EscrowCreate transaction.",
    tecOBJECT_NOT_FOUND: 'One of the objects specified by this transaction did not exist in the ledger.',
    tecOVERSIZE:
      'This transaction could not be processed, because the server created an excessively large amount of metadata when it tried to apply the transaction.',
    tecOWNERS:
      'The transaction requires that account sending it has a nonzero "owners count", so the transaction cannot succeed. For example, an account cannot enable the lsfRequireAuth flag if it has any trust lines or available offers.',
    tecPATH_DRY:
      'The transaction failed because the provided paths did not have enough liquidity to send anything at all. This could mean that the source and destination accounts are not linked by trust lines.',
    tecPATH_PARTIAL:
      'The transaction failed because the provided paths did not have enough liquidity to send the full amount.',
    tecTOO_SOON:
      "The AccountDelete transaction failed because the account to be deleted had a Sequence number that is too high. The current ledger index must be at least 256 higher than the account's sequence number.",
    tecUNFUNDED:
      'The transaction failed because the account does not hold enough ' +
      nativeCurrency +
      ' to pay the amount in the transaction and satisfy the additional reserve necessary to execute this transaction.',
    tecUNFUNDED_AMM:
      'The AMMCreate transaction failed because the sender does not have enough of the specified assets to fund it.',
    tecUNFUNDED_PAYMENT:
      'The transaction failed because the sending account is trying to send more ' +
      nativeCurrency +
      ' than it holds, not counting the reserve.',
    tecUNFUNDED_OFFER:
      'The OfferCreate transaction failed because the account creating the offer does not have any of the TakerGets currency.',
    terINSUF_FEE_B:
      'The account sending the transaction does not have enough XRP to pay the Fee specified in the transaction.',
    terLAST: 'Used internally only. This code should never be returned.',
    terNO_ACCOUNT: 'The address sending the transaction is not funded in the ledger (yet).',
    terNO_AMM:
      'The AMM-related transaction specifies an asset pair that does not currently have an AMM instance. (Added by the AMM amendment)',
    terNO_AUTH:
      "The transaction would involve adding currency issued by an account with lsfRequireAuth enabled to a trust line that is not authorized. For example, you placed an offer to buy a currency you aren't authorized to hold.",
    terNO_LINE: 'Used internally only. This code should never be returned.',
    terNO_RIPPLE:
      "The transaction can't succeed because of rippling settings. For example, the transaction tried to create an AMM even though the issuer of at least one of the tokens has not enabled the Default Ripple flag.",
    terOWNERS:
      "The transaction requires that account sending it has a nonzero 'owners count', so the transaction cannot succeed. For example, an account cannot enable the lsfRequireAuth flag if it has any trust lines or available offers.",
    terPRE_SEQ:
      'The Sequence number of the current transaction is higher than the current sequence number of the account sending the transaction.',
    terPRE_TICKET:
      'The transaction attempted to use a Ticket, but the specified TicketSequence number does not exist in the ledger. However, the Ticket could still be created by another transaction.',
    terQUEUED:
      'The transaction met the load-scaled transaction cost but did not meet the open ledger requirement, so the transaction has been queued for a future ledger.',
    terRETRY: 'Unspecified retriable error.',
    terSUBMITTED: 'Transaction has been submitted, but not yet applied.',
    tefALREADY: 'The same exact transaction has already been applied.',
    tefBAD_ADD_AUTH: 'DEPRECATED.',
    tefBAD_AUTH:
      'The key used to sign this account is not authorized to modify this account. (It could be authorized if the account had the same key set as the Regular Key.)',
    tefBAD_AUTH_MASTER:
      'The single signature provided to authorize this transaction does not match the master key, but no regular key is associated with this address.',
    tefBAD_LEDGER:
      'While processing the transaction, the ledger was discovered in an unexpected state. If you can reproduce this error, please report an issue to get it fixed.',
    tefBAD_QUORUM:
      'The transaction was multi-signed, but the total weights of all included signatures did not meet the quorum.',
    tefBAD_SIGNATURE:
      'The transaction was multi-signed, but contained a signature for an address not part of a SignerList associated with the sending account.',
    tefCREATED: 'DEPRECATED.',
    tefEXCEPTION:
      'While processing the transaction, the server entered an unexpected state. This may be caused by unexpected inputs, for example if the binary data for the transaction is grossly malformed. If you can reproduce this error, please report an issue to get it fixed.',
    tefFAILURE: 'Unspecified failure in applying the transaction.',
    tefINTERNAL:
      'When trying to apply the transaction, the server entered an unexpected state. If you can reproduce this error, please report an issue to get it fixed.',
    tefINVARIANT_FAILED:
      'An invariant check failed when trying to claim the transaction cost. Added by the EnforceInvariants amendment. If you can reproduce this error, please report an issue.',
    tefMASTER_DISABLED:
      "The transaction was signed with the account's master key, but the account has the lsfDisableMaster field set.",
    tefMAX_LEDGER:
      "The transaction included a LastLedgerSequence parameter, but the current ledger's sequence number is already higher than the specified value.",
    tefNFTOKEN_IS_NOT_TRANSFERABLE:
      'The transaction attempted to send a non-fungible token to another account, but the NFToken has the lsfTransferable flag disabled and the transfer would not be to or from the issuer. (Added by the NonFungibleTokensV1_1 amendment.)',
    tefNO_AUTH_REQUIRED:
      'The TrustSet transaction tried to mark a trust line as authorized, but the lsfRequireAuth flag is not enabled for the corresponding account, so authorization is not necessary.',
    tefNO_TICKET:
      "The transaction attempted to use a Ticket, but the specified TicketSequence number does not exist in the ledger, and cannot be created in the future because it is earlier than the sender's current sequence number.",
    tefNOT_MULTI_SIGNING: 'The transaction was multi-signed, but the sending account has no SignerList defined.',
    tefPAST_SEQ:
      'The sequence number of the transaction is lower than the current sequence number of the account sending the transaction.',
    tefTOO_BIG:
      'The transaction would affect too many objects in the ledger. For example, this was an AccountDelete transaction but the account to be deleted owns over 1000 objects in the ledger.',
    tefWRONG_PRIOR:
      "The transaction contained an AccountTxnID field (or the deprecated PreviousTxnID field), but the transaction specified there does not match the account's previous transaction.",
    temBAD_AMM_TOKENS:
      "The transaction incorrectly specified one or more assets. For example, the asset's issuer does not match the corresponding asset in the AMM's pool, or the transaction specified the same asset twice.",
    temBAD_AMOUNT:
      'An amount specified by the transaction (for example the destination Amount or SendMax values of a Payment) was invalid, possibly because it was a negative number.',
    temBAD_AUTH_MASTER:
      'The key used to sign this transaction does not match the master key for the account sending it, and the account does not have a Regular Key set.',
    temBAD_CURRENCY: 'The transaction improperly specified a currency field.',
    temBAD_EXPIRATION:
      'The transaction improperly specified an expiration value, or did not specify a required expiration value.',
    temBAD_FEE:
      'The transaction improperly specified its Fee value, for example by listing a non-XRP currency or some negative amount of XRP.',
    temBAD_ISSUER: 'The transaction improperly specified the issuer field of some currency included in the request.',
    temBAD_LIMIT: 'The TrustSet transaction improperly specified the LimitAmount value of a trust line.',
    temBAD_NFTOKEN_TRANSFER_FEE:
      'The NFTokenMint transaction improperly specified the TransferFee field of the transaction.',
    temBAD_OFFER:
      'The OfferCreate transaction specifies an invalid offer, such as offering to trade XRP for itself, or offering a negative amount.',
    temBAD_PATH:
      'The Payment transaction specifies one or more Paths improperly, for example including an issuer for XRP, or specifying an account differently.',
    temBAD_PATH_LOOP:
      'One of the Paths in the Payment transaction was flagged as a loop, so it cannot be processed in a bounded amount of time.',
    temBAD_SEND_XRP_LIMIT:
      'The Payment transaction used the tfLimitQuality flag in a direct XRP-to-XRP payment, even though XRP-to-XRP payments do not involve any conversions.',
    temBAD_SEND_XRP_MAX:
      'The Payment transaction included a SendMax field in a direct XRP-to-XRP payment, even though sending XRP should never require SendMax.',
    temBAD_SEND_XRP_NO_DIRECT:
      'The Payment transaction used the tfNoDirectRipple flag for a direct XRP-to-XRP payment, even though XRP-to-XRP payments are always direct.',
    temBAD_SEND_XRP_PARTIAL:
      'The Payment transaction used the tfPartialPayment flag for a direct XRP-to-XRP payment, even though XRP-to-XRP payments should always deliver the full amount.',
    temBAD_SEND_XRP_PATHS:
      'The Payment transaction included Paths while sending XRP, even though XRP-to-XRP payments should always be direct.',
    temBAD_SEQUENCE:
      'The transaction references a sequence number that is higher than its own Sequence number, for example trying to cancel an offer that would have to be placed after the transaction that cancels it.',
    temBAD_SIGNATURE: 'The signature to authorize this transaction is either missing or improperly formed.',
    temBAD_SRC_ACCOUNT:
      'The Account on whose behalf this transaction is being sent is not a properly-formed account address.',
    temBAD_TRANSFER_RATE:
      'The TransferRate field of an AccountSet transaction is not properly formatted or is out of the acceptable range.',
    temCANNOT_PREAUTH_SELF:
      'The sender of the DepositPreauth transaction was also specified as the account to preauthorize. You cannot preauthorize yourself.',
    temDST_IS_SRC: 'The transaction improperly specified a destination address as the Account sending the transaction.',
    temDST_NEEDED: 'The transaction improperly omitted a destination.',
    temINVALID: 'The transaction is otherwise invalid, for example incorrect transaction ID or malformed signature.',
    temINVALID_COUNT: 'The transaction includes a TicketCount field, but the number of Tickets specified is invalid.',
    temINVALID_FLAG:
      'The transaction includes a Flag that does not exist, or includes a contradictory combination of flags.',
    temMALFORMED: 'Unspecified problem with the format of the transaction.',
    temREDUNDANT: 'The transaction would do nothing, for example sending a payment to the same account.',
    temREDUNDANT_SEND_MAX: 'Removed in: rippled 0.28.0.',
    temRIPPLE_EMPTY:
      'The Payment transaction includes an empty Paths field, but paths are necessary to complete this payment.',
    temSEQ_AND_TICKET:
      'The transaction contains both a TicketSequence field and a non-zero Sequence value, which is not allowed.',
    temBAD_WEIGHT:
      'The SignerListSet transaction includes a SignerWeight that is invalid, for example a zero or negative value.',
    temBAD_SIGNER:
      'The SignerListSet transaction includes a signer who is invalid, for example duplicate entries or the owner of the SignerList also being a member.',
    temBAD_QUORUM: 'The SignerListSet transaction has an invalid SignerQuorum value.',
    temUNCERTAIN: 'Used internally only. This code should never be returned.',
    temUNKNOWN: 'Used internally only. This code should never be returned.',
    temDISABLED:
      'The transaction requires logic that is disabled, typically meaning an amendment is not enabled for the current ledger.'
  }
  return codes[code] || code
}

export const dappBySourceTag = (sourceTag) => {
  if (!sourceTag) return null
  const dapps = {
    16: 'UniversalNFT.dev',
    999999: 'Loansnap',
    1060223: 'Epic Task',
    5042137: 'conFIEL',
    5523279: 'Things Go Online',
    10000001: 'MetaTV',
    10011001: 'Myrkle',
    10102021: 'Junction',
    10509910: 'xLux',
    11782013: 'Anodos',
    13888813: 'Zerpmon',
    14655641: 'X-Tokenize',
    19089388: 'Hummingbot',
    20120513: 'BPM Wallet',
    20220613: 'DalliPay',
    20221212: 'XPMarket',
    22222222: 'EQLX',
    24289778: 'ChatXRP',
    24546893: 'DeXfi',
    25853696: 'Grand Retail Chain (GRAIL)',
    27116776: 'Crossmark',
    27802770: 'XRPL AI Signals by Liisa',
    28041992: 'Crypto Shop',
    29041995: 'Amped Studio',
    37373737: 'HexTrust Custodian Wallet',
    38887387: 'Futureverse',
    42157396: 'BRLA',
    42697468: 'Bithomp',
    46350430: 'Meld Gold',
    48151623: 'XRPL Dash',
    48484848: 'AMY DAO',
    52809917: 'Credefi Finance',
    54576093: 'Tugela',
    55074236: 'zazema',
    55555555: 'TheShillverse',
    60006000: 'Moai Fianance',
    62423574: 'VNX Stablecoins on the XRPL',
    66666666: 'XRP Carbon Offset Toolkit',
    69420589: 'onXRP',
    70000003: 'Axone Universe',
    72587259: 'Fieldboss NFT',
    75437338: 'NGNC',
    75856879: 'Kudos Setler',
    77777777: 'Giving Universe / Center for Collaborative Economics',
    80008000: 'Orchestra Finance',
    81818181: 'Cornermarket',
    83788309: 'OpenEden',
    83834545: 'D3',
    84190958: 'Multiverse Wallet',
    88122188: 'Breezepay',
    88807279: 'XRPhone',
    88888888: 'Mintable',
    88990334: 'VWBL',
    89898989: 'zkLend',
    99819001: 'HubSecure',
    99994200: 'Cryptum',
    99999420: 'Cryptum',
    101102979: 'xrp.cafe',
    110100111: 'Sologenic',
    115102100: 'Web3 Enabler, Inc.',
    211211211: 'Ethernity',
    223366889: 'FLUIDEFI InstiLink',
    246896201: 'Food Trust Simulator',
    247645524: 'Frii World',
    255192015: 'XRPLCoins',
    271717272: 'Amora',
    280957156: 'Dhali - Tokenized API Marketplace',
    310428004: 'Scratch2Hooks (Blockly2Hooks)',
    353353353: 'ProprHome',
    358132134: 'XSGD Stablecoin',
    369333333: 'Feeturre',
    369369369: 'Carbonland Trust',
    418078113: 'Credefi',
    510162502: 'Sonar Muse',
    512512512: 'PetProof',
    544841000: 'Thallo Two-Way Carbon Bridge',
    567567567: 'StaykX',
    589589589: 'Guardians of the Reefs',
    658879330: 'Filedgr',
    666999666: 'TKTZ',
    719719719: 'Wallery.me',
    732946831: 'Lightsource Games (XRPL4GD)',
    744925538: 'Phi Wallet',
    902978157: 'Poof XRPL Payments',
    936618804: 'RandX',
    999999007: 'MetaCarbon',
    1160305145: 'Ap0cene',
    2310819306: 'Indicator Success Rate',
    2323232323: 'Chimoney (Unispend)'
  }
  //max sourceTag is 4294967295, more than that are invalid.
  return dapps[sourceTag] || null
}

export const memoNode = (memos, type = 'tr') => {
  let output = []
  if (memos && Array.isArray(memos)) {
    for (let j = 0; j < memos.length; j++) {
      const memo = memos[j]
      let memotype = memo?.type
      let memopiece = memo?.data
      let memoformat = memo?.format

      if (memopiece?.toString().toLowerCase().includes('airdrop') && type !== 'tr') {
        continue
      }

      if (!memopiece && memoformat?.slice(0, 2) === 'rt') {
        memopiece = memoformat
      }

      let clientname = ''

      if (memopiece) {
        if (memopiece.includes('xrplexplorer.com') || memopiece.includes('bithomp.com')) {
          clientname = memopiece.replace(/xrplexplorer\.com/g, 'bithomp.com')
          memopiece = ''
        }

        if (memopiece.includes('xahauexplorer.com')) {
          clientname = memopiece
          memopiece = ''
        }

        if (memotype) {
          if (memotype.slice(0, 25) === '[https://xumm.community]-') {
            memotype = memotype.slice(25)
            clientname = 'xumm.community'
          } else if (memotype.slice(0, 24) === '[https://xrpl.services]-') {
            memotype = memotype.slice(24)
            clientname = 'xrpl.services'
          } else {
            memotype = memotype.charAt(0).toUpperCase() + memotype.slice(1)
          }
        }

        if (decodeJsonMemo(memopiece)) {
          if (type === 'tr') {
            output.push(
              <tr key={'a2' + j}>
                <TData>Memo {memos.length > 1 ? j + 1 : ''}</TData>
                <TData>
                  {memotype && (
                    <>
                      {memotype}
                      <br />
                    </>
                  )}
                  {decodeJsonMemo(memopiece)}
                </TData>
              </tr>
            )
          } else {
            output.push(
              <React.Fragment key={'a2' + j}>
                Memo {memos.length > 1 ? j + 1 : ''}:
                <br />
                {memotype && (
                  <>
                    <strong>{memotype}</strong>
                    <br />
                  </>
                )}
                {decodeJsonMemo(memopiece)}
                <br />
              </React.Fragment>
            )
          }
        } else {
          if (memopiece.length > 100 && memopiece.split(' ').length === 1 && memopiece.includes('.')) {
            //jwt
            memopiece = memopiece.replace('"', '')
            const pieces = memopiece.split('.')
            if (type === 'tr') {
              output.push(
                <React.Fragment key={'jwt' + j}>
                  <tr>
                    <TData>JWT Header</TData>
                    <TData>{decodeJsonMemo(pieces[0], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>JWT Payload</TData>
                    <TData>{decodeJsonMemo(pieces[1], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>JWT Signature</TData>
                    <TData>
                      <pre>{pieces[2]}</pre>
                    </TData>
                  </tr>
                </React.Fragment>
              )
            } else {
              output.push(
                <React.Fragment key={'jwt' + j}>
                  JWT Header:
                  <br />
                  {decodeJsonMemo(pieces[0], { code: 'base64' })}
                  <br />
                  JWT Payload:
                  <br />
                  {decodeJsonMemo(pieces[1], { code: 'base64' })}
                  <br />
                  JWT Signature:
                  <br />
                  <pre>{pieces[2]}</pre>
                  <br />
                </React.Fragment>
              )
            }
          } else {
            if (memopiece) {
              if (type === 'tr') {
                output.push(
                  <tr key={'a1' + j}>
                    <TData>Memo {memos.length > 1 ? j + 1 : ''}</TData>
                    <TData>
                      {memotype && memotype.toLowerCase() !== 'memo' && (
                        <span className="bold">
                          {memotype}
                          <br />
                        </span>
                      )}
                      {memopiece}
                    </TData>
                  </tr>
                )
              } else {
                output.push(
                  <React.Fragment key={'a1' + j}>
                    Memo {memos.length > 1 ? j + 1 : ''}:{' '}
                    {memotype && memotype.toLowerCase() !== 'memo' && <>{memotype + ': '}</>}
                    {memopiece}
                    <br />
                  </React.Fragment>
                )
              }
            }
          }
        }

        if (clientname) {
          if (type === 'tr') {
            output.push(
              <tr key="a3">
                <TData>Client web</TData>
                <TData>
                  <a href={'https://' + clientname} rel="nofollow">
                    {clientname}
                  </a>
                </TData>
              </tr>
            )
          } else {
            output.push(
              <React.Fragment key="a3">
                Client web:{' '}
                <a href={'https://' + clientname} rel="nofollow">
                  {clientname}
                </a>
                <br />
              </React.Fragment>
            )
          }
        }
      }
    }
  }
  if (output.length === 0) {
    return null
  }
  return output
}
