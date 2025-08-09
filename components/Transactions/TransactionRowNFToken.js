import React, { useEffect, useState } from 'react'
import { TransactionRowCard } from './TransactionRowCard'
import { fetchHistoricalRate } from '../../utils/common'
import { nftIdLink, nftOfferLink, amountFormat } from '../../utils/format'

const nftData = (change, nftInfo) => {
 
  const flagsAsString = flagList(nftInfo.flags)

  return (
    <>
      <div>
        <span>NFT: </span>
        <span>{nftIdLink(change.nftokenID)}</span>
      </div>
      
      {nftInfo.transferFee !== undefined && (
        <div>
          <span>Transfer fee: </span>
          <span>{nftInfo.transferFee / 1000}%</span>
        </div>
      )}
      {flagsAsString && (
        <div>
          <span>Flag{flagsAsString.includes(',') ? 's' : ''}: </span>
          <span className="bold">{flagsAsString}</span>
        </div>
      )}
      {nftInfo.nftokenTaxon !== undefined && (
        <div>
          <span>NFT taxon: </span>
          <span>{nftInfo.nftokenTaxon}</span>
        </div>
      )}      
    </>
  )
}

const flagList = (flags) => {
  /*
  "flags": {
    "burnable": false,
    "onlyXRP": false,
    "trustLine": false,
    "transferable": true
  },
  */
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

export const TransactionRowNFToken = ({ tx, address, index, selectedCurrency}) => {
  const [pageFiatRate, setPageFiatRate] = useState(0)

  useEffect(() => {
    if (!selectedCurrency || !tx?.outcome) return
    const { ledgerTimestamp } = tx?.outcome
    if (!ledgerTimestamp) return

    fetchHistoricalRate({ timestamp: ledgerTimestamp * 1000, selectedCurrency, setPageFiatRate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, tx])

  const { specification, outcome } = tx

  const txType = tx?.tx?.TransactionType

  const direction = specification.flags ? (specification.flags.sellToken ? 'Sell' : 'Buy') : null

  const txTypeSpecial =
    txType +
    (direction && (txType === 'NFTokenAcceptOffer' || txType === 'NFTokenCreateOffer')
      ? ' - ' + direction + ' Offer'
      : '')

  return (
    <TransactionRowCard
      data={tx}
      address={address}
      index={index}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {outcome?.nftokenChanges?.length > 0 &&
        outcome?.nftokenChanges.map((change, i) => {
          const nftChanges = change.nftokenChanges
          return nftChanges.map((nftChange, j) => {
            const nftInfo = outcome?.affectedObjects?.nftokens?.[nftChange.nftokenID]
            return (
              <React.Fragment key={'t' + i + '-' + j}>{nftData(nftChange, nftInfo)}</React.Fragment>
            )
          })
        })}

      {outcome?.nftokenOfferChanges?.length > 0 && (
        <div>
          <span>Offer: </span>
          <span>{showAllOfferLinks(outcome?.nftokenOfferChanges)}</span>
        </div>
      )}

      {/* show 0 Amounts */}
      {tx.tx.Amount && (
        <div>
          <span>{txType === 'NFTokenMint' ? 'Price: ' : 'Amount: '}</span>
          <span>
            {amountFormat(specification.amount, { tooltip: 'right' })}
          </span>
        </div>
      )}
    </TransactionRowCard>
  )
}