import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, nftIdLink, nftOfferLink } from '../../utils/format'
import { decode } from '../../utils'

//NFTokenAcceptOffer, NFTokenBurn, NFTokenCancelOffer, NFTokenCreateOffer, NFTokenMint, NFTokenModify

const nftData = (change, nftInfo, txType) => {
  return (
    <>
      <tr>
        <TData>NFT</TData>
        <TData>{nftIdLink(change.nftokenID)}</TData>
      </tr>
      {txType !== 'NFTokenMint' && txType !== 'NFTokenModify' && (
        <>
          {nftInfo.issuer && (
            <tr>
              <TData>Issuer</TData>
              <TData>
                <AddressWithIconFilled data={nftInfo} name="issuer" />
              </TData>
            </tr>
          )}
          {nftInfo.transferFee !== undefined && (
            <tr>
              <TData>Transfer fee</TData>
              <TData>{nftInfo.transferFee / 1000}%</TData>
            </tr>
          )}
          {nftInfo.flags && (
            <tr>
              <TData>Flag{Object.keys(nftInfo.flags).length > 1 ? 's' : ''}</TData>
              <TData>{flagList(nftInfo.flags)}</TData>
            </tr>
          )}
        </>
      )}
      {nftInfo.nftokenTaxon !== undefined && (
        <tr>
          <TData>NFT taxon</TData>
          <TData>{nftInfo.nftokenTaxon}</TData>
        </tr>
      )}
      {nftInfo.sequence !== undefined && (
        <tr>
          <TData>NFT serial</TData>
          <TData>{nftInfo.sequence}</TData>
        </tr>
      )}
      {change.previousURI && (
        <>
          <tr>
            <TData>Previous URI</TData>
            <TData>{decode(change.previousURI)}</TData>
          </tr>
          {change.uri && (
            <tr>
              <TData className="orange">New URI</TData>
              <TData>{decode(change.uri)}</TData>
            </tr>
          )}
        </>
      )}
    </>
  )
}

