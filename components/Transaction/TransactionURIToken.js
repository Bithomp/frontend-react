import React from 'react'
import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, nftIdLink } from '../../utils/format'

//URITokenMint, URITokenBuy, URITokenCreateSellOffer, URITokenCancelSellOffer, URITokenBurn

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
          {nftInfo.flags?.burnable && (
            <tr>
              <TData>Flag</TData>
              <TData className="orange">burnable</TData>
            </tr>
          )}
        </>
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
  let addressFrom = {}
  let addressTo = {}
  if (txType === 'URITokenBuy' || txType === 'URITokenCreateSellOffer' || txType === 'URITokenMint') {
    showAll = false
    if (txType === 'URITokenBuy' && changes.length === 2) {
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
              <TData>&nbsp;</TData>
              <TData>
                {i + 1}. <AddressWithIconFilled data={change} name="address" />
              </TData>
            </tr>
          )
        }

        const nftChnages = change.uritokenChanges
        for (let i = 0; i < nftChnages.length; i++) {
          const nftInfo = nftokens[nftChnages[i].uritokenID]
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
            output.push(<React.Fragment key={'t' + i}>{nftData(nftChnages[i], nftInfo, txType)}</React.Fragment>)
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
          {nftData(changes?.[0].uritokenChanges[0], nftokens[changes?.[0].uritokenChanges[0].uritokenID], txType)}
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

export const TransactionURIToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const txType = tx?.TransactionType

  return (
    <TransactionCard
      data={data}
      pageFiatRate={pageFiatRate}
      selectedCurrency={selectedCurrency}
      notFullySupported={txType === 'URITokenBuy'}
    >
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
                <AddressWithIconFilled data={specification.destination} />
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
      {outcome?.uritokenChanges &&
        outcome?.uritokenChanges.length > 0 &&
        txType !== 'NFTokenBurn' &&
        uritokenChanges(outcome?.uritokenChanges, outcome?.affectedObjects?.uritokens, txType)}
    </TransactionCard>
  )
}
