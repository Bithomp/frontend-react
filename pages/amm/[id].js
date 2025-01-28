import React from 'react'
import axios from 'axios'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SearchBlock from '../../components/Layout/SearchBlock'
import SEO from '../../components/SEO'
import { addQueryParams, removeQueryParams, useWidth } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import {
  lpTokenName,
  shortHash,
  fullDateAndTime,
  fullNiceNumber,
  trAmountWithGateway,
  showAmmPercents,
  timeFromNow,
  AddressWithIconFilled
} from '../../utils/format'
import { LinkTx } from '../../utils/links'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import CopyButton from '../../components/UI/CopyButton'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { axiosServer, passHeaders } from '../../utils/axios'

export async function getServerSideProps(context) {
  const { locale, query, req } = context
  let initialData = null
  const { id, ledgerTimestamp } = query
  let errorMessage = null
  try {
    const res = await axiosServer({
      method: 'get',
      url: 'v2/amm/' + id + (ledgerTimestamp ? '?ledgerTimestamp=' + ledgerTimestamp : ''),
      headers: passHeaders(req)
    }).catch((error) => {
      errorMessage = error.message
    })
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      id,
      initialData: initialData,
      ledgerTimestampQuery: Date.parse(ledgerTimestamp) || '',
      initialErrorMessage: errorMessage || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

export default function Amm({ id, initialData, initialErrorMessage, ledgerTimestampQuery }) {
  const { t, i18n } = useTranslation()
  const width = useWidth()
  const router = useRouter()
  const [ledgerTimestamp, setLedgerTimestamp] = useState(ledgerTimestampQuery)
  const [ledgerTimestampInput, setLedgerTimestampInput] = useState(ledgerTimestampQuery)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage)
  const [data, setData] = useState(initialData)
  const [userData, setUserData] = useState({ ...initialData?.accountDetails, address: initialData?.account })

  const checkApi = async () => {
    if (!id) return
    setLoading(true)
    setErrorMessage('')

    const response = await axios(
      'v2/amm/' + id + (ledgerTimestamp ? '?ledgerTimestamp=' + new Date(ledgerTimestamp).toISOString() : '')
    ).catch((error) => {
      setErrorMessage(t('error.' + error.message))
      setLoading(false)
    })
    setLoading(false)
    let newdata = response?.data
    if (newdata) {
      if (newdata.account) {
        setData(newdata)
        setUserData({ ...newdata.accountDetails, address: newdata.account })
        if (newdata.ledgerTimestamp) {
          const getParamTimestamp = new Date(newdata.ledgerTimestamp * 1000).toISOString()
          addQueryParams(router, [{ name: 'ledgerTimestamp', value: getParamTimestamp }])
        } else {
          removeQueryParams(router, ['ledgerTimestamp'])
        }
      } else {
        if (newdata.error === 'Account malformed.') {
          setErrorMessage('No information found for that AMM ID at this time of that day.')
        } else if (newdata.error) {
          setErrorMessage(t('error-api.' + newdata.error))
        } else {
          setErrorMessage('Error')
          console.log(newdata)
        }
      }
    }
  }

  useEffect(() => {
    if (ledgerTimestamp === '') return // do not call API on first render, its null on reset
    if (!ledgerTimestamp || (ledgerTimestamp && ledgerTimestamp !== ledgerTimestampQuery)) {
      checkApi()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerTimestamp])

  const resetTimeMachine = () => {
    setLedgerTimestamp(null)
    setLedgerTimestampInput(null)
  }

  const lpToken = lpTokenName(data)

  const timeMachineButtons = (
    <>
      <button
        onClick={() => setLedgerTimestamp(Date.parse(ledgerTimestampInput))}
        className="button-action thin narrow"
      >
        Update
      </button>{' '}
      <button onClick={resetTimeMachine} className="button-action thin narrow">
        Reset
      </button>
    </>
  )

  const oldDateAndTime = (
    <span className="orange bold" style={{ float: 'right' }}>
      {data.ledgerTimestamp ? fullDateAndTime(data.ledgerTimestamp) : ''}
    </span>
  )

  return (
    <>
      <SEO
        page="AMM"
        title={
          t('explorer.header.amm') +
          ' ' +
          lpToken +
          ' ' +
          (data?.ledgerTimestamp ? ' ' + fullDateAndTime(data.ledgerTimestamp, null, { asText: true }) : '')
        }
        description={
          'Automated market maker pool details for ' +
          lpToken +
          ' ' +
          shortHash(data?.ammID) +
          (data?.ledgerTimestamp ? ' ' + fullDateAndTime(data.ledgerTimestamp, null, { asText: true }) : '')
        }
      />
      <SearchBlock
        tab="amm"
        searchPlaceholderText={
          width > 600
            ? 'Search by AMM ID, Liquidity Pool (LP) token, AMM owner address'
            : 'AMM ID, LP token or AMM address'
        }
        userData={userData}
      />
      <div className="content-center short-top amm">
        <div className={width > 600 ? '' : 'center'}>
          Time machine:{' '}
          <DatePicker
            selected={ledgerTimestampInput || new Date()}
            onChange={setLedgerTimestampInput}
            selectsStart
            showTimeInput
            timeInputLabel={t('table.time')}
            minDate={new Date(data?.createdAt * 1000)}
            maxDate={new Date()}
            dateFormat="yyyy/MM/dd HH:mm:ss"
            className="dateAndTimeRange"
            showMonthDropdown
            showYearDropdown
          />
          {width > 600 ? (
            timeMachineButtons
          ) : (
            <>
              <br />
              {timeMachineButtons}
              <br />
              <br />
            </>
          )}
        </div>

        {loading ? (
          <div className="center" style={{ marginTop: '80px' }}>
            <span className="waiting"></span>
            <br />
            {t('general.loading')}
          </div>
        ) : (
          <>
            {errorMessage ? (
              <div className="orange bold">
                <br />
                {errorMessage}
              </div>
            ) : (
              <>
                {data?.ammID && (
                  <div>
                    <table className="table-details">
                      <thead>
                        <tr>
                          <th colSpan="100">
                            Automated market maker pool
                            {oldDateAndTime}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>AMM ID</td>
                          <td>
                            {shortHash(data.ammID, 10)} <CopyButton text={data.ammID} />
                          </td>
                        </tr>
                        <tr>
                          <td>{t('table.address')}</td>
                          <td>
                            <AddressWithIconFilled data={data} name="account" />
                          </td>
                        </tr>
                        {trAmountWithGateway({ amount: data.amount, name: 'Asset 1' })}
                        {trAmountWithGateway({ amount: data.amount2, name: 'Asset 2' })}
                        <tr>
                          <td>Trading fee</td>
                          <td>{showAmmPercents(data.tradingFee)}</td>
                        </tr>
                        <tr>
                          <td>Balance</td>
                          <td>
                            {fullNiceNumber(data.lpTokenBalance.value)}
                            {' ' + lpToken}
                          </td>
                        </tr>
                        <tr>
                          <td>Currency code</td>
                          <td>
                            {data.lpTokenBalance.currency} <CopyButton text={data.lpTokenBalance.currency} />
                          </td>
                        </tr>
                        <tr>
                          <td>Created</td>
                          <td>
                            {timeFromNow(data.createdAt, i18n)}
                            {', '}
                            {fullDateAndTime(data.createdAt)} <LinkTx tx={data.createdTxHash} icon={true} />
                          </td>
                        </tr>
                        {data.createdAt !== data.updatedAt && (
                          <tr>
                            <td>Last update</td>
                            <td>
                              {timeFromNow(data.updatedAt, i18n)}
                              {', '}
                              {fullDateAndTime(data.updatedAt)} <LinkTx tx={data.updatedTxHash} icon={true} />
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {data?.auctionSlot && (
                      <table className="table-details">
                        <thead>
                          <tr>
                            <th colSpan="100">Auction slot {oldDateAndTime}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{t('table.owner')}</td>
                            <td>
                              <AddressWithIconFilled data={data.auctionSlot} name="account" />
                            </td>
                          </tr>

                          {data.auctionSlot.authAccounts?.length > 0 ? (
                            data.auctionSlot.authAccounts.map((account, i) => (
                              <tr key={i}>
                                <td>Authorized account {data.auctionSlot.authAccounts.length > 1 ? i + 1 : ''}</td>
                                <td>
                                  <AddressWithIconFilled data={account} name="account" />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td>Authorized accounts</td>
                              <td>
                                There are no additional accounts that are authorized to trade at the discounted fee for
                                this AMM instance.
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td>Discounted fee</td>
                            <td>{showAmmPercents(data.auctionSlot.discountedFee)}</td>
                          </tr>
                          <tr>
                            <td>Price</td>
                            <td>
                              {fullNiceNumber(data.auctionSlot.price.value)}
                              {' ' + lpToken + ' '}
                            </td>
                          </tr>
                          {data.auctionSlot.timeInterval && (
                            <tr>
                              <td>Time interval</td>
                              <td>{data.auctionSlot.timeInterval + 1 + '/20'}</td>
                            </tr>
                          )}
                          <tr>
                            <td>Expiration</td>
                            <td>
                              {timeFromNow(data.auctionSlot.expiration, i18n)}
                              {', '}
                              {fullDateAndTime(data.auctionSlot.expiration)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    )}

                    {data?.voteSlots?.length > 0 && (
                      <table className="table-details">
                        <thead>
                          <tr>
                            <th colSpan="100">Vote slots {oldDateAndTime}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.voteSlots.map((slot, i) => (
                            <React.Fragment key={i}>
                              <tr>
                                <td>Voter {data.voteSlots.length > 1 ? i + 1 : ''}</td>
                                <td>
                                  <AddressWithIconFilled data={slot} name="account" />
                                </td>
                              </tr>
                              <tr>
                                <td>Trading fee</td>
                                <td>{showAmmPercents(slot.tradingFee)}</td>
                              </tr>
                              <tr>
                                <td>Vote weight</td>
                                <td>{showAmmPercents(slot.voteWeight)}</td>
                              </tr>
                              {slot.createdAt && (
                                <>
                                  <tr>
                                    <td>Created</td>
                                    <td>
                                      {timeFromNow(slot.createdAt, i18n)}
                                      {', '}
                                      {fullDateAndTime(slot.createdAt)} <LinkTx tx={slot.createdTxHash} icon={true} />
                                    </td>
                                  </tr>

                                  {slot.createdAt !== slot.updatedAt && (
                                    <tr>
                                      <td>Last update</td>
                                      <td>
                                        {timeFromNow(data.updatedAt, i18n)}
                                        {', '}
                                        {fullDateAndTime(data.updatedAt)} <LinkTx tx={slot.updatedTxHash} icon={true} />
                                      </td>
                                    </tr>
                                  )}
                                </>
                              )}
                              {i !== data.voteSlots.length - 1 && (
                                <tr>
                                  <td colSpan="100">
                                    <hr />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