const nftokenChanges = (changes, nftokens, txType) => {
  /*
  "nftokenChanges": {
    "rJcEbVWJ7xFjL8J9LsbxBMVSRY2C7DU7rz": [
      {
        "status": "removed",
        "nftokenID": "000B0000C124E14881533A9AFE4A5F481795C17003A9FACF16E5DA9C00000001",
        "uri": "697066733A2F2F516D516A447644686648634D7955674441784B696734416F4D547453354A72736670694545704661334639515274"
      }
    ],
    "rM3UEiJzg7nMorRhdED5savWDt1Gqb6TLw": [
      {
        "status": "added",
        "nftokenID": "000B0000C124E14881533A9AFE4A5F481795C17003A9FACF16E5DA9C00000001",
        "uri": "697066733A2F2F516D516A447644686648634D7955674441784B696734416F4D547453354A72736670694545704661334639515274"
      }
    ]
  },
  */
  let showAll = true
  let transfer = false
  let addressFrom = ''
  let addressTo = ''
  if (txType === 'NFTokenMint' || txType === 'NFTokenModify' || txType === 'NFTokenAcceptOffer') {
    showAll = false
    if (txType === 'NFTokenAcceptOffer' && Object.keys(changes).length === 2) {
      transfer = true
    }
  }
  return (
    <>
      {showAll && (
        <tr>
          <TData>Affected accounts</TData>
          <TData>
            <br />
          </TData>
        </tr>
      )}
      {Object.keys(changes).map((address, i) => {
        const change = changes[address]
        let output = []
        if (showAll) {
          output.push(
            <tr key={'h' + i}>
              <TData>{i + 1}.</TData>
              <TData>
                <AddressWithIconFilled data={{ address }} name="address" />
              </TData>
            </tr>
          )
        }
        for (let i = 0; i < change.length; i++) {
          const nftInfo = nftokens[change[i].nftokenID]
          if (showAll) {
            output.push(
              <tr key={i}>
                <TData>Change</TData>
                <TData>
                  <span
                    className={
                      change[i].status === 'added' ? 'green' : change[i].status === 'removed' ? 'red' : 'orange'
                    }
                  >
                    {change[i].status}
                  </span>{' '}
                  NFT
                </TData>
              </tr>
            )
          }

          if (transfer) {
            //added for one, removed for another one.
            if (change[i].status === 'added') {
              addressTo = address
            } else if (change[i].status === 'removed') {
              addressFrom = address
            }
          } else {
            if (txType !== 'NFTokenMint') {
              output.push(
                <tr>
                  <TData colSpan="2">
                    <hr />
                  </TData>
                </tr>
              )
            }
            output.push(<React.Fragment key={'t' + i}>{nftData(change[i], nftInfo, txType)}</React.Fragment>)
            if (txType !== 'NFTokenMint') {
              output.push(
                <tr>
                  <TData colSpan="2">
                    <hr />
                    <br />
                  </TData>
                </tr>
              )
            }
          }
        }
        return output
      })}
      {transfer && (
        <>
          <tr>
            <TData className="bold">
              <br />
              NFT Transfer
            </TData>
            <TData>
              <br />
              <br />
            </TData>
          </tr>
          <tr>
            <TData colSpan="2">
              <hr />
            </TData>
          </tr>
          <tr>
            <TData>Transfer from</TData>
            <TData>
              <AddressWithIconFilled data={{ address: addressFrom }} name="address" />
            </TData>
          </tr>
          <tr>
            <TData>Transfer to</TData>
            <TData>
              <AddressWithIconFilled data={{ address: addressTo }} name="address" />
            </TData>
          </tr>
          {nftData(changes?.[addressTo][0], nftokens[changes?.[addressTo][0].nftokenID], txType)}
          <tr>
            <TData colSpan="2">
              <hr />
              <br />
            </TData>
          </tr>
        </>
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

  Object.values(changes).forEach((arr) => {
    arr.forEach((item) => {
      if (item.index) {
        indexes.push(nftOfferLink(item.index))
      }
    })
  })

  return indexes
}

export const TransactionNFToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const txType = tx?.TransactionType

  const direction = specification.flags ? (specification.flags.sellToken ? 'Sell' : 'Buy') : null

  const txTypeSpecial =
    txType +
    (direction && (txType === 'NFTokenAcceptOffer' || txType === 'NFTokenCreateOffer')
      ? ' - ' + direction + ' Offer'
      : '')

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {txType === 'NFTokenMint' && (
        <>
          {tx.Issuer && (
            <tr>
              <TData>Issuer</TData>
              <TData>
                <AddressWithIconFilled data={specification.issuer} name="address" />
              </TData>
            </tr>
          )}
          {tx.Destination && (
            <tr>
              <TData>Destination</TData>
              <TData>
                <AddressWithIconFilled data={specification.destination} name="address" />
              </TData>
            </tr>
          )}
          {tx.TransferFee !== undefined && (
            <tr>
              <TData>Transfer fee</TData>
              <TData>{tx.TransferFee / 1000} %</TData>
            </tr>
          )}
        </>
      )}
      {txType === 'NFTokenBurn' && (
        <tr>
          <TData>NFT</TData>
          <TData>{nftIdLink(tx.NFTokenID)}</TData>
        </tr>
      )}
      {txType === 'NFTokenCreateOffer' && (
        <>
          {tx.Owner && (
            <tr>
              <TData>Owner</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="owner" />
              </TData>
            </tr>
          )}
          {tx.NFTokenID && (
            <tr>
              <TData>NFT</TData>
              <TData>{nftIdLink(tx.NFTokenID)}</TData>
            </tr>
          )}
          {tx.Amount && tx.Amount !== '0' && (
            <tr>
              <TData>Amount</TData>
              <TData>
                {amountFormat(specification.amount, { tooltip: 'right' })}
                {/* specification.amountInConvertCurrencies?.[selectedCurrency] && (
                  <> (≈ {convertedAmount(nftEvent, selectedCurrency)})</>
                ) */}
              </TData>
            </tr>
          )}
          {tx.Expiration && (
            <tr>
              <TData>Expiration</TData>
              <TData>
                {timeFromNow(tx.Expiration, i18n, 'ripple')} ({fullDateAndTime(tx.Expiration, 'ripple')})
              </TData>
            </tr>
          )}
          {tx.Destination && (
            <tr>
              <TData>Destination</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="destination" />
              </TData>
            </tr>
          )}
        </>
      )}
      {txType === 'NFTokenCancelOffer' &&
        tx.NFTokenOffers?.map((offerId, i) => {
          return (
            <tr key={i}>
              <TData>Offer {tx.NFTokenOffers.length > 1 ? i + 1 : ''}</TData>
              <TData>{nftOfferLink(offerId)}</TData>
            </tr>
          )
        })}
      {txType === 'NFTokenAcceptOffer' && (
        <>
          {tx.NFTokenSellOffer && (
            <tr>
              <TData>Sell offer</TData>
              <TData>{nftOfferLink(tx.NFTokenSellOffer)}</TData>
            </tr>
          )}
          {tx.NFTokenBuyOffer && (
            <tr>
              <TData>Buy offer</TData>
              <TData>{nftOfferLink(tx.NFTokenBuyOffer)}</TData>
            </tr>
          )}
          {tx.NFTokenBrokerFee && tx.NFTokenBrokerFee !== '0' && (
            <tr>
              <TData>Broker fee</TData>
              <TData>
                {amountFormat(specification.nftokenBrokerFee, { tooltip: 'right' })}
                {/* specification.amountInConvertCurrencies?.[selectedCurrency] && (
                  <> (≈ {convertedAmount(nftEvent, selectedCurrency)})</>
                ) */}
              </TData>
            </tr>
          )}
        </>
      )}
      {specification.flags &&
        !(Object.keys(specification.flags).length === 1 && specification.flags.sellToken === true) && (
          <tr>
            <TData>Flag{Object.keys(specification.flags).length > 1 ? 's' : ''}</TData>
            <TData>{flagList(specification.flags)}</TData>
          </tr>
        )}
      {outcome?.nftokenChanges &&
        Object.keys(outcome?.nftokenChanges).length > 0 &&
        nftokenChanges(outcome?.nftokenChanges, outcome?.affectedObjects?.nftokens, txType)}
      {txType === 'NFTokenCreateOffer' && Object.keys(outcome?.nftokenOfferChanges).length > 0 && (
        <tr>
          <TData>Offer</TData>
          <TData>{showAllOfferLinks(outcome?.nftokenOfferChanges)}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
