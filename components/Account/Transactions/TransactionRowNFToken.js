import React from 'react'
import { TransactionRowCard } from './TransactionRowCard'
import {
  nftIdLink,
  nftOfferLink,
  amountFormat,
  addressUsernameOrServiceLink,
  nativeCurrencyToFiat,
  AddressWithIconInline
} from '../../../utils/format'
import { addressBalanceChanges } from '../../../utils/transaction'

const nftData = (change, nftInfo, txType) => {
  const flagsAsString = flagList(nftInfo.flags)

  return (
    <>
      <div>
        {txType === 'NFTokenBurn' && 'Burned '}NFT: {nftIdLink(change.nftokenID)}
      </div>

      {nftInfo.transferFee !== undefined && txType !== 'NFTokenBurn' && (
        <div>
          <span>Royalty: </span>
          <span>{nftInfo.transferFee / 1000}%</span>
        </div>
      )}
      {flagsAsString && txType !== 'NFTokenBurn' && txType !== 'NFTokenAcceptOffer' && (
        <div>
          <span>Flag{flagsAsString.includes(',') ? 's' : ''}: </span>
          <span className="bold">{flagsAsString}</span>
        </div>
      )}
      {nftInfo.nftokenTaxon !== undefined && txType !== 'NFTokenAcceptOffer' && (
        <div>
          <span>NFT taxon: </span>
          <span>{nftInfo.nftokenTaxon}</span>
        </div>
      )}
    </>
  )
}

const flagList = (flags) => {
  let flagList = ''

  if (!flags) return flagList

  for (let key in flags) {
    if (flags[key]) {
      //skip sellToken flag for tokenCreateOffer, we show it already
      if (key === 'sellToken') {
        continue
      }
      flagList += key + ', '
    }
  }
  flagList = flagList.slice(0, -2) // remove the last comma

  return flagList
}

const showAllOfferLinks = (changes) => {
  const indexes = []
  for (let i = 0; i < changes.length; i++) {
    for (let j = 0; j < changes[i].nftokenOfferChanges.length; j++) {
      indexes.push(
        <React.Fragment key={i + '-' + j}>{nftOfferLink(changes[i].nftokenOfferChanges[j].index)}</React.Fragment>
      )
    }
  }
  return indexes
}

