import { TData } from '../Table'

import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, nftIdLink, trWithFlags } from '../../utils/format'

//URITokenBuy, URITokenCreateSellOffer, URITokenCancelSellOffer, URITokenBurn

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

      {/* not sure how much nessary it's here, need to check xahau flags that are possible */}
      {specification.flags && trWithFlags(specification.flags)}

      {outcome?.uritokenChanges && <>TODO</>}
    </TransactionCard>
  )
}
