import { useEffect, useMemo, useState } from 'react'
import SEO from '../../components/SEO'
import Link from 'next/link'
import axios from 'axios'
import { devNet, xahauNetwork } from '../../utils'
import CheckBox from '../../components/UI/CheckBox'
import { amountFormat } from '../../utils/format'
import { TbPigMoney } from 'react-icons/tb'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { rewardAutoClaim } from '../../styles/pages/reward-auto-claim.module.scss'
import { axiosServer, passHeaders } from '../../utils/axios'

// Constants
const RIPPLED_EPOCH_OFFSET = 946684800
const REWARD_DELAY_SECONDS = 2600000 // later take from hook
const SAFETY_MARGIN_SECONDS = 3600
const CRON_DELAY_SECONDS = 2603580 // 30d 3h 13m
const REPEAT_COUNT_MAX = 256
const FEE_BUFFER_DROPS = 2_000_000 // 2 XAH for fees buffer

const CLAIM_HOOK_HASH = '805351CE26FB79DA00647CEFED502F7E15C2ACCCE254F11DEFEDDCE241F8E9CA'
const CLAIM_ISSUER = 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'

// AccountSet / Hook / Cron constants
const ASF_TSH_COLLECT = 11
const SET_HOOK_REMOVE_FLAGS = 1 // SetHook delete uses Flags:1 with empty CreateCode (typical pattern)

// Optional: if you want to support cron unset explicitly:
const CRON_UNSET_FLAG = 1

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

export default function RewardAutoClaim({ account, setSignRequest, networkInfo }) {
  const [loading, setLoading] = useState(true)
  const [loadingObjects, setLoadingObjects] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [addressInfo, setAddressInfo] = useState(null) // /v2/address
  const [objects, setObjects] = useState([]) // /v2/objects raw list
  const [objectsFetched, setObjectsFetched] = useState(false)

  // User options
  const [useSafetyMargin, setUseSafetyMargin] = useState(true)
  const [repeatCount, setRepeatCount] = useState(REPEAT_COUNT_MAX)
  const [delaySeconds, setDelaySeconds] = useState(CRON_DELAY_SECONDS)

  const isLoggedIn = !!account?.address

  // 1) Load ledgerInfo
  useEffect(() => {
    const controller = new AbortController()

    async function loadAddress() {
      if (!account?.address) return
      setLoading(true)
      setErrorMessage('')
      try {
        const resp = await axios.get(
          `/v2/address/${account.address}?ledgerInfo=true&username=true&service=true&verifiedDomain=true`,
          { signal: controller.signal }
        )
        setAddressInfo(resp.data || null)
      } catch (e) {
        if (e?.message !== 'canceled') setErrorMessage('Error fetching account data.')
      } finally {
        setLoading(false)
      }
    }

    loadAddress()
    return () => controller.abort()
  }, [account?.address])

  // 2) Load objects (Hook + Cron)
  useEffect(() => {
    const controller = new AbortController()

    async function loadObjects() {
      if (!account?.address) return
      setLoadingObjects(true)
      setObjectsFetched(false)
      setErrorMessage('')
      try {
        const resp = await axios.get(`v2/objects/${account.address}?limit=1000`, { signal: controller.signal })
        setObjects(resp.data?.objects || [])
        setObjectsFetched(true)
      } catch (e) {
        if (e?.message !== 'canceled') setErrorMessage('Error fetching account objects.')
        setObjects([])
        setObjectsFetched(false)
      } finally {
        setLoadingObjects(false)
      }
    }

    loadObjects()
    return () => controller.abort()
  }, [account?.address])

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
    return useSafetyMargin ? base + SAFETY_MARGIN_SECONDS : base
  }, [ledgerInfo?.rewardTime, useSafetyMargin])

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
          HookCanEmit: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFFFFFFFFFFFFFFFFBFFFFF',
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
          Flags: SET_HOOK_REMOVE_FLAGS
        }
      }
    ]
  })

  const txInstallOrUpdateCron = () => ({
    TransactionType: 'CronSet',
    Account: account.address,
    StartTime: startTime, // 0 if first time / not opted-in yet
    RepeatCount: Math.max(1, Math.min(REPEAT_COUNT_MAX, Number(repeatCount) || 1)),
    DelaySeconds: Math.max(1, Number(delaySeconds) || CRON_DELAY_SECONDS)
  })

  const txRemoveCron = () => ({
    TransactionType: 'CronSet',
    Account: account.address,
    Flags: CRON_UNSET_FLAG
  })

  const sign = (request, okMsg) => {
    setErrorMessage('')
    setSuccessMessage('')
    setSignRequest({
      request,
      callback: (result) => {
        const status = result?.meta?.TransactionResult
        if (status && status !== 'tesSUCCESS') setErrorMessage(`Transaction failed: ${status}`)
        else setSuccessMessage(okMsg || 'Transaction signed successfully.')
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
          This page helps you automate monthly reward claiming using a <b>Hook</b> + <b>CronSet</b>.
          <br />
          You will sign up to 3 transactions (AccountSet, SetHook, CronSet).
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
              Address: <b>{account.address}</b>
            </p>

            {canConfigure ? (
              <div className="center" style={{ marginTop: 18 }}>
                <b className="grey">{amountFormat(ledgerInfo.balance)}</b> •{' '}
                <Link href={`/account/${account.address}`}>View account</Link>
              </div>
            ) : (
              <div className="form-container">
                <div className="flag-item">
                  <div className="flag-header">
                    <div className="flag-info">
                      <span className="flag-name">Account status</span>
                      <span className={`flag-status ${isDeleted ? 'red' : 'orange'}`}>
                        {isDeleted ? 'Account deleted' : 'Not activated'}
                      </span>
                    </div>
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

            <div className="flag-item">
              <div className="flag-header">
                <div className="flag-info">
                  <span className="flag-name">Recommended order</span>
                </div>
              </div>

              <div className="flag-description">
                <div style={{ marginBottom: 6 }}>
                  1) Enable <b>asfTshCollect</b> (allows your account to cover fees for hook executions)
                </div>
                <div style={{ marginBottom: 6 }}>
                  2) Install the <b>ClaimReward Hook</b> (hook that emits the ClaimReward transaction)
                </div>
                <div>
                  3) Install <b>Cron</b> (it triggers the hook repeatedly on schedule)
                </div>
              </div>
            </div>
          </>
        )}

        {errorMessage && <p className="red center">{errorMessage}</p>}
        {successMessage && <p className="green center">{successMessage}</p>}

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
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">Rewards status</span>
                    <span className="flag-status">
                      {ledgerInfo?.rewardTime ? (claimable ? 'Claimable now' : 'Not claimable yet') : 'Not opted-in'}
                    </span>
                  </div>
                  <div className="flag-info-buttons">
                    {claimable && (
                      <button
                        className="button-action thin"
                        onClick={() =>
                          sign(
                            { TransactionType: 'ClaimReward', Issuer: CLAIM_ISSUER, Account: account.address },
                            'ClaimReward signed.'
                          )
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
                      <span className="grey">Reward time</span>: <b>{ledgerInfo.rewardTime}</b>
                    </div>
                  )}

                  {remainingSec !== null && !claimable && (
                    <div style={{ marginBottom: 6 }}>
                      <span className="grey">Next claim in</span>: <b>{Math.max(0, Math.floor(remainingSec))}</b>{' '}
                      seconds
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
                <div className="flag-header">
                  <div className="flag-info">
                    <span className="flag-name">asfTshCollect</span>
                    <span className={`flag-status ${tshCollectEnabled ? 'green' : 'orange'}`}>
                      {tshCollectEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flag-info-buttons">
                    <button
                      className="button-action thin"
                      onClick={() => sign(txEnableTshCollect(), 'asfTshCollect enabled.')}
                      disabled={tshCollectEnabled}
                    >
                      Install
                    </button>
                    <button
                      className="button-action thin"
                      onClick={() => sign(txDisableTshCollect(), 'asfTshCollect disabled.')}
                      disabled={!tshCollectEnabled}
                    >
                      Remove
                    </button>
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
                    <div className="flag-header">
                      <div className="flag-info">
                        <span className="flag-name">ClaimReward Hook</span>
                        <span className={`flag-status ${hookInstalled ? 'green' : 'orange'}`}>
                          {hookInstalled ? 'Installed' : 'Not installed'}
                        </span>
                      </div>
                      <div className="flag-info-buttons">
                        <button
                          className="button-action thin"
                          onClick={() =>
                            sign(txInstallOrUpdateHook(), hookInstalled ? 'Hook updated.' : 'Hook installed.')
                          }
                        >
                          {hookInstalled ? 'Update' : 'Install'}
                        </button>
                        <button
                          className="button-action thin"
                          onClick={() => sign(txRemoveHook(), 'Hook removed.')}
                          disabled={!hookInstalled}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="flag-description">
                      <div style={{ marginBottom: 6 }}>
                        This hook emits a <b>ClaimReward</b> transaction when triggered by Cron.
                      </div>
                      <div className="grey">
                        HookHash: <span className="grey">{CLAIM_HOOK_HASH}</span>
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
                    <div className="flag-header">
                      <div className="flag-info">
                        <span className="flag-name">Cron schedule</span>
                        <span className={`flag-status ${cronActive ? 'green' : 'orange'}`}>
                          {cronActive ? `Active (${cronObjects.length})` : 'Not active'}
                        </span>
                      </div>
                      <div className="flag-info-buttons">
                        <button
                          className="button-action thin"
                          onClick={() =>
                            sign(txInstallOrUpdateCron(), cronActive ? 'Cron updated.' : 'Cron installed.')
                          }
                        >
                          {cronActive ? 'Update' : 'Install'}
                        </button>
                        <button
                          className="button-action thin"
                          onClick={() => sign(txRemoveCron(), 'Cron removed.')}
                          disabled={!cronActive}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="flag-description">
                      <div style={{ marginBottom: 10 }}>
                        Cron will trigger your hook repeatedly. The hook then emits ClaimReward.
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <CheckBox checked={useSafetyMargin} setChecked={() => setUseSafetyMargin(!useSafetyMargin)}>
                          Use +1 hour safety margin (recommended)
                        </CheckBox>
                        <div className="grey" style={{ marginTop: 6 }}>
                          Adds 3600 seconds to StartTime to avoid edge cases when claiming too early.
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <div className="grey">StartTime</div>
                          <b>{String(startTime)}</b>
                          <div className="grey" style={{ marginTop: 4 }}>
                            0 = immediate start (use when not opted-in yet)
                          </div>
                        </div>

                        <div>
                          <div className="grey">DelaySeconds</div>
                          <input
                            className="input-text"
                            style={{ maxWidth: 180 }}
                            value={String(delaySeconds)}
                            onChange={(e) => setDelaySeconds(e.target.value)}
                            inputMode="numeric"
                          />
                          <div className="grey" style={{ marginTop: 4 }}>
                            Time between triggers. Default includes safety margin.
                          </div>
                        </div>

                        <div>
                          <div className="grey">RepeatCount</div>
                          <input
                            className="input-text"
                            style={{ maxWidth: 180 }}
                            value={String(repeatCount)}
                            onChange={(e) => setRepeatCount(e.target.value)}
                            inputMode="numeric"
                          />
                          <div className="grey" style={{ marginTop: 4 }}>
                            12 ≈ 1 year • 256 ≈ 21 years
                          </div>
                        </div>
                      </div>

                      <div className="orange" style={{ marginTop: 12 }}>
                        Note: “Remove” will stop future triggers. It does not undo past claims.
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
