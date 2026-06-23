import React from 'react'
import { nativeCurrency, safeClone } from '..'
import { TData } from '../../components/Table'
import { add } from '../calc'
import { decodeJsonMemo } from '../format'
import { FaLink, FaUserShield } from 'react-icons/fa6'
import { FaRegHandPaper, FaMoneyCheckAlt } from 'react-icons/fa'
import {
  MdArrowDownward,
  MdArrowUpward,
  MdCompareArrows,
  MdDeleteSweep,
  MdPool,
  MdSend,
  MdSwapVert
} from 'react-icons/md'
import { BsFillSafeFill } from 'react-icons/bs'
import { CiSettings } from 'react-icons/ci'
import { FiDownload, FiKey } from 'react-icons/fi'
import { GiKeyring, GiPassport } from 'react-icons/gi'
import { LuFileCheck2 } from 'react-icons/lu'
import { RiNftFill } from 'react-icons/ri'

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
  if (!data || !address) return null
  const balanceChange = data.filter((entry) => entry.address === address)
  return balanceChange[0]?.balanceChanges
}

export const addressBalanceChanges = (data, address) => {
  if (!data) return null
  const { outcome, specification } = data
  if (!outcome) return null
  let allSourceBalanceChanges = getBalanceChanges(outcome.balanceChanges, address)
  if (specification?.source?.address !== address) {
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

const TRANSACTION_TYPE_LABELS = {
  Payment: 'Payment',
  AccountSet: 'Account settings update',
  AccountDelete: 'Account deletion',
  DIDSet: 'DID set',
  DIDDelete: 'DID removal',
  SetRegularKey: 'Set regular key',
  SignerListSet: 'Signer list set',
  TrustSet: 'Trust line set',
  OfferCreate: 'Offer creation',
  OfferCancel: 'Offer cancellation',
  TicketCreate: 'Ticket creation',
  DepositPreauth: 'Deposit preauthorization',

  EscrowCreate: 'Escrow creation',
  EscrowFinish: 'Escrow finish',
  EscrowCancel: 'Escrow cancellation',

  CheckCreate: 'Check creation',
  CheckCash: 'Check cashing',
  CheckCancel: 'Check cancellation',

  PaymentChannelCreate: 'Payment channel creation',
  PaymentChannelFund: 'Payment channel funding',
  PaymentChannelClaim: 'Payment channel claim',

  NFTokenMint: 'NFT mint',
  NFTokenBurn: 'NFT burn',
  NFTokenCreateOffer: 'NFT offer creation',
  NFTokenCancelOffer: 'NFT offer cancellation',
  NFTokenAcceptOffer: 'NFT offer acceptance',
  NFTokenModify: 'NFT modification',

  AMMCreate: 'AMM creation',
  AMMDeposit: 'AMM deposit',
  AMMWithdraw: 'AMM withdrawal',
  AMMVote: 'AMM vote',
  AMMBid: 'AMM bid',
  AMMDelete: 'AMM deletion',
  AMMClawback: 'AMM clawback',

  EnableAmendment: 'Enable amendment',
  SetFee: 'Set fee',
  UNLModify: 'UNL modification',
  Clawback: 'Clawback',

  XChainCreateBridge: 'Cross-chain bridge creation',
  XChainModifyBridge: 'Cross-chain bridge modification',
  XChainClaim: 'Cross-chain claim',
  XChainCommit: 'Cross-chain commit',
  XChainAddAccountCreateAttestation: 'Cross-chain account-create attestation',
  XChainAddClaimAttestation: 'Cross-chain claim attestation',
  XChainAccountCreateCommit: 'Cross-chain account-create commit'
}

export const getTransactionTypeLabel = (type) => {
  if (!type) return '-'
  return TRANSACTION_TYPE_LABELS[type] || type
}

export const getUNLModifyDetails = (data) => {
  const isNegativeUNL = data?.specification?.nUNL
  const added = typeof isNegativeUNL === 'boolean' ? isNegativeUNL : Number(data?.tx?.UNLModifyDisabling) === 1
  const validatorDetails = data?.specification?.validatorDetails || data?.validatorDetails || null
  const validatorKey =
    data?.specification?.publicKey ||
    validatorDetails?.publicKey ||
    data?.tx?.UNLModifyValidator ||
    data?.specification?.PublicKey
  const serverVersion = validatorDetails?.serverVersion || validatorDetails?.server_version

  return {
    added,
    action: added ? 'added to' : 'removed from',
    actionText: `Validator was ${added ? 'added to' : 'removed from'} the Negative UNL (nUNL)`,
    validatorDetails,
    validatorKey,
    serverVersion
  }
}

export const getAccountTransactionTypeIcon = ({
  txType,
  isSource,
  isRipplingPayment,
  isSelfPayment,
  isAccountDeleteTx,
  isAmmTx,
  nftViewerRole
}) => {
  const iconStyle = { fontSize: 16 }

  if (isAccountDeleteTx) {
    return <MdDeleteSweep style={{ ...iconStyle, color: '#111' }} title="Account removed" />
  }

  if (isRipplingPayment) {
    return <MdCompareArrows style={{ ...iconStyle, color: '#9b59b6', transform: 'rotate(90deg)' }} title="Rippling" />
  }

  if (isSelfPayment) {
    return <MdSwapVert style={{ ...iconStyle, color: '#2980ef' }} title="Swap" />
  }

  if (txType === 'Payment') {
    return isSource ? (
      <MdArrowUpward style={{ ...iconStyle, color: '#e74c3c' }} title="Sent payment" />
    ) : (
      <MdArrowDownward style={{ ...iconStyle, color: '#27ae60' }} title="Received payment" />
    )
  }

  if (txType === 'AccountSet') {
    return <CiSettings style={{ ...iconStyle, color: '#888' }} title="Account settings" />
  }

  if (txType === 'SetRegularKey') {
    return <FiKey style={{ ...iconStyle, color: '#9b59b6' }} title="Set Regular Key" />
  }

  if (txType === 'SignerListSet') {
    return <GiKeyring style={{ ...iconStyle, color: '#9b59b6' }} title="Signer List Set" />
  }

  if (txType === 'DelegateSet') {
    return <FaUserShield style={{ ...iconStyle, color: '#1abc9c' }} title="Delegate Set" />
  }

  if (txType?.includes('Check')) {
    return <FaMoneyCheckAlt style={{ ...iconStyle, color: '#27ae60' }} title="Check" />
  }

  if (txType?.includes('Escrow')) {
    return <BsFillSafeFill style={{ ...iconStyle, color: '#2980ef' }} title="Escrow" />
  }

  if (isAmmTx) {
    const ammColor =
      txType === 'AMMDeposit'
        ? '#e74c3c'
        : txType === 'AMMWithdraw'
          ? '#27ae60'
          : txType === 'AMMVote'
            ? '#9b59b6'
            : '#2980ef'
    return <MdPool style={{ ...iconStyle, color: ammColor }} title={txType} />
  }

  if (txType === 'OfferCancel') {
    return <FaRegHandPaper style={{ ...iconStyle, color: '#e74c3c' }} title="Offer canceled" />
  }

  if (txType === 'OfferCreate') {
    return <MdCompareArrows style={{ ...iconStyle, color: '#2980ef' }} title="Offer" />
  }

  if (txType?.includes('NFToken')) {
    const isNftBuyer = nftViewerRole === 'buyer'
    const isNftSeller = nftViewerRole === 'seller'
    const nftColor =
      txType === 'NFTokenBurn'
        ? '#222'
        : txType === 'NFTokenAcceptOffer'
          ? isNftBuyer
            ? '#27ae60'
            : isNftSeller
              ? '#e74c3c'
              : isSource
                ? '#e74c3c'
                : '#27ae60'
          : txType === 'NFTokenCancelOffer'
            ? '#ff9800'
            : '#9b59b6'
    const nftTitle =
      txType === 'NFTokenAcceptOffer' ? (isNftBuyer ? 'Received NFT' : isNftSeller ? 'Sent NFT' : 'NFT') : 'NFT'
    return <RiNftFill style={{ ...iconStyle, color: nftColor }} title={nftTitle} />
  }

  if (txType?.includes('DID')) {
    return <GiPassport style={{ ...iconStyle, color: '#2980ef' }} title="DID" />
  }

  if (txType?.includes('URIToken')) {
    return <FaLink style={{ ...iconStyle, color: '#2980ef' }} title="URI Token" />
  }

  if (txType === 'Import') {
    return <FiDownload style={{ ...iconStyle, color: '#27ae60' }} title="Import" />
  }

  if (txType === 'Remit') {
    return <MdSend style={{ ...iconStyle, color: '#e67e22' }} title="Remit" />
  }

  if (txType === 'EnableAmendment') {
    return <LuFileCheck2 style={{ ...iconStyle, color: '#2980ef' }} title="Enable Amendment" />
  }

  if (txType === 'UNLModify') {
    return <FaUserShield style={{ ...iconStyle, color: '#2980ef' }} title="UNL Modified" />
  }

  return null
}

export { errorCodeDescription, fallbackErrorCodeDescription } from './errorCodes'

//https://view.ponedelnik.com/4652017081-75a4eea34dfa9b083a4f0c0d5b901530?r=use1
export const dappBySourceTag = (sourceTag) => {
  if (!sourceTag) return null
  const dapps = {
    16: 'UniversalNFT.dev',
    111: 'Horizon',
    101010: 'HEROES-exchange',
    508090: 'XRP Deals',
    589123: 'Katz Wallet',
    999999: 'Loansnap',
    1060223: 'Epic Task',
    1739300: 'Styngr',
    5042137: 'conFIEL',
    5523279: 'Things Go Online',
    10000001: 'MetaTV',
    10011001: 'Myrkle',
    10011010: 'Magnetic',
    //10102021: 'Junction', // no info
    10509910: 'xLux',
    11782013: 'Anodos',
    13888813: 'Zerpmon',
    14655641: 'X-Tokenize',
    19089388: 'Hummingbot',
    20102305: 'OpulenceX',
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
    30033003: 'Calypso wallet',
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
    69420589: 'bidds',
    70000003: 'Axone Universe',
    72587259: 'Fieldboss NFT',
    74920348: 'First Ledger',
    75437338: 'NGNC',
    75856879: 'Kudos Setler',
    77777777: 'Giving Universe',
    79455288: 'QuantZilla Developer Console',
    80008000: 'Orchestra Finance',
    81818181: 'Cornermarket',
    83788309: 'OpenEden',
    83834545: 'D3',
    84190958: 'Multiverse Wallet',
    88122188: 'Breezepay',
    88807279: 'XRPPhone',
    88888888: 'Mintable',
    88990334: 'VWBL',
    89898989: 'Axelar Bridge',
    99819001: 'HubSecure',
    99994200: 'Cryptum',
    99999420: 'Cryptum',
    100010010: 'StaticBit',
    101102979: 'xrp.cafe',
    110100111: 'Sologenic',
    115102100: 'Web3 Enabler, Inc.',
    122131125: 'LuckyHash',
    211211211: 'Ethernity',
    223366889: 'FLUIDEFI InstiLink',
    246896201: 'Food Trust Simulator',
    247645524: 'Frii World',
    255192015: 'XRPLCoins',
    271717272: 'Amora',
    280957156: 'Dhali',
    310428004: 'Scratch2Hooks (Blockly2Hooks)',
    353353353: 'ProprHome',
    358132134: 'XSGD Stablecoin',
    369333333: 'Feetture',
    369369369: 'Carbonland Trust',
    418078113: 'Credefi',
    494456745: 'Aigent', // aigent.run
    510162502: 'Sonar Muse',
    512512512: 'PetProof',
    524942424: 'Ribble Trading Bot', //@ribble_trading_bot on Telegram
    544841000: 'Thallo Two-Way Carbon Bridge',
    567567567: 'StaykX',
    589141516: 'DragonKill.online',
    589589589: 'Guardians of the Reefs',
    658879330: 'Filedgr',
    666999666: 'TKTZ',
    690321814: 'Gatehub bridge',
    719719719: 'Wallery.me',
    732946831: 'Lightsource Games (XRPL4GD)',
    744925538: 'Phi Wallet',
    902978157: 'Poof XRPL Payments',
    936618804: 'RandX',
    999999007: 'MetaCarbon',
    1160305145: 'Ap0cene',
    1741383633: 'Trust wallet', // timestamp 7 March 2025, 21:40:33 UTC
    2310819306: 'Indicator Success Rate',
    2323232323: 'Chimoney & Unispend' //23232323236 is invalid tag
  }
  //max sourceTag is 4294967295, more than that are invalid.
  return dapps[sourceTag] || null
}

export const memoNode = (memos, type = 'tr', options = {}) => {
  let output = []
  const showOnlyHiddenMemos = type === 'additional'
  const label = (value) => {
    if (value === 'Memo') return options?.memoLabel || value
    return options?.labels?.[value] || (options?.label ? options.label(value) : value)
  }
  const renderDetailRow = (key, label, content, alignTop = false) => (
    <div key={key} className={'detail-row' + (alignTop ? ' tx-detail-change-row' : '')}>
      <span>{label}</span>
      <span>{content}</span>
    </div>
  )

  const normalizeMemo = (memo) => {
    let memotype = memo?.type
    let memopiece = memo?.data
    let memoformat = memo?.format
    let hiddenMemoPiece = null
    const hadMemoPiece = Boolean(memopiece)

    const redFlags = ['airdrop', 'claim', 'reward', 'giveaway']
    const memop = memopiece?.toString().toLowerCase() || ''

    if (redFlags.some((flag) => memop.includes(flag))) {
      if (type === 'tr') {
        memopiece = memop.replace(
          /\b(https?:\/\/\S+|www\.\S+|[a-z0-9-]+\.(com|net|org|io|xyz|site|app|info|biz|ru|de|fr|es|co)(\/\S*)?)\b/gi,
          '***hidden url***'
        )
      } else {
        return { skip: true }
      }
    }

    if (!memopiece && memoformat?.slice(0, 2) === 'rt') {
      memopiece = memoformat
    }

    let clientname = ''

    if (memopiece) {
      if (memopiece.includes('xrplexplorer.com') || memopiece.includes('bithomp.com')) {
        // keep it for testnetworks
        hiddenMemoPiece = memopiece
        clientname = memopiece.replace(/xrplexplorer\.com/g, 'bithomp.com')
        if (memopiece.includes(' faucet')) {
          clientname = memopiece.replace(' faucet', '/faucet')
        }
        memopiece = ''
      } else if (memopiece.includes('xahauexplorer.com')) {
        hiddenMemoPiece = memopiece
        clientname = memopiece
        if (memopiece.includes(' faucet')) {
          clientname = memopiece.replace(' faucet', '/faucet')
        }
        memopiece = ''
      } else if (memopiece.includes('initiated via xmagnetic.org')) {
        hiddenMemoPiece = memopiece
        clientname = 'xmagnetic.org'
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
    }

    return { memotype, memopiece, hiddenMemoPiece, clientname, hadMemoPiece, skip: false }
  }

  const isJwtMemo = (memopiece) =>
    memopiece?.length > 100 && memopiece.split(' ').length === 1 && memopiece.includes('.')

  const shouldRenderMemoLabel = (normalizedMemo) => {
    if (!normalizedMemo || normalizedMemo.skip) return false
    if (showOnlyHiddenMemos) return Boolean(normalizedMemo.hiddenMemoPiece)
    if (!normalizedMemo.memopiece) return false
    return !isJwtMemo(normalizedMemo.memopiece)
  }

  if (memos && Array.isArray(memos)) {
    const normalizedMemos = memos.map(normalizeMemo)
    const memoLabelTotal = normalizedMemos.filter(shouldRenderMemoLabel).length
    let memoLabelIndex = 0

    const getMemoLabel = () => {
      memoLabelIndex += 1
      return memoLabelTotal > 1 ? label('Memo') + ' ' + memoLabelIndex : label('Memo')
    }

    for (let j = 0; j < normalizedMemos.length; j++) {
      const normalizedMemo = normalizedMemos[j]
      if (normalizedMemo.skip) {
        continue
      }

      let { memotype, memopiece, hiddenMemoPiece, clientname, hadMemoPiece } = normalizedMemo

      if (hadMemoPiece) {
        if (showOnlyHiddenMemos) {
          if (hiddenMemoPiece) {
            const memoLabel = getMemoLabel()
            output.push(
              <tr key={'ah' + j}>
                <TData>{memoLabel}</TData>
                <TData>
                  {memotype && memotype.toLowerCase() !== 'memo' && (
                    <span className="bold">
                      {memotype}
                      <br />
                    </span>
                  )}
                  {hiddenMemoPiece}
                </TData>
              </tr>
            )
          }
        } else if (decodeJsonMemo(memopiece)) {
          const decodedMemo = decodeJsonMemo(memopiece)
          const memoLabel = getMemoLabel()
          if (type === 'tr') {
            output.push(
              <tr key={'a2' + j}>
                <TData>{memoLabel}</TData>
                <TData>
                  {memotype && (
                    <>
                      {memotype}
                      <br />
                    </>
                  )}
                  {decodedMemo}
                </TData>
              </tr>
            )
          } else if (type === 'detail') {
            output.push(
              renderDetailRow(
                'a2' + j,
                memoLabel + ':',
                <span className="brake">
                  {memotype && (
                    <>
                      <span className="bold">{memotype}</span>
                      <br />
                    </>
                  )}
                  {decodedMemo}
                </span>,
                true
              )
            )
          } else {
            output.push(
              <React.Fragment key={'a2' + j}>
                {memoLabel}:
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
                    <TData>{label('JWT Header')}</TData>
                    <TData>{decodeJsonMemo(pieces[0], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>{label('JWT Payload')}</TData>
                    <TData>{decodeJsonMemo(pieces[1], { code: 'base64' })}</TData>
                  </tr>
                  <tr>
                    <TData>{label('JWT Signature')}</TData>
                    <TData>
                      <pre>{pieces[2]}</pre>
                    </TData>
                  </tr>
                </React.Fragment>
              )
            } else if (type === 'detail') {
              output.push(
                <React.Fragment key={'jwt' + j}>
                  {renderDetailRow(
                    'jwt-h-' + j,
                    label('JWT Header') + ':',
                    <span className="brake">{decodeJsonMemo(pieces[0], { code: 'base64' })}</span>,
                    true
                  )}
                  {renderDetailRow(
                    'jwt-p-' + j,
                    label('JWT Payload') + ':',
                    <span className="brake">{decodeJsonMemo(pieces[1], { code: 'base64' })}</span>,
                    true
                  )}
                  {renderDetailRow(
                    'jwt-s-' + j,
                    label('JWT Signature') + ':',
                    <span className="brake">
                      <pre>{pieces[2]}</pre>
                    </span>,
                    true
                  )}
                </React.Fragment>
              )
            } else {
              output.push(
                <React.Fragment key={'jwt' + j}>
                  {label('JWT Header')}:
                  <br />
                  {decodeJsonMemo(pieces[0], { code: 'base64' })}
                  <br />
                  {label('JWT Payload')}:
                  <br />
                  {decodeJsonMemo(pieces[1], { code: 'base64' })}
                  <br />
                  {label('JWT Signature')}:
                  <br />
                  <pre>{pieces[2]}</pre>
                  <br />
                </React.Fragment>
              )
            }
          } else {
            if (memopiece) {
              if (type === 'tr') {
                const memoLabel = getMemoLabel()
                output.push(
                  <tr key={'a1' + j}>
                    <TData>{memoLabel}</TData>
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
              } else if (type === 'detail') {
                const memoLabel = getMemoLabel()
                output.push(
                  renderDetailRow(
                    'a1' + j,
                    memoLabel + ':',
                    <span className="brake">
                      {memotype && memotype.toLowerCase() !== 'memo' && (
                        <>
                          <span className="bold">{memotype}</span>
                          <br />
                        </>
                      )}
                      {memopiece}
                    </span>,
                    true
                  )
                )
              } else {
                const memoLabel = getMemoLabel()
                output.push(
                  <span key={'a1' + j} className="brake">
                    {memoLabel}: {memotype && memotype.toLowerCase() !== 'memo' && <>{memotype + ': '}</>}
                    {memopiece}
                    <br />
                  </span>
                )
              }
            }
          }
        }

        if (clientname && !showOnlyHiddenMemos && options?.includeClientWeb !== false) {
          if (type === 'tr') {
            output.push(
              <tr key="a3">
                <TData>{label('Client web')}</TData>
                <TData>
                  <a href={'https://' + clientname} rel="nofollow">
                    {clientname}
                  </a>
                </TData>
              </tr>
            )
          } else if (type === 'detail') {
            output.push(
              renderDetailRow(
                'a3-' + j,
                label('Client web') + ':',
                <a
                  href={'https://' + clientname}
                  rel="nofollow"
                  onClick={(event) => event.stopPropagation()}
                  className="blue"
                >
                  {clientname}
                </a>
              )
            )
          } else {
            output.push(
              <React.Fragment key="a3">
                {label('Client web')}:{' '}
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
