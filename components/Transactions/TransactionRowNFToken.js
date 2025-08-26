import React from 'react'
import { TransactionRowCard } from './TransactionRowCard'
import { nftIdLink, nftOfferLink, amountFormat} from '../../utils/format'

const nftData = (change, nftInfo, txType) => {
  const flagsAsString = flagList(nftInfo.flags)

  return (
    <>
    {txType === 'NFTokenBurn' ? (
      <div>
        <span>Change: </span>
        <span>removed NFT {nftIdLink(change.nftokenID)}</span>
      </div>
    ) : <div>
          <span>NFT: </span>
          <span>{nftIdLink(change.nftokenID)}</span>
        </div>  }
      
      {nftInfo.transferFee !== undefined && (
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
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {outcome?.nftokenChanges?.length > 0 && (
        <>
          {/* For NFTokenAcceptOffer, show NFT info only once */}
          {txType === 'NFTokenAcceptOffer' ? (
            (() => {
              const firstChange = outcome.nftokenChanges[0]?.nftokenChanges[0]
              const nftInfo = firstChange ? outcome?.affectedObjects?.nftokens?.[firstChange.nftokenID] : null
              return firstChange && nftInfo ? (
                <React.Fragment key="nft-info">
                  {nftData(firstChange, nftInfo, txType)}
                </React.Fragment>
              ) : null
            })()
          ) : (
            /* For other transaction types, show NFT info for each change */
            outcome.nftokenChanges.map((change, i) => {
              const nftChanges = change.nftokenChanges
              return nftChanges.map((nftChange, j) => {
                const nftInfo = outcome?.affectedObjects?.nftokens?.[nftChange.nftokenID]
                return (
                  <React.Fragment key={'t' + i + '-' + j}>{nftData(nftChange, nftInfo, txType)}</React.Fragment>
                )
              })
            })
          )}
        </>
      )}

      {/* For sell offers, show NFT owner, NFT ID, and destination */}
      {txType === "NFTokenCreateOffer" && (
        <>
          <span>Initiated by: </span>
          <span className="bold">{specification?.source?.address}</span>
          <br />
          {/* For sell offers not initiated by this account, show who created the offer */}
          {specification?.flags?.sellToken && specification?.source?.address !== tx?.tx?.Account && (
            <>
              <span>Sell Offer by: </span>
              <span className="bold">{specification?.source?.address}</span>
              <br />
            </>
          )}
        </>
      )}

      {txType === "NFTokenCancelOffer" && (
        <>
          <span>Initiated by: </span>
          <span className="bold">{tx?.tx?.Account}</span>
          <br />
          {/* For cancel offers not initiated by this account, show who initiated the cancel */}
          {specification?.source?.address !== tx?.tx?.Account && (
            <>
              <span>NFTokenCancelOffer by: </span>
              <span className="bold">{specification?.source?.address}</span>
              <br />
            </>
          )}
        </>
      )}

      {/* For buy offers, show NFT owner, NFT ID, and destination */}
      {txType === "NFTokenCreateOffer" && !specification?.flags?.sellToken && (
        <>
          {tx?.tx?.Owner && (
            <>
              <span>NFT Owner: </span>
              <span className="bold">{tx?.tx?.Owner}</span>
              <br />
            </>
          )}
          {tx?.tx?.NFTokenID && (
            <>
              <span>NFT: </span>
              <span className="bold">{tx?.tx?.NFTokenID}</span>
              <br />
            </>
          )}
          {tx?.tx?.Destination && (
            <>
              <span>Destination: </span>
              <span className="bold">{tx?.tx?.Destination}</span>
              <br />
            </>
          )}
        </>
      )}

      {txType === 'NFTokenAcceptOffer' && (
        <>
          <span>Initiated by: </span>
            <span className="bold">{tx?.tx?.Account}</span>
          <br />
          {tx?.tx?.NFTokenSellOffer && (
            <>
              <span>Sell offer: </span>
              <span>{nftOfferLink(tx?.tx?.NFTokenSellOffer)}</span>
              <br />
            </>
          )}
          {tx?.tx?.NFTokenBuyOffer && (
            <>
              <span>Buy offer: </span>
              <span>{nftOfferLink(tx?.tx?.NFTokenBuyOffer)}</span>
              <br />
            </>
          )}
          {/* Show amount spent for the NFT */}
          {specification?.amount && (
            <>
              <span>Amount spent: </span>
              <span className="bold">{amountFormat(specification.amount, { tooltip: 'right', icon: true })}</span>
              <br />
            </>
          )}
          {/* Show broker fee for broker sells */}
          {tx?.tx?.NFTokenBrokerFee && tx?.tx?.NFTokenBrokerFee !== '0' && (
            <>
              <span>Broker fee: </span>
              <span className="bold">{amountFormat(specification.nftokenBrokerFee, { tooltip: 'right', icon: true })}</span>
              <br />
            </>
          )}
          {/* Show NFT transfer details */}
          {outcome?.nftokenChanges?.length === 2 && (
            <>
              <span>Transfer From: </span>
              <span className="bold">
                {outcome.nftokenChanges.find(change => 
                  change.nftokenChanges[0]?.status === 'removed'
                )?.address || 'Unknown'}
              </span>
              <br />
              <span>Transfer To: </span>
              <span className="bold">
                {outcome.nftokenChanges.find(change => 
                  change.nftokenChanges[0]?.status === 'added'
                )?.address || 'Unknown'}
              </span>
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

      {/* show 0 Amounts */}
      {tx.tx.Amount && (
        <div>
          <span>{txType === 'NFTokenMint' ? 'Price: ' : 'Amount: '}</span>
          <span>
            {amountFormat(specification.amount, { tooltip: 'right', icon: true })}
          </span>
        </div>
      )}
    </TransactionRowCard>
  )
}