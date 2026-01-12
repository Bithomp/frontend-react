import { useState, useEffect } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile, useIsMobile } from '../../../utils/mobile'
import { axiosServer, passHeaders } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import FiltersFrame from '../../../components/Layout/FiltersFrame'
import CurrencySearchSelect from '../../../components/UI/CurrencySearchSelect'
import {
  niceNumber,
  niceCurrency,
  fullNiceNumber,
  amountFormat,
  addressUsernameOrServiceLink
} from '../../../utils/format'
import { avatarSrc, nativeCurrency, useWidth } from '../../../utils'
import { divide, multiply } from '../../../utils/calc'
import { MdMoneyOff } from 'react-icons/md'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  const { id } = query
  const account = id ? (Array.isArray(id) ? id[0] : id) : ''

  let initialData = null
  let initialAccountData = null

  if (account) {
    try {
      // fetch account info for display
      const accountRes = await axiosServer({
        method: 'get',
        url: `v2/address/${account}?username=true&service=true&verifiedDomain=true`,
        headers: passHeaders(req)
      })
      initialAccountData = accountRes?.data

      // fetch DEX orders using the new API endpoint
      const res = await axiosServer({
        method: 'get',
        url: `v2/objects/${initialAccountData?.address}?type=offer&limit=1000`,
        headers: passHeaders(req)
      })
      initialData = res?.data
    } catch (error) {
      console.error(error)
    }
  }

  return {
    props: {
      id: account,
      initialData: initialData || {},
      initialAccountData: initialAccountData || {},
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'account']))
    }
  }
}