export const TransactionRowNFToken = ({ data, address, index, selectedCurrency }) => {
  const { specification, outcome, tx } = data
  const txType = tx?.TransactionType
  let txTypeSpecial = txType

  const amountChange = addressBalanceChanges(data, address)?.[0]

  if (txType === 'NFTokenAcceptOffer') {
    if (amountChange?.value < 0) {
      txTypeSpecial = 'NFT purchase'
    } else {
      txTypeSpecial = 'NFT offer accept'
    }
  } else if (txType === 'NFTokenCreateOffer') {
    const direction = specification.flags ? (specification.flags.sellToken ? 'Sell' : 'Buy') : null
    if (direction) {
      txTypeSpecial = 'Create NFT ' + direction + ' offer'

      if (direction === 'Sell' && tx?.Account !== address) {
        txTypeSpecial = (
          <>
            {tx?.Amount === '0' ? 'Free NFT offer' : 'NFT Sell offer'} from
            <br />
            <AddressWithIconInline data={specification.source} options={{ short: 5 }} />
          </>
        )
      }
    }
  } else if (txType === 'NFTokenCancelOffer') {
    txTypeSpecial = 'Cancel NFT offer'
  } else if (txType === 'NFTokenMint') {
    txTypeSpecial = 'Mint NFT'
  } else if (txType === 'NFTokenBurn') {
    txTypeSpecial = 'Burn NFT'
  }

  txTypeSpecial = <span className="bold">{txTypeSpecial}</span>

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {(fiatRate) => (
        <>
          {outcome?.nftokenChanges?.length > 0 && (
            <>
              {/* For NFTokenAcceptOffer, show NFT info only once */}
              {txType === 'NFTokenAcceptOffer'
                ? (() => {
                    const firstChange = outcome.nftokenChanges[0]?.nftokenChanges[0]
                    const nftInfo = firstChange ? outcome?.affectedObjects?.nftokens?.[firstChange.nftokenID] : null
                    return firstChange && nftInfo ? (
                      <React.Fragment key="nft-info">{nftData(firstChange, nftInfo, txType)}</React.Fragment>
                    ) : null
                  })()
                : /* For other transaction types, show NFT info for each change */
                  outcome.nftokenChanges.map((change, i) => {
                    const nftChanges = change.nftokenChanges
                    return nftChanges.map((nftChange, j) => {
                      const nftInfo = outcome?.affectedObjects?.nftokens?.[nftChange.nftokenID]
                      return (
                        <React.Fragment key={'t' + i + '-' + j}>{nftData(nftChange, nftInfo, txType)}</React.Fragment>
                      )
                    })
                  })}
            </>
          )}

          {txType === 'NFTokenCancelOffer' && (
            <>
              {/* For cancel offers not initiated by this account, show who initiated the cancel */}
              {tx?.Account !== address && (
                <>
                  <span>NFT offer Canceled by: </span>
                  <span className="bold">{addressUsernameOrServiceLink(specification?.source, 'address')}</span>
                  <br />
                </>
              )}
            </>
          )}

          {outcome?.nftokenOfferChanges?.length > 0 && txType !== 'NFTokenAcceptOffer' && (
            <div>
              <span>Offer: </span>
              <span>{showAllOfferLinks(outcome?.nftokenOfferChanges)}</span>
            </div>
          )}

          {txType === 'NFTokenCreateOffer' && (!specification?.flags?.sellToken || tx?.Destination === address) && (
            <>
              {tx?.Owner && (
                <>
                  <span>NFT Owner: </span>
                  <span>{addressUsernameOrServiceLink(specification, 'owner')}</span>
                  <br />
                </>
              )}
              {tx?.NFTokenID && (
                <>
                  <span>NFT: </span>
                  <span>{nftIdLink(tx?.NFTokenID)}</span>
                  <br />
                </>
              )}
              {tx?.Destination && tx?.Destination !== address && (
                <>
                  <span>Destination: </span>
                  <span>{addressUsernameOrServiceLink(specification?.destination, 'address')}</span>
                  <br />
                </>
              )}
            </>
          )}

          {txType === 'NFTokenAcceptOffer' && (
            <>
              {tx?.NFTokenSellOffer && (
                <>
                  <span>Sell offer: </span>
                  <span>{nftOfferLink(tx?.NFTokenSellOffer)}</span>
                  <br />
                </>
              )}
              {tx?.NFTokenBuyOffer && (
                <>
                  <span>Buy offer: </span>
                  <span>{nftOfferLink(tx?.NFTokenBuyOffer)}</span>
                  <br />
                </>
              )}
              {/* Show amount spent for the NFT */}
              {amountChange && (
                <>
                  <span>Amount: </span>
                  <span className="bold">{amountFormat(amountChange, { icon: true })}</span>
                  <span>
                    {nativeCurrencyToFiat({
                      amount: amountChange,
                      selectedCurrency,
                      fiatRate
                    })}
                  </span>
                  <br />
                </>
              )}
              {/* Show broker fee for broker sells */}
              {tx?.NFTokenBrokerFee && tx?.NFTokenBrokerFee !== '0' && (
                <>
                  <span>Broker fee: </span>
                  <span className="bold">
                    {amountFormat(specification.nftokenBrokerFee, { tooltip: 'right', icon: true })}
                  </span>
                  <br />
                </>
              )}
              {/* Show NFT transfer details */}
              {outcome?.nftokenChanges?.length === 2 && (
                <>
                  <span>NFT transfered from: </span>
                  <span>
                    {addressUsernameOrServiceLink(
                      outcome.nftokenChanges.find((change) => change.nftokenChanges[0]?.status === 'removed'),
                      'address'
                    )}
                  </span>
                  <br />
                  <span>NFT transfered to: </span>
                  <span>
                    {addressUsernameOrServiceLink(
                      outcome.nftokenChanges.find((change) => change.nftokenChanges[0]?.status === 'added'),
                      'address'
                    )}
                  </span>
                  <br />
                </>
              )}
            </>
          )}

          {specification.amount !== undefined && (
            <div>
              <span>{txType === 'NFTokenMint' ? 'Price: ' : 'Amount: '}</span>
              <span className="bold">{amountFormat(specification.amount, { tooltip: 'right', icon: true })}</span>
              <span>
                {nativeCurrencyToFiat({
                  amount: specification.amount,
                  selectedCurrency,
                  fiatRate
                })}
              </span>
            </div>
          )}
        </>
      )}
    </TransactionRowCard>
  )
}
