import { useCallback, useEffect, useMemo, useState } from 'react'
import SEO from '../../components/SEO'
import Link from 'next/link'
import axios from 'axios'
import { devNet, server, xahauNetwork } from '../../utils'
import { amountFormat, duration, fullDateAndTime } from '../../utils/format'
import { TbPigMoney } from 'react-icons/tb'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { rewardAutoClaim } from '../../styles/pages/reward-auto-claim.module.scss'
import { axiosServer, passHeaders } from '../../utils/axios'
import { useTranslation } from 'next-i18next'
import { LinkAccount } from '../../utils/links'
import { useRouter } from 'next/router'

// Constants
const RIPPLED_EPOCH_OFFSET = 946684800
const REWARD_DELAY_SECONDS = 2600000 // later take from hook
const SAFETY_MARGIN_SECONDS = 3600
const CRON_DELAY_SECONDS = 2603580 // 30d 3h 13m
const REPEAT_COUNT_MAX = 256
const FEE_BUFFER_DROPS = 2_000_000 // 2 XAH for fees buffer

const CLAIM_HOOK_HASH = '805351CE26FB79DA00647CEFED502F7E15C2ACCCE254F11DEFEDDCE241F8E9CA'
const CLAIM_ISSUER = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
const ASF_TSH_COLLECT = 11

