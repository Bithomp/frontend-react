import { useTranslation, Trans } from 'next-i18next'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { getIsSsrMobile } from '../utils/mobile'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import SEO from '../components/SEO'

import { wssServer, xahauNetwork } from '../utils'
import { niceNumber, fullDateAndTime } from '../utils/format'
import { LedgerLink } from '../utils/links'

let ws = null

function sendData() {
  if (ws.readyState) {
    ws.send(JSON.stringify({ command: 'subscribe', streams: [xahauNetwork ? 'uritokens' : 'nftokens'], id: 1 }))
  } else {
    setTimeout(sendData, 1000)
  }
}

export default function NftStatistics() {
  const { t } = useTranslation()

  const [data, setData] = useState(null)

  const connect = () => {
    ws = new WebSocket(wssServer)

    ws.onopen = () => {
      sendData()
    }

    ws.onmessage = (evt) => {
      const message = JSON.parse(evt.data)
      setData(message)
      /*
        {
          "type": "NFTokens",
          "crawler": {
            "ledgerIndex": 7025469,
            "ledgerTime": 1656405521,
          },
          "validatedLedger": {
            "age": 3,
            "hash": "814430F058D4BBFB3677E6536EA61D0FA8125E18351FE47C467E09322F8BF5F5",
            "ledgerTime": 1656405521,
            "ledgerIndex": 3384852
          },
          "allTime": {
            "created": 139470,
            "burned": 9298,
            "burnable": 21054,
            "onlyXRP": 12607,
            "transferable": 112271,
            "owners": 12396,
            "issuers": 14186,
            "transfers": 18552,
            "forSale": 5750,
            "forSaleWithoutDestination": 3829,
            "forSaleWithDestination": 1928
          }
        }
      */
    }

    ws.onclose = () => {
      connect()
    }
  }

  useEffect(() => {
    if (navigator.onLine) {
      connect()
    }
    return () => {
      setData(null)
      if (ws) ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nft = data?.allTime
  const crawlerIndex = data?.crawler?.ledgerIndex
  const currentLedgerIndex = data?.validatedLedger.ledgerIndex
  const crawlerTime = data?.crawler?.ledgerTime && fullDateAndTime(data.crawler.ledgerTime, null, { asText: true })
  const currentLedgerTime =
    data?.validatedLedger.ledgerTime && fullDateAndTime(data.validatedLedger.ledgerTime, null, { asText: true })

  let lag = false
  if (crawlerIndex && currentLedgerIndex) {
    //check if ledger index gap is more than 2
    if (currentLedgerIndex - crawlerIndex > 2) {
      //crawler is lagging bihind
      lag = currentLedgerIndex - crawlerIndex
    }
  }

  return (
    <div className="content-text content-center">
      <SEO title={t('nft-statistics.header')} />
      <h1 className="center">{t('nft-statistics.header')}</h1>
      <div className="main-box">
        {lag ? (
          <p className="orange">
            <Trans i18nKey="nft-statistics.text0">
              The informations is a bit outdated, we need to catch up with <b>{{ lag }}</b> ledgers.
              <br />
              The data is provided for the ledger #{{ crawlerIndex }}, ({{ crawlerTime }}). The last validated ledger is
              #{{ currentLedgerIndex }}, ({{ currentLedgerTime }}).
            </Trans>
          </p>
        ) : (
          <>
            <p>
              {t('table.updated')}: {crawlerTime}
            </p>
            <p>
              {t('nft-statistics.ledger-index')}: <LedgerLink version={crawlerIndex} />
            </p>
          </>
        )}
        <p>
          {t('nft-statistics.created')}:{' '}
          <Link href="/nft-explorer?mintedPeriod=all&includeBurned=true&includeWithoutMediaData=true">
            {niceNumber(nft?.created)}
          </Link>
        </p>
        <p>
          {t('nft-statistics.burned')}:{' '}
          <Link href="/nft-explorer?includeBurned=true&includeWithoutMediaData=true&burnedPeriod=all&mintedPeriod=all">
            {niceNumber(nft?.burned)}
          </Link>
        </p>
        <p>
          {t('nft-statistics.exist')}:{' '}
          <Link href="/nft-explorer?mintedPeriod=all&includeWithoutMediaData=true">
            {nft && niceNumber(nft.created - nft.burned)}
          </Link>
        </p>
        <p>
          {t('nft-statistics.owners')}: <Link href="/nft-distribution?order=total">{niceNumber(nft?.owners)}</Link>
        </p>
        <p>
          {t('nft-statistics.issuers')}:{' '}
          <Link href="/nft-volumes?period=all&list=issuers">{niceNumber(nft?.issuers)}</Link>
        </p>
        <p>
          {t('nft-statistics.transfers')}: {niceNumber(nft?.transfers)}
        </p>
        <p>
          {t('nft-statistics.for-sale')}: {niceNumber(nft?.forSale)}
        </p>
        <p>
          {t('nft-statistics.for-sale-without-destination')}:{' '}
          {xahauNetwork ? (
            niceNumber(nft?.forSaleWithoutDestination)
          ) : (
            <Link href="/nft-explorer?mintedPeriod=all&includeBurned=true&includeWithoutMediaData=true&list=onSale">
              {niceNumber(nft?.forSaleWithoutDestination)}
            </Link>
          )}
        </p>
        <p>
          {t('nft-statistics.for-sale-with-destination')}: {niceNumber(nft?.forSaleWithDestination)}
        </p>
        <p>
          {t('nft-statistics.burnable')}: {niceNumber(nft?.burnable)}
        </p>
        {!xahauNetwork && (
          <>
            <p>
              {t('nft-statistics.only-xrp')}: {niceNumber(nft?.onlyXRP)}
            </p>
            <p>
              {t('nft-statistics.transferable')}: {niceNumber(nft?.transferable)}
            </p>
          </>
        )}
        <p className="center" style={{ position: 'absolute', top: 'calc(50% - 72px)', left: 'calc(50% - 54px)' }}>
          {!data && (
            <>
              <span className="waiting"></span>
              <br />
              {t('general.loading')}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
