import { useTranslation } from 'next-i18next'

import { nativeCurrency, avatarSrc } from '../../utils'
import { shortNiceNumber } from '../../utils/format'

import SEO from '../SEO'
import SearchBlock from '../Layout/SearchBlock'
import AccountSummary from './AccountSummary'
//import LedgerData from './LedgerData'
//import PublicData from './PublicData'
//import XamanData from './XamanData'
//import ObjectsData from './ObjectsData'
//import NftData from './NftData'

export default function Account({ data, loading, errorMessage, ledgerTimestamp, account }) {
  const { t } = useTranslation()
  return (
    <>
      <SEO
        page="Account"
        title={
          t('explorer.header.account') +
          ' ' +
          (data?.service?.name || data?.username || data?.address || data?.id) +
          (data?.ledgerInfo?.balance > 1000000
            ? ' - ' + shortNiceNumber(data.ledgerInfo.balance / 1000000, 2, 0) + ' ' + nativeCurrency
            : '')
        }
        description={
          'Account details, transactions, NFTs, Tokens for ' +
          (data?.service?.name || data?.username) +
          ' ' +
          (data?.address || data?.id)
        }
        image={{ file: avatarSrc(data?.address) }}
      />
      <SearchBlock
        searchPlaceholderText={t('explorer.enter-address')}
        tab="account"
        userData={{
          username: data?.username,
          service: data?.service?.name,
          address: data?.address || data?.id
        }}
      />
      <div className="content-profile account">
        {data?.id ? (
          <>
            {loading ? (
              <div className="center" style={{ marginTop: '80px' }}>
                <span className="waiting"></span>
                <br />
                {t('general.loading')}
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="center orange bold">{errorMessage}</div>
                ) : (
                  <>
                    {data?.address && (
                      <>
                        {!ledgerTimestamp && (
                          <div className="show-on-small-w800">
                            <AccountSummary
                              data={data}
                              account={account}
                              //balances={balances}
                              //refreshPage={refreshPage}
                              //selectedCurrency={selectedCurrency}
                              //pageFiatRate={pageFiatRate}
                            />
                          </div>
                        )}
                        {/** 
                        <div className="center show-on-small-w800 grey" style={{ marginTop: 10 }}>
                          {((!account?.address && !data?.service) || data?.address === account?.address) &&
                            !data?.ledgerInfo?.blackholed && (
                              <>
                                <a
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setShownOnSmall(shownOnSmall === 'actions' ? null : 'actions')
                                  }}
                                >
                                  Actions
                                </a>{' '}
                                |{' '}
                              </>
                            )}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setShownOnSmall(shownOnSmall === 'timeMachine' ? null : 'timeMachine')
                            }}
                          >
                            Time machine
                          </a>
                        </div>

                        <div className="column-left">
                          <div className="hide-on-small-w800 avatar-div">
                            <Image
                              alt="avatar"
                              src={avatarSrc(data?.address, refreshPage)}
                              width="200"
                              height="200"
                              className="avatar"
                              priority
                            />
                          </div>

                          {((!account?.address && !data?.service) || data?.address === account?.address) &&
                            !data?.ledgerInfo?.blackholed && (
                              <table
                                className={'table-details autowidth hide-on-small-w800'}
                                style={shownOnSmall === 'actions' ? { display: 'table' } : null}
                              >
                                <thead>
                                  <tr>
                                    <th colSpan="100">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td colSpan="2" className="no-padding">
                                      <div className="flex flex-center">
                                        {!account?.address && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                redirect: 'account'
                                              })
                                            }
                                          >
                                            {t('signin.signin')}
                                          </button>
                                        )}

                                        {xahauNetwork && (
                                          <>
                                            {data.ledgerInfo.rewardLgrFirst ? (
                                              <button
                                                className="button-action button-wide thin"
                                                onClick={() =>
                                                  setSignRequest({
                                                    request: {
                                                      TransactionType: 'ClaimReward',
                                                      Account: data.address,
                                                      Flags: 1
                                                    }
                                                  })
                                                }
                                                disabled={
                                                  data.address !== account?.address || !data.ledgerInfo?.activated
                                                }
                                              >
                                                Rewards Opt-out
                                              </button>
                                            ) : (
                                              <button
                                                className="button-action button-wide thin"
                                                onClick={() =>
                                                  setSignRequest({
                                                    request: {
                                                      TransactionType: 'ClaimReward',
                                                      Issuer: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
                                                      Account: data.address
                                                    }
                                                  })
                                                }
                                                disabled={
                                                  data.address !== account?.address || !data.ledgerInfo?.activated
                                                }
                                              >
                                                Rewards Opt-in
                                              </button>
                                            )}
                                          </>
                                        )}

                                        {!devNet && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setAvatar',
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: data.address
                                                },
                                                data: {
                                                  signOnly: true,
                                                  action: 'set-avatar'
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address}
                                          >
                                            Set an Avatar
                                          </button>
                                        )}

                                        {!data.ledgerInfo.domain && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setDomain',
                                                request: {
                                                  TransactionType: 'AccountSet',
                                                  Account: data?.address
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address || !data?.ledgerInfo?.activated}
                                          >
                                            {t('button.set-domain')}
                                          </button>
                                        )}

                                        {!xahauNetwork && !data?.ledgerInfo?.did && (
                                          <button
                                            className="button-action button-wide thin"
                                            onClick={() =>
                                              setSignRequest({
                                                action: 'setDid',
                                                request: {
                                                  TransactionType: 'DIDSet',
                                                  Account: data?.address
                                                }
                                              })
                                            }
                                            disabled={data.address !== account?.address || !data?.ledgerInfo?.activated}
                                          >
                                            {t('button.set-did', { ns: 'account' })}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}

                          <table
                            className={'table-details autowidth hide-on-small-w800'}
                            style={shownOnSmall === 'timeMachine' ? { display: 'table' } : null}
                          >
                            <thead>
                              <tr>
                                <th colSpan="100">Time machine</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan="2" className="no-padding">
                                  <div className="time-machine">
                                    <DatePicker
                                      selected={ledgerTimestampInput || new Date()}
                                      onChange={setLedgerTimestampInput}
                                      selectsStart
                                      showTimeInput
                                      timeInputLabel={t('table.time')}
                                      minDate={new Date(data.inception * 1000)}
                                      maxDate={new Date()}
                                      dateFormat="yyyy/MM/dd HH:mm:ss"
                                      className="dateAndTimeRange"
                                      showMonthDropdown
                                      showYearDropdown
                                    />
                                  </div>
                                  <div className="flex flex-center">
                                    <button
                                      onClick={() => setLedgerTimestamp(ledgerTimestampInput)}
                                      className="button-action thin button-wide"
                                    >
                                      Update
                                    </button>{' '}
                                    <button onClick={resetTimeMachine} className="button-action thin button-wide">
                                      Reset
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="column-right">
                          {!ledgerTimestamp && (
                            <div className="hide-on-small-w800">
                              <AccountSummary
                                data={data}
                                account={account}
                                balances={balances}
                                refreshPage={refreshPage}
                                selectedCurrency={selectedCurrency}
                                pageFiatRate={pageFiatRate}
                              />
                              <br />
                            </div>
                          )}

                          <LedgerData
                            data={data}
                            account={account}
                            balances={balances}
                            selectedCurrency={selectedCurrency}
                            pageFiatRate={pageFiatRate}
                            networkInfo={networkInfo}
                            setSignRequest={setSignRequest}
                            fiatRate={fiatRate}
                            objects={objects}
                            gateway={gateway}
                          />
                          <PublicData data={data} />
                          <NftData data={data} objects={objects} ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp} />
                          {data?.ledgerInfo?.activated && !gateway && (
                            <ObjectsData
                              account={account}
                              setSignRequest={setSignRequest}
                              address={data?.address}
                              setObjects={setObjects}
                              ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                              selectedCurrency={selectedCurrency}
                              pageFiatRate={pageFiatRate}
                            />
                          )}
                          <XamanData data={data} />
                          <Did
                            data={data}
                            account={account}
                            setSignRequest={setSignRequest}
                            ledgerTimestamp={data?.ledgerInfo?.ledgerTimestamp}
                          />
                          <RelatedLinks data={data} />
                        </div>
                        */}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <h1 className="center">{t('explorer.header.account')}</h1>
            <p className="center">
              Here you will be able to see all the information about the account, including the transactions, tokens,
              NFTs, and more.
            </p>
          </>
        )}
      </div>
      <style jsx>{`
        .no-padding {
          padding: 0;
        }

        .no-padding .flex {
          gap: 10px;
          margin-top: 3px;
        }

        @media (min-width: 800px) {
          .button-wide {
            width: 100%;
          }
        }
        @media (max-width: 800px) {
          .button-wide {
            width: calc(50% - 27px);
          }
        }
      `}</style>
    </>
  )
}