export const getServerSideProps = async (context) => {
  const { locale, req } = context

  let networkInfo = null
  try {
    const networkData = await axiosServer({
      method: 'get',
      url: 'v2/server',
      headers: passHeaders(req)
    })
    networkInfo = networkData?.data || null
  } catch (e) {
    networkInfo = null
  }

  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      networkInfo,
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

const ToggleButton = ({ isOn, onEnable, onDisable, labels, disabled }) => (
  <button
    className={'button-action thin' + (isOn ? ' warning' : '')}
    onClick={() => (isOn ? onDisable() : onEnable())}
    disabled={disabled}
  >
    {isOn ? labels.off : labels.on}
  </button>
)

export default function RewardAutoClaim({ account, setSignRequest, networkInfo }) {
  const [loading, setLoading] = useState(true)
  const [loadingObjects, setLoadingObjects] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [addressInfo, setAddressInfo] = useState(null) // /v2/address
  const [objects, setObjects] = useState([]) // /v2/objects raw list
  const [objectsFetched, setObjectsFetched] = useState(false)

  const { t } = useTranslation()
  const router = useRouter()

  const isLoggedIn = !!account?.address

  const refetchAccount = useCallback(
    async (signal) => {
      if (!account?.address) return
      setErrorMessage('')
      try {
        const resp = await axios.get(
          `/v2/address/${account.address}?ledgerInfo=true&username=true&service=true&verifiedDomain=true`,
          { signal }
        )
        setAddressInfo(resp.data || null)
      } catch (e) {
        if (e?.message !== 'canceled') setErrorMessage('Error fetching account data.')
      }
    },
    [account?.address]
  )

  const refetchObjects = useCallback(
    async (signal) => {
      if (!account?.address) return
      setErrorMessage('')
      try {
        const resp = await axios.get(`v2/objects/${account.address}?limit=1000`, { signal })
        setObjects(resp.data?.objects || [])
        setObjectsFetched(true)
      } catch (e) {
        if (e?.message !== 'canceled') setErrorMessage('Error fetching account objects.')
        setObjects([])
        setObjectsFetched(false)
      }
    },
    [account?.address]
  )

  // 1) Load ledgerInfo
  useEffect(() => {
    const controller = new AbortController()

    async function loadAddress() {
      if (!account?.address) return
      setLoading(true)
      await refetchAccount(controller.signal)
      setLoading(false)
    }

    loadAddress()
    return () => controller.abort()
  }, [account?.address, refetchAccount])

  // 2) Load objects (Hook + Cron)
  useEffect(() => {
    const controller = new AbortController()

    async function loadObjects() {
      if (!account?.address) return
      setLoadingObjects(true)
      setObjectsFetched(false)
      await refetchObjects(controller.signal)
      setLoadingObjects(false)
    }

    loadObjects()
    return () => controller.abort()
  }, [account?.address, refetchObjects])

  const ledgerInfo = addressInfo?.ledgerInfo

  const isActivated = ledgerInfo?.activated === true
  const isDeleted = ledgerInfo?.deleted === true
  const canConfigure = isActivated && !isDeleted

  const balanceDrops = Number(ledgerInfo?.balance || 0)
  const baseReserveDrops = Number(networkInfo?.reserveBase || 1_000_000)

  const recommendedDrops = baseReserveDrops + FEE_BUFFER_DROPS
  const missingForRecommendedDrops = Math.max(0, recommendedDrops - balanceDrops)

  // === Checks ===
  const tshCollectEnabled = !!ledgerInfo?.flags?.tshCollect

  const hookHashes = useMemo(() => {
    const hookObject = objects?.find((o) => o.LedgerEntryType === 'Hook')
    const hooks = hookObject?.Hooks || []
    return hooks.map((h) => h?.Hook?.HookHash).filter(Boolean)
  }, [objects])

  const hookInstalled = objectsFetched && hookHashes.some((h) => String(h).toUpperCase() === CLAIM_HOOK_HASH)
  const cronObjects = useMemo(() => objects?.filter((o) => o.LedgerEntryType === 'Cron') || [], [objects])
  const cronActive = objectsFetched && cronObjects.length > 0

  // === ClaimReward-style timing (same as your XahauRewardTr) ===
  const timeNow = Math.floor(Date.now() / 1000)
  const rewardTimeUnix = ledgerInfo?.rewardTime ? Number(ledgerInfo.rewardTime) + RIPPLED_EPOCH_OFFSET : null

  const remainingSec = useMemo(() => {
    if (!rewardTimeUnix) return null
    return REWARD_DELAY_SECONDS - (timeNow - rewardTimeUnix)
  }, [rewardTimeUnix, timeNow])

  const claimable = remainingSec !== null ? remainingSec <= 0 : false

  const startTime = useMemo(() => {
    // CronSet StartTime is in ripple/xahau epoch seconds (not unix)
    // For first-time (not opted-in): use 0
    if (!ledgerInfo?.rewardTime) return 0
    const base = Number(ledgerInfo.rewardTime) + REWARD_DELAY_SECONDS
    return base + SAFETY_MARGIN_SECONDS // always +1h
  }, [ledgerInfo?.rewardTime])

  // === Build TXs ===
  const txEnableTshCollect = () => ({
    TransactionType: 'AccountSet',
    Account: account.address,
    SetFlag: ASF_TSH_COLLECT
  })

  const txDisableTshCollect = () => ({
    TransactionType: 'AccountSet',
    Account: account.address,
    ClearFlag: ASF_TSH_COLLECT
  })

  const txInstallOrUpdateHook = () => ({
    TransactionType: 'SetHook',
    Account: account.address,
    Hooks: [
      {
        Hook: {
          HookHash: CLAIM_HOOK_HASH,
          HookNamespace: '0000000000000000000000000000000000000000000000000000000000000000',
          HookOn: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFBFFFFF',
          //HookCanEmit: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFFFFFFFBFFFFF', // not supported in xaman yet
          Flags: 4
        }
      }
    ]
  })

  const txRemoveHook = () => ({
    TransactionType: 'SetHook',
    Account: account.address,
    Hooks: [
      {
        Hook: {
          CreateCode: '',
          Flags: 1
        }
      }
    ]
  })

  const txInstallOrUpdateCron = () => ({
    TransactionType: 'CronSet',
    Account: account.address,
    StartTime: startTime,
    RepeatCount: REPEAT_COUNT_MAX,
    DelaySeconds: CRON_DELAY_SECONDS
  })

  const txRemoveCron = () => ({
    TransactionType: 'CronSet',
    Account: account.address,
    Flags: 1
  })

  const sign = (request, { refreshAccount = true, refreshObjects = false } = {}) => {
    setErrorMessage('')
    setSignRequest({
      redirect: server + router.asPath,
      request,
      callback: (result) => {
        const status = result?.meta?.TransactionResult
        if (status && status !== 'tesSUCCESS') {
          setErrorMessage(`Transaction failed: ${status}`)
          return
        }

        // refresh latest states from API
        if (refreshAccount) refetchAccount()
        if (refreshObjects) refetchObjects()
      }
    })
  }

  if (!xahauNetwork) {
    return (
      <>
        <SEO title="Auto Claim Rewards" description="Xahau only" />
        <div className="content-center">
          <h1 className="center">Auto-claim rewards</h1>
          <p className="center red">This page is available only on Xahau network.</p>
        </div>
      </>
    )
  }

  return (
    <div className={rewardAutoClaim}>
      <SEO title="Auto-claim rewards" description="Automate reward claiming via Hook + CronSet on Xahau." />

      <div className="content-text content-center">
        <h1 className="center">Auto-claim Xahau rewards</h1>

        <p className="center grey">
          This page helps you automate monthly reward claiming using a <span className="bold">Hook</span> +{' '}
          <span className="bold">CronSet</span>. You will sign up 3 transactions: AccountSet, SetHook, CronSet.
        </p>

        {!isLoggedIn ? (
          <p className="center">
            Please{' '}
            <span className="link" onClick={() => setSignRequest({})}>
              sign in
            </span>{' '}
            to configure automation.
          </p>
        ) : (
          <>
            <p className="center">
              Address: <LinkAccount address={account.address} short={8} text={account?.username || account.address} />
            </p>

            {canConfigure ? (
              <div className="center" style={{ marginTop: 18 }}>
                <span className="grey bold">{amountFormat(ledgerInfo.balance)}</span>
              </div>
            ) : (
              <div className="form-container">
                <div className="flag-item">
                  <div>
                    <span className="bold">Account status</span>{' '}
                    <span className={`bold ${isDeleted ? 'red' : 'orange'}`}>
                      {isDeleted ? 'Account deleted' : 'Not activated'}
                    </span>
                  </div>
                  <div className="flag-description">
                    {isDeleted ? (
                      <>
                        <div className="red bold" style={{ marginBottom: 6 }}>
                          This account has been deactivated and is no longer active.
                        </div>
                        <div className="orange">
                          It can be restored by funding it again to meet reserve requirements.
                        </div>
                      </>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ marginBottom: 6 }}>
                          This account needs to be activated first. Activation requires at least{' '}
                          <b>{amountFormat(baseReserveDrops)}</b> (Base reserve).
                          {devNet && account?.address && (
                            <>
                              {' '}
                              <Link href={`/faucet?address=${account?.address}`}>Top up from faucet</Link>.
                            </>
                          )}
                        </div>

                        <div style={{ marginBottom: 6 }}>
                          <span className="grey">Current balance</span>: <b>{amountFormat(balanceDrops)}</b>
                        </div>

                        <div style={{ marginBottom: 6 }}>
                          <span className="grey">Recommended balance (reserve + fees buffer)</span>:{' '}
                          <b>{amountFormat(recommendedDrops)}</b>
                        </div>

                        {missingForRecommendedDrops > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <span className="grey">Missing to safely activate & configure</span>:{' '}
                            <b>{amountFormat(missingForRecommendedDrops)}</b>
                          </div>
                        )}

                        <a href="https://xrpl.org/reserves.html" target="_blank" rel="noreferrer">
                          Learn more about reserves.
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <br />
            <h4>Recommended order</h4>
            <div style={{ margin: '0 15px' }}>
              <p>
                1) Enable <b>asfTshCollect</b> (allows your account to cover fees for hook executions)
              </p>
              <p>
                2) Install the <b>ClaimReward Hook</b> (hook that emits the ClaimReward transaction)
              </p>
              <p>
                3) Install <b>Cron</b> (it triggers the hook repeatedly on schedule)
              </p>
            </div>
          </>
        )}

        {errorMessage && <p className="red center">{errorMessage}</p>}

        {!xahauNetwork ? (
          <p className="center red">This page is available only on Xahau network.</p>
        ) : (loading || loadingObjects) && isLoggedIn ? (
          <div className="center">
            <span className="waiting" />
          </div>
        ) : (
          isLoggedIn &&
          canConfigure && (
            <div className="form-container">
              {/* Rewards */}
              <div className="flag-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <span className="bold">Rewards status</span>{' '}
                    <span className={ledgerInfo?.rewardTime ? (claimable ? 'green' : 'grey') : 'orange'}>
                      {ledgerInfo?.rewardTime ? (claimable ? 'Claimable now' : 'Not claimable yet') : 'Not opted-in'}
                    </span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {claimable && (
                      <button
                        className="button-action thin"
                        onClick={() =>
                          sign({
                            TransactionType: 'ClaimReward',
                            Issuer: CLAIM_ISSUER,
                            Account: account.address
                          })
                        }
                      >
                        <TbPigMoney style={{ fontSize: 18, marginBottom: -4 }} /> Claim now
                      </button>
                    )}
                  </div>
                </div>

                <div className="flag-description">
                  {ledgerInfo?.rewardTime && (
                    <div style={{ marginBottom: 6 }}>
                      <span className="grey">Reward time</span>:{' '}
                      <span className="bold">{fullDateAndTime(ledgerInfo.rewardTime + RIPPLED_EPOCH_OFFSET)}</span>
                    </div>
                  )}

                  {remainingSec !== null && !claimable && (
                    <div style={{ marginBottom: 6 }}>
                      <span className="grey">Next claim in</span>:{' '}
                      <span className="bold">{duration(t, Math.max(0, Math.floor(remainingSec)))}</span>
                    </div>
                  )}

                  {objectsFetched && (
                    <div className="grey">
                      {hookInstalled && cronActive ? (
                        <>
                          Automatic claiming is <b>enabled</b>. Rewards will be claimed on schedule.
                        </>
                      ) : hookInstalled ? (
                        <>
                          Hook is installed, but Cron is not active. Rewards will <b>not</b> be claimed automatically.
                        </>
                      ) : cronActive ? (
                        <>Cron is active, but the ClaimReward Hook is missing. No automatic claims will occur.</>
                      ) : (
                        <>
                          Automatic claiming is <b>disabled</b>.
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* asfTshCollect */}
              <div className="flag-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div className="bold">
                    asfTshCollect{' '}
                    <span className={`${tshCollectEnabled ? 'green' : 'orange'}`}>
                      {tshCollectEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <ToggleButton
                      isOn={tshCollectEnabled}
                      onEnable={() => sign(txEnableTshCollect(), { refreshAccount: true })}
                      onDisable={() => sign(txDisableTshCollect(), { refreshAccount: true })}
                      labels={{ on: 'Enable', off: 'Disable' }}
                    />
                  </div>
                </div>

                <div className="flag-description">
                  <div style={{ marginBottom: 6 }}>AccountSet flag: Transaction Signature Hook Collect.</div>
                  <div>
                    Required for automation. This allows your account to pay small fees so hooks can run automatically.
                  </div>
                </div>
              </div>

              {objectsFetched && (
                <>
                  {/* Hook */}
                  <div className="flag-item">
                    <div
                      className="flex-row"
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
                    >
                      <div className="bold">
                        ClaimReward Hook{' '}
                        <span className={`${hookInstalled ? 'green' : 'orange'}`}>
                          {hookInstalled ? 'Installed' : 'Not installed'}
                        </span>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <ToggleButton
                          isOn={hookInstalled}
                          onEnable={() => sign(txInstallOrUpdateHook(), { refreshObjects: true })}
                          onDisable={() => sign(txRemoveHook(), { refreshObjects: true })}
                          labels={{ on: 'Install', off: 'Remove' }}
                          disabled={!objectsFetched}
                        />
                      </div>
                    </div>

                    <div className="flag-description">
                      <div style={{ marginBottom: 6 }}>
                        This hook emits a <b>ClaimReward</b> transaction when triggered by Cron.
                      </div>

                      <div className="grey">
                        HookHash: <span className="brake">{CLAIM_HOOK_HASH}</span>
                      </div>

                      <div className="orange" style={{ marginTop: 10 }}>
                        Security note: the hook hash shown above matches the known ClaimReward hook described in{' '}
                        <a
                          href="https://dev.to/ekiserrepe/learning-xahau-automating-reward-claims-with-hooks-and-cronset-n4k"
                          target="_blank"
                          rel="noreferrer"
                        >
                          this article
                        </a>
                        .
                      </div>
                    </div>
                  </div>

                  {/* Cron */}
                  <div className="flag-item">
                    <div
                      className="flex-row"
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
                    >
                      <div className="bold">
                        Cron schedule{' '}
                        <span className={`${cronActive ? 'green' : 'orange'}`}>
                          {cronActive ? 'Active' : 'Not active'}
                        </span>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <ToggleButton
                          isOn={cronActive}
                          onEnable={() => sign(txInstallOrUpdateCron(), { refreshObjects: true })}
                          onDisable={() => sign(txRemoveCron(), { refreshObjects: true })}
                          labels={{ on: 'Activate', off: 'Deactivate' }}
                          disabled={!objectsFetched || startTime === null}
                        />
                      </div>
                    </div>

                    <div className="flag-description">
                      <div style={{ marginBottom: 10 }}>
                        Cron will trigger your hook repeatedly. The hook then emits ClaimReward.
                      </div>

                      <div className="grey">
                        Start:{' '}
                        <span className="bold">
                          {startTime === 0 ? 'immediate' : fullDateAndTime(startTime + RIPPLED_EPOCH_OFFSET)}
                        </span>
                      </div>

                      <div className="grey" style={{ marginTop: 10 }}>
                        Repeat every: <span className="bold">{duration(t, CRON_DELAY_SECONDS)}</span> (includes 1 hour
                        margin).
                      </div>

                      <div className="grey" style={{ marginTop: 10 }}>
                        Repeat count: <b>{REPEAT_COUNT_MAX}</b> (maximum)
                      </div>

                      <div className="orange" style={{ marginTop: 12 }}>
                        Note: “Deactivate” will stop future triggers.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
