import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import {
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  nftIdLink,
  nftOfferLink,
  timeFromNow
} from '../../utils/format'
import { decode } from '../../utils'
import { i18n } from 'next-i18next'
import CopyButton from '../UI/CopyButton'

//NFTokenAcceptOffer, NFTokenBurn, NFTokenCancelOffer, NFTokenCreateOffer, NFTokenMint, NFTokenModify

const nftData = (change, nftInfo, txType) => {
  let decodedURI = ''
  if (change?.uri) {
    decodedURI = decode(change.uri)
  }

  return (
    <>
      <tr>
        <TData>NFT</TData>
        <TData>{nftIdLink(change.nftokenID)}</TData>
      </tr>
      {txType !== 'NFTokenMint' && (
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
        <tr>
          <TData>Previous URI</TData>
          <TData>{decode(change.previousURI)}</TData>
        </tr>
      )}
      {decodedURI && (
        <tr>
          <TData className={txType === 'NFTokenModify' ? 'bold orange' : ''}>
            {txType === 'NFTokenModify' ? 'New ' : ''}URI
          </TData>
          <TData>
            {decodedURI} <CopyButton text={decodedURI} />{' '}
          </TData>
        </tr>
      )}
    </>
  )
}

const nftokenChanges = (changes, nftokens, txType) => {
  /*
  [
    {
      "address": "rniNyQQA1bzfSQ4mF7f1QCQQsh5VYb7BoG",
      "addressDetails": {
        "address": "rniNyQQA1bzfSQ4mF7f1QCQQsh5VYb7BoG",
        "username": null,
        "service": null
      },
      "nftokenChanges": [
        {
          "status": "modified",
          "nftokenID": "0010000035308C84A98C961A792FD63695C66FFD4120DE0D46DD60CE0020B433",
          "uri": "ABC123"
        }
      ]
    }
  ]
  */
  let showAll = true
  let transfer = false
  let addressFrom = {}
  let addressTo = {}
  if (txType === 'NFTokenMint' || txType === 'NFTokenModify' || txType === 'NFTokenAcceptOffer') {
    showAll = false
    if (txType === 'NFTokenAcceptOffer' && changes.length === 2) {
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
      {changes.map((change, i) => {
        let output = []
        if (showAll) {
          output.push(
            <tr key={'h' + i}>
              <TData>{i + 1}.</TData>
              <TData>
                <AddressWithIconFilled data={change} name="address" />
              </TData>
            </tr>
          )
        }
        const nftChnages = change.nftokenChanges
        for (let i = 0; i < nftChnages.length; i++) {
          const nftInfo = nftokens[nftChnages[i].nftokenID]
          if (showAll) {
            output.push(
              <tr key={i}>
                <TData>Change</TData>
                <TData>
                  <span
                    className={
                      nftChnages[i].status === 'added' ? 'green' : nftChnages[i].status === 'removed' ? 'red' : 'orange'
                    }
                  >
                    {nftChnages[i].status}
                  </span>{' '}
                  NFT
                </TData>
              </tr>
            )
          }

          if (transfer) {
            //added for one, removed for another one.
            if (nftChnages[i].status === 'added') {
              addressTo = { address: change.address, addressDetails: change.addressDetails }
            } else if (nftChnages[i].status === 'removed') {
              addressFrom = { address: change.address, addressDetails: change.addressDetails }
            }
          } else {
            if (txType === 'NFTokenModify') {
              output.push(
                <tr key="nft-modify-header">
                  <TData className="bold">
                    <br />
                    Modified NFT
                  </TData>
                  <TData>
                    <br />
                    <br />
                  </TData>
                </tr>
              )
            }

            if (txType !== 'NFTokenMint') {
              output.push(
                <tr key="hr-top">
                  <TData colSpan="2">
                    <hr />
                  </TData>
                </tr>
              )
            }
            if (txType === 'NFTokenModify') {
              output.push(
                <tr key="owner-and-issuer">
                  <TData>Owner</TData>
                  <TData>
                    <AddressWithIconFilled data={change} name="address" />
                  </TData>
                </tr>
              )
            }
            output.push(<React.Fragment key={'t' + i}>{nftData(nftChnages[i], nftInfo, txType)}</React.Fragment>)
            if (txType !== 'NFTokenMint') {
              output.push(
                <tr key="hr-bottom">
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
              <AddressWithIconFilled data={addressFrom} name="address" />
            </TData>
          </tr>
          <tr>
            <TData>Transfer to</TData>
            <TData>
              <AddressWithIconFilled data={addressTo} name="address" />
            </TData>
          </tr>
          {nftData(changes?.[0].nftokenChanges[0], nftokens[changes?.[0].nftokenChanges[0].nftokenID], txType)}
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
  for (let i = 0; i < changes.length; i++) {
    for (let j = 0; j < changes[i].nftokenOfferChanges.length; j++) {
      indexes.push(
        <React.Fragment key={i + '-' + j}>{nftOfferLink(changes[i].nftokenOfferChanges[j].index)}</React.Fragment>
      )
    }
  }
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
      {(txType === 'NFTokenCreateOffer' || txType === 'NFTokenMint') && (
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
              <TData>{txType === 'NFTokenMint' ? 'Price' : 'Amount'}</TData>
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
                <AddressWithIconFilled data={specification.destination} />
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
        outcome?.nftokenChanges.length > 0 &&
        nftokenChanges(outcome?.nftokenChanges, outcome?.affectedObjects?.nftokens, txType)}
      {txType === 'NFTokenCreateOffer' && outcome?.nftokenOfferChanges.length > 0 && (
        <tr>
          <TData>Offer</TData>
          <TData>{showAllOfferLinks(outcome?.nftokenOfferChanges)}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