export default function AccountDex({ id, initialData, initialAccountData, account, setSignRequest, isSsrMobile }) {
  const width = useWidth()
  const isMobile = useIsMobile(600)

  const [rendered, setRendered] = useState(false)
  const [offerList, setOfferList] = useState(initialData?.objects || [])
  const [currency, setCurrency] = useState('')
  const [order, setOrder] = useState('sequence_desc')
  const [filtersHide, setFiltersHide] = useState(false)

  useEffect(() => {
    setOfferList(initialData?.objects || [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  const accountData = initialAccountData
  const totalOffers = offerList.length
  const canShowSorting = totalOffers < 1000

  // Order list for sorting
  const orderList = [
    { value: 'sequence_desc', label: 'Sequence (newest first)' },
    { value: 'sequence_asc', label: 'Sequence (oldest first)' }
  ]

  // Add amount sorting when currency is filtered
  if (currency && canShowSorting) {
    orderList.push(
      { value: 'amount_desc', label: 'Amount (largest first)' },
      { value: 'amount_asc', label: 'Amount (smallest first)' }
    )
  }

  useEffect(() => {
    setRendered(true)
  }, [])

  // Filter and sort offers
  const filteredAndSortedOffers = () => {
    let filtered = offerList

    // Apply currency filter
    if (currency) {
      filtered = filtered.filter((offer) => {
        const takerGetsCurrency = typeof offer.TakerGets === 'string' ? nativeCurrency : offer.TakerGets?.currency
        const takerPaysCurrency = typeof offer.TakerPays === 'string' ? nativeCurrency : offer.TakerPays?.currency
        return takerGetsCurrency === currency || takerPaysCurrency === currency
      })
    }

    // Apply sorting
    if (canShowSorting) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0
        const [sortBy, sortDirection] = order.split('_')

        if (sortBy === 'sequence') {
          comparison = a.Sequence - b.Sequence
        } else if (sortBy === 'amount' && currency) {
          // When filtering by currency, sort by amount of that currency
          const getAmountForCurrency = (offer) => {
            const takerGetsCurrency = typeof offer.TakerGets === 'string' ? nativeCurrency : offer.TakerGets?.currency
            const takerPaysCurrency = typeof offer.TakerPays === 'string' ? nativeCurrency : offer.TakerPays?.currency

            if (takerGetsCurrency === currency) {
              return typeof offer.TakerGets === 'string'
                ? parseFloat(offer.TakerGets) / 1000000
                : parseFloat(offer.TakerGets?.value || 0)
            } else if (takerPaysCurrency === currency) {
              return typeof offer.TakerPays === 'string'
                ? parseFloat(offer.TakerPays) / 1000000
                : parseFloat(offer.TakerPays?.value || 0)
            }
            return 0
          }

          comparison = getAmountForCurrency(a) - getAmountForCurrency(b)
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }

  const displayedOffers = filteredAndSortedOffers()

  const orderRows = displayedOffers.map((offer, i) => {
    const sell = offer.flags?.sell
    return (
      <tr key={offer.index || i}>
        <td className="center" style={{ width: 30 }}>
          {offer.Sequence}
        </td>
        <td className="left">
          <span className={sell ? 'red' : 'green'}>{sell ? 'Selling ' : 'Buying '}</span>
          <span className="bold">
            {amountFormat(sell ? offer.TakerGets : offer.TakerPays, { precise: 'nice', icon: true })}
          </span>
          <span className="grey">{' for '}</span>
          <span className="bold">
            {amountFormat(sell ? offer.TakerPays : offer.TakerGets, { precise: 'nice', icon: true })}
          </span>
        </td>
        {sell ? (
          <td className="right">
            {typeof offer.TakerGets === 'string' ? (
              <>
                1 {nativeCurrency} = {niceNumber(multiply(offer.quality, 1000000), 0, null, 5)}{' '}
                {niceCurrency(offer.TakerPays?.currency || nativeCurrency)}
              </>
            ) : typeof offer.TakerPays === 'string' ? (
              <>
                1 {niceCurrency(offer.TakerGets?.currency)} = {niceNumber(divide(offer.quality, 1000000), 0, null, 5)}{' '}
                {nativeCurrency}
              </>
            ) : (
              <>
                1 {niceCurrency(offer.TakerGets?.currency)} = {niceNumber(offer.quality, 0, null, 5)}{' '}
                {niceCurrency(offer.TakerPays?.currency)}
              </>
            )}
          </td>
        ) : (
          <td className="right">
            {typeof offer.TakerGets === 'string' ? (
              <>
                1 {niceCurrency(offer.TakerPays?.currency)} ={' '}
                <span className="tooltip">
                  {niceNumber(divide(1, offer.quality * 1000000), 0, null, 2)} {nativeCurrency}
                  <span className="tooltiptext no-brake">
                    {fullNiceNumber(divide(1, offer.quality * 1000000))} {nativeCurrency}
                  </span>
                </span>
              </>
            ) : typeof offer.TakerPays === 'string' ? (
              <>
                1 {nativeCurrency} ={' '}
                <span className="tooltip">
                  {niceNumber(divide(1000000, offer.quality), 0, null, 2)} {niceCurrency(offer.TakerGets?.currency)}
                  <span className="tooltiptext no-brake">
                    {fullNiceNumber(divide(1000000, offer.quality))}
                    {niceCurrency(offer.TakerGets?.currency)}
                  </span>
                </span>
              </>
            ) : (
              <>
                1 {niceCurrency(offer.TakerPays?.currency)} ={' '}
                <span className="tooltip">
                  {niceNumber(divide(1, offer.quality), 0, null, 2)} {niceCurrency(offer.TakerGets?.currency)}
                  <span className="tooltiptext no-brake">
                    {fullNiceNumber(divide(1, offer.quality))}
                    {niceCurrency(offer.TakerGets?.currency)}
                  </span>
                </span>
              </>
            )}
          </td>
        )}
        <td className="center">
          {offer.Account === account?.address ? (
            <a
              href="#"
              onClick={() =>
                setSignRequest({
                  request: {
                    TransactionType: 'OfferCancel',
                    OfferSequence: offer.Sequence
                  }
                })
              }
              className="red tooltip"
            >
              <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />
              <span className="tooltiptext">Cancel</span>
            </a>
          ) : (
            <span className="grey tooltip">
              <MdMoneyOff style={{ fontSize: 18, marginBottom: -4 }} />
              <span className="tooltiptext">Cancel</span>
            </span>
          )}
        </td>
      </tr>
    )
  })

  return (
    <>
      <SEO
        page="DEX Orders"
        title={`DEX Orders - ${accountData?.username || accountData?.service?.name || id}`}
        description={`DEX orders for ${accountData?.username || accountData?.service?.name || id}`}
        image={{ file: avatarSrc(id) }}
      />
      <div style={{ position: 'relative', marginTop: '10px', marginBottom: '20px' }}>
        <h1 className="center">
          DEX orders{' '}
          {addressUsernameOrServiceLink({ address: accountData?.address, addressDetails: accountData }, 'address', {
            short: isMobile
          })}
        </h1>
      </div>
      {totalOffers === 0 ? (
        <div className="center">
          <h3>No DEX orders found</h3>
          <p>This account doesn't have any active DEX orders.</p>
        </div>
      ) : (
        <FiltersFrame
          count={displayedOffers?.length}
          filtersHide={filtersHide}
          setFiltersHide={setFiltersHide}
          filters={{
            currency: currency || ''
          }}
          order={order}
          setOrder={setOrder}
          orderList={canShowSorting ? orderList : null}
        >
          {/* Left filters */}
          <>
            <div className="flex flex-col sm:gap-4 md:h-[400px]">
              {rendered && <CurrencySearchSelect setCurrency={setCurrency} defaultValue={currency} />}
              {!canShowSorting && totalOffers >= 1000 && (
                <div className="center">
                  <p className="grey">Sorting disabled for datasets with 1000+ items for performance.</p>
                </div>
              )}
            </div>
          </>

          {/* Main content */}
          <>
            {/* Desktop table */}
            {!isSsrMobile || width > 800 ? (
              <table className="table-large">
                <thead>
                  <tr>
                    <th className="center">#</th>
                    <th className="left">Offer</th>
                    <th className="right">Rate</th>
                    <th className="center">Action</th>
                  </tr>
                </thead>
                <tbody>{orderRows}</tbody>
              </table>
            ) : (
              /* Mobile view */
              <table className="table-mobile">
                <tbody>
                  <tr>
                    <th className="center">#</th>
                    <th className="left">Offer</th>
                    <th className="right">Rate</th>
                    <th className="center">Action</th>
                  </tr>
                  {orderRows}
                </tbody>
              </table>
            )}
          </>
        </FiltersFrame>
      )}
    </>
  )
}
