import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, nftIdLink } from '../../utils/format'

//URITokenBuy, URITokenCreateSellOffer, URITokenCancelSellOffer, URITokenBurn

const nftData = (change, nftInfo, txType) => {
  return (
    <>
      <tr>
        <TData>NFT</TData>
        <TData>{nftIdLink(change.uritokenID)}</TData>
      </tr>
      {txType !== 'URITokenMint' && (
        <>
          {nftInfo.issuer && (
            <tr>
              <TData>Issuer</TData>
              <TData>
                <AddressWithIconFilled data={nftInfo} name="issuer" />
              </TData>
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
      {nftInfo.sequence !== undefined && (
        <tr>
          <TData>NFT serial</TData>
          <TData>{nftInfo.sequence}</TData>
        </tr>
      )}
    </>
  )
}

const uritokenChanges = (changes, nftokens, txType) => {
  /*
    "uritokenChanges": {
    "rGjLQjWZ1vRPzdqPXQM4jksdKQE8oRNd8T": [
      {
        "status": "added",
        "uritokenID": "DB30404B34D1FEDCA500BD84F8A9AC77F18036A1E8966766BDE33595FC41CE57",
        "uri": "68747470733A2F2F692E6B796D2D63646E2E636F6D2F656E74726965732F69636F6E732F6F726967696E616C2F3030302F3032372F3437352F53637265656E5F53686F745F323031382D31302D32355F61745F31312E30322E31355F414D2E706E67",
        "issuer": "r3Q5KufJdkQyaLvHD22fJFVSZCqq4GczyU"
      }
    ]
  },
  */
  let showAll = true
  let transfer = false
  let addressFrom = ''
  let addressTo = ''
  if (txType === 'URITokenBuy' || txType === 'URITokenCreateSellOffer' || txType === 'URITokenMint') {
    showAll = false
    if (txType === 'URITokenBuy' && Object.keys(changes).length === 2) {
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
              <TData>&nbsp;</TData>
              <TData>
                {i + 1}. <AddressWithIconFilled data={address} name="address" />
              </TData>
            </tr>
          )
        }

        for (let i = 0; i < change.length; i++) {
          const nftInfo = nftokens[change[i].uri]
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
            output.push(<React.Fragment key={'t' + i}>{nftData(change[i], nftInfo, txType)}</React.Fragment>)
          }
        }
        return output
      })}
      {transfer && (
        <>
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
          {nftData(changes?.[addressTo][0], nftokens[changes?.[addressTo][0].uritokenID], txType)}
        </>
      )}
    </>
  )
}

export const TransactionURIToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx } = data

  const txType = tx?.TransactionType

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData>Initiated by</TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {txType === 'URITokenBurn' && (
        <tr>
          <TData>NFT</TData>
          <TData>{nftIdLink(tx.URITokenID)}</TData>
        </tr>
      )}
      {(txType === 'URITokenBuy' || 'URITokenCreateSellOffer' || 'URITokenCancelSellOffer') && (
        <>
          {tx.Owner && (
            <tr>
              <TData>Owner</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="owner" />
              </TData>
            </tr>
          )}
          {tx.URITokenID && (
            <tr>
              <TData>NFT</TData>
              <TData>{nftIdLink(tx.URITokenID)}</TData>
            </tr>
          )}
          {tx.Amount && tx.Amount !== '0' && (
            <tr>
              <TData>Amount</TData>
              <TData>
                {amountFormat(specification.amount, { tooltip: 'right' })}
                {/* 
                specification.amountInConvertCurrencies?.[selectedCurrency] && (
                  <> (≈ {convertedAmount(nftEvent, selectedCurrency)})</>
                 ) 
                 */}
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

      {specification.flags?.burnable && (
        <tr>
          <TData>Flag</TData>
          <TData className="orange">burnable</TData>
        </tr>
      )}
      {outcome?.uriTokenChanges && Object.keys(outcome?.uriTokenChanges).length > 0 && txType !== 'NFTokenBurn' && (
        <tr>
          <TData>URI Token Changes</TData>
          <TData>{uritokenChanges(outcome?.uritokenChanges, outcome?.affectedObjects?.uritokens, txType)}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
