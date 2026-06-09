import { TData, TransactionValue } from './TData'

import { TransactionCard } from './TransactionCard'
import {
  AddressWithIconFilled,
  amountFormat,
  fullDateAndTime,
  nftIdLink,
  nftOfferLink,
  tokenToFiat,
  timeFromNow
} from '../../utils/format'
import { getTransactionNftPreview } from '../../utils/transaction/nftPreview'
import { i18n } from 'next-i18next'
import { TransactionNftPreviewPanel } from './TransactionNftPreview'

//NFTokenAcceptOffer, NFTokenBurn, NFTokenCancelOffer, NFTokenCreateOffer, NFTokenMint, NFTokenModify

const nftokenChanges = (changes, txType) => {
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
                    <TransactionValue value={nftChnages[i].status} />
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
          }
        }
        return output
      })}
      {transfer && (
        <>
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
        </>
      )}
    </>
  )
}

const showAllOfferLinks = (changes) => {
  const indexes = []
  for (let i = 0; i < changes.length; i++) {
    for (let j = 0; j < changes[i].nftokenOfferChanges.length; j++) {
      indexes.push(<span key={i + '-' + j}>{nftOfferLink(changes[i].nftokenOfferChanges[j].index)}</span>)
    }
  }
  return indexes
}

const hasAmount = (amount) => amount !== null && typeof amount !== 'undefined'

const absoluteAmount = (amount) => {
  if (!hasAmount(amount)) return null

  if (typeof amount === 'object') {
    const value = String(amount.value ?? '')
    const valueInConvertCurrencies = amount.valueInConvertCurrencies
      ? Object.fromEntries(
          Object.entries(amount.valueInConvertCurrencies).map(([currency, fiatValue]) => [
            currency,
            String(fiatValue).replace(/^-/, '')
          ])
        )
      : amount.valueInConvertCurrencies

    return {
      ...amount,
      value: value.replace(/^-/, ''),
      valueInConvertCurrencies
    }
  }

  return String(amount).replace(/^-/, '')
}

const acceptedNftPriceAmount = (specification, outcome) => {
  const directAmount =
    specification?.nftokenOffer?.amount ??
    specification?.amount ??
    specification?.destination?.amount ??
    specification?.source?.amount

  if (hasAmount(directAmount)) return absoluteAmount(directAmount)

  const changedOfferAmount = outcome?.nftokenOfferChanges
    ?.flatMap((change) => change?.nftokenOfferChanges || [])
    ?.find((offerChange) => hasAmount(offerChange?.amount))?.amount

  if (hasAmount(changedOfferAmount)) return absoluteAmount(changedOfferAmount)

  const positiveBalanceChange = outcome?.balanceChanges
    ?.flatMap((change) => change?.balanceChanges || [])
    ?.filter((change) => Number(change?.value) > 0)
    ?.sort((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))?.[0]

  return positiveBalanceChange ? absoluteAmount(positiveBalanceChange) : null
}

export const TransactionNFToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const txType = tx?.TransactionType
  const cancelOfferCount =
    txType === 'NFTokenCancelOffer'
      ? Array.isArray(tx?.NFTokenOffers)
        ? tx.NFTokenOffers.length
        : outcome?.nftokenOfferChanges?.reduce(
            (count, change) => count + (change?.nftokenOfferChanges?.length || 0),
            0
          ) || 0
      : 0
  const nftPreview = txType === 'NFTokenCancelOffer' && cancelOfferCount !== 1 ? null : getTransactionNftPreview(data)
  const acceptedPriceAmount = txType === 'NFTokenAcceptOffer' ? acceptedNftPriceAmount(specification, outcome) : null

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
      {(txType === 'NFTokenCreateOffer' || txType === 'NFTokenMint') && (
        <>
          {tx.Owner && (
            <tr>
              <TData>NFT owner</TData>
              <TData>
                <AddressWithIconFilled data={specification} name="owner" />
              </TData>
            </tr>
          )}
          {tx.NFTokenID && !nftPreview && (
            <tr>
              <TData>NFT</TData>
              <TData>{nftIdLink(tx.NFTokenID)}</TData>
            </tr>
          )}
        </>
      )}

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
          {acceptedPriceAmount && (
            <tr>
              <TData>Price</TData>
              <TData>
                <span className="bold">{amountFormat(acceptedPriceAmount, { tooltip: 'right', icon: true })}</span>
                {tokenToFiat({
                  amount: acceptedPriceAmount,
                  selectedCurrency,
                  fiatRate: pageFiatRate,
                  absolute: true
                })}
              </TData>
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

      {outcome?.nftokenChanges?.length > 0 && nftokenChanges(outcome?.nftokenChanges, txType)}

      {nftPreview && (
        <tr style={{ width: '100%' }}>
          <TData colSpan="2" style={{ width: '100%' }}>
            <TransactionNftPreviewPanel preview={nftPreview} />
          </TData>
        </tr>
      )}

      {/* show created offer details */}
      {(txType === 'NFTokenCreateOffer' || txType === 'NFTokenMint') &&
        (tx.Amount || tx.Expiration || tx.Destination) && (
          <>
            <tr>
              <TData colSpan="2" className="bold">
                NFT Offer Details
              </TData>
            </tr>

            {outcome?.nftokenOfferChanges?.length > 0 && (
              <tr>
                <TData>Offer</TData>
                <TData>{showAllOfferLinks(outcome?.nftokenOfferChanges)}</TData>
              </tr>
            )}

            {/* show 0 Amounts */}
            {tx.Amount && (
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
    </TransactionCard>
  )
}
