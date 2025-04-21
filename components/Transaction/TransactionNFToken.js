import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, amountFormat, nftIdLink, nftOfferLink, trWithFlags } from '../../utils/format'

//NFTokenAcceptOffer, NFTokenBurn, NFTokenCancelOffer, NFTokenCreateOffer, NFTokenMint, NFTokenModify

export const TransactionNFToken = ({ data, pageFiatRate, selectedCurrency }) => {
  if (!data) return null
  const { specification, tx, outcome } = data

  const txType = tx?.TransactionType

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
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
                <AddressWithIconFilled data={specification} name="issuer" />
              </TData>
            </tr>
          )}
          {tx.TransferFee && (
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

      {specification.flags && trWithFlags(specification.flags)}

      {outcome?.nftokenChanges && <>TODO</>}

      {txType === 'NFTokenCreateOffer' &&
        outcome?.nftokenOfferChanges?.map((change) => change.map((offer) => nftOfferLink(offer.index)))}
    </TransactionCard>
  )
}
