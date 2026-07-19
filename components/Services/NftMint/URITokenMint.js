import { useState, useEffect } from 'react'
import { Trans, useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { sha512 } from 'crypto-hash'
import axios from 'axios'
import {
  addAndRemoveQueryParams,
  encode,
  isIdValid,
  isValidJson,
  server,
  xahauNetwork,
  typeNumberOnly,
  nativeCurrency,
  isNativeCurrency
} from '../../../utils'
import { multiply } from '../../../utils/calc'
const checkmark = '/images/checkmark.svg'
import CheckBox from '../../UI/CheckBox'
import AddressInput from '../../UI/AddressInput'
import TokenSelector from '../../UI/TokenSelector'

let interval
let startTime

export default function URITokenMint({
  setSignRequest,
  uriQuery,
  digestQuery,
  account,
  burnableQuery,
  sellQuery,
  amountQuery,
  currencyQuery,
  currencyIssuerQuery,
  destinationQuery
}) {
  const { i18n, t } = useTranslation(['common', 'services'])
  const ts = (key, options) => t(key, { ns: 'services', ...options })
  const router = useRouter()

  const [uri, setUri] = useState(uriQuery)
  const [digest, setDigest] = useState(digestQuery)
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [metadataError, setMetadataError] = useState('')
  const [calculateDigest, setCalculateDigest] = useState(false)
  const [metadata, setMetadata] = useState('')
  const [metadataStatus, setMetadataStatus] = useState('')
  const [metaLoadedFromUri, setMetaLoadedFromUri] = useState(false)
  const [update, setUpdate] = useState(false)
  const [minted, setMinted] = useState('')
  const [uriValidDigest, setUriValidDigest] = useState(isIdValid(digestQuery))
  const [createSellOffer, setCreateSellOffer] = useState(sellQuery === 'true')
  const [amount, setAmount] = useState(amountQuery || '')
  const [destination, setDestination] = useState(destinationQuery || '')
  const [selectedToken, setSelectedToken] = useState({
    currency: currencyQuery || nativeCurrency,
    issuer: currencyIssuerQuery || null
  })
  const [flags, setFlags] = useState({
    tfBurnable: burnableQuery === 'true'
  })
  const [mintAndSend, setMintAndSend] = useState(false)

  let uriRef
  let digestRef

  useEffect(() => {
    //on component unmount
    return () => {
      setUpdate(false)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (update) {
      interval = setInterval(() => getMetadata(), 5000) //5 seconds
    } else {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update])

  useEffect(() => {
    setErrorMessage('')
  }, [i18n.language])

  // Do not auto-reset createSellOffer so sell=true in URL survives refresh

  const onUriChange = (e) => {
    let uri = e.target.value
    setUri(uri)
    setMetaLoadedFromUri(false)
    setMetadata('')
    setDigest('')
    setMetadataError('')
    setUriValidDigest(false)
  }

  const getMetadata = async () => {
    setMetadataStatus(ts('nft-mint.metadataLoading'))
    const nftType = xahauNetwork ? 'xls35' : 'xls20'
    const response = await axios.get('v2/metadata?url=' + encodeURIComponent(uri) + '&type=' + nftType).catch(() => {
      console.log("ERROR: can't get nft metadata")
      setMetadataStatus('error')
    })
    if (response?.data) {
      if (response.data?.metadata) {
        setMetaLoadedFromUri(true)
        setMetadata(JSON.stringify(response.data.metadata, undefined, 4))
        checkDigest(response.data.metadata)
        setMetadataStatus('')
        setUpdate(false)
      } else if (response.data?.message) {
        setMetadataStatus(response.data.message)
        setUpdate(false)
      } else {
        if (Date.now() - startTime < 120000) {
          // 2 minutes
          setUpdate(true)
          setMetadataStatus(
            ts('nft-mint.metadataLoadingAttempt', {
              attempt: Math.ceil((Date.now() - startTime) / 1000 / 5)
            })
          )
        } else {
          setUpdate(false)
          setMetadataStatus(ts('nft-mint.metadataLoadFailed'))
        }
      }
    }
  }

  const loadMetadata = async () => {
    if (uri) {
      setMetaLoadedFromUri(false)
      getMetadata()
      startTime = Date.now()
    } else {
      setMetadataStatus(ts('nft-mint.metadataEnterUri'))
      uriRef?.focus()
    }
  }

  const onDigestChange = (e) => {
    let digest = e.target.value
    setDigest(digest)
  }

  const onAmountChange = (e) => {
    setAmount(e.target.value)
  }

  const onDestinationChange = (value) => {
    if (typeof value === 'object' && value.address) {
      setDestination(value.address)
    } else if (typeof value === 'string') {
      setDestination(value)
    }
  }

  const onTokenChange = (token) => {
    setSelectedToken(token)
  }

  const handleFlagChange = (flag) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
  }

  const onSubmit = async () => {
    if (!uri) {
      setErrorMessage(ts('nft-mint.errors.uri'))
      uriRef?.focus()
      return
    }

    if (digest && !isIdValid(digest)) {
      setErrorMessage(ts('nft-mint.errors.digest'))
      digestRef?.focus()
      return
    }

    if (!agreeToSiteTerms) {
      setErrorMessage(ts('nft-mint.errors.terms'))
      return
    }

    if (!agreeToPrivacyPolicy) {
      setErrorMessage(ts('nft-mint.errors.privacy'))
      return
    }

    if (createSellOffer && amount !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) < 0) {
      setErrorMessage(ts('nft-mint.errors.amount'))
      return
    }

    // Remit: Mint and Send
    if (mintAndSend) {
      if (!destination?.trim()) {
        setErrorMessage(ts('nft-mint.errors.destinationRemit'))
        return
      }
      // Remit transaction (per Xahau docs)
      let request = {
        TransactionType: 'Remit',
        Account: account?.address,
        Destination: destination.trim(),
        MintURIToken: {
          URI: encode(uri)
        }
      }
      if (digest) {
        request.MintURIToken.Digest = digest
      }
      if (flags.tfBurnable) {
        request.MintURIToken.Flags = 1
      }
      setSignRequest({
        request,
        callback: afterSubmit
      })
      return
    }

    setErrorMessage('')

    let request = {
      TransactionType: 'URITokenMint'
    }

    if (uri) {
      request.URI = encode(uri)
    }

    if (digest) {
      request.Digest = digest
    }

    if (createSellOffer) {
      if (destination?.trim()) {
        request.Destination = destination.trim()
      }

      if (amount === '0') {
        if (destination?.trim()) {
          request.Amount = '0'
        } else {
          setErrorMessage(ts('nft-mint.errors.destinationOrAmount'))
          return
        }
      } else if (parseFloat(amount) > 0) {
        // Handle amount based on selected token
        if (isNativeCurrency(selectedToken)) {
          // For XAH, convert to drops
          request.Amount = multiply(amount, 1000000)
        } else {
          // For tokens, use the token object
          request.Amount = {
            currency: selectedToken.currency,
            issuer: selectedToken.issuer,
            value: amount
          }
        }
      } else {
        setErrorMessage(ts('nft-mint.errors.amount'))
        return
      }

      if (flags.tfBurnable) {
        request.Flags = 1
      }
    }

    setSignRequest({
      request,
      callback: afterSubmit
    })
  }

  const afterSubmit = (id) => {
    setMinted(id)
  }

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  useEffect(() => {
    if (calculateDigest) {
      setDigest('')
    }
  }, [calculateDigest])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []
    if (digest) {
      queryAddList.push({ name: 'digest', value: digest })
      setErrorMessage('')
    } else {
      queryRemoveList.push('digest')
    }
    if (uri) {
      queryAddList.push({ name: 'uri', value: uri })
      setErrorMessage('')
    } else {
      queryRemoveList.push('uri')
    }
    // reflect sell offer related params
    if (createSellOffer) {
      queryAddList.push({ name: 'sell', value: 'true' })
      if (amount) queryAddList.push({ name: 'amount', value: amount })
      else queryRemoveList.push('amount')
      if (selectedToken?.currency) queryAddList.push({ name: 'currency', value: selectedToken.currency })
      else queryRemoveList.push('currency')
      if (selectedToken?.issuer) queryAddList.push({ name: 'currencyIssuer', value: selectedToken.issuer })
      else queryRemoveList.push('currencyIssuer')
      if (destination) queryAddList.push({ name: 'destination', value: destination })
      else queryRemoveList.push('destination')
    } else {
      queryRemoveList.push('sell')
      queryRemoveList.push('amount')
      queryRemoveList.push('currency')
      queryRemoveList.push('currencyIssuer')
      queryRemoveList.push('destination')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest, uri, createSellOffer, amount, selectedToken?.currency, selectedToken?.issuer, destination])

  const onMetadataChange = (e) => {
    setDigest('')
    setMetadataError('')
    let metadata = e.target.value
    setMetadata(metadata)
    if (!metaLoadedFromUri) {
      if (metadata && isValidJson(metadata)) {
        checkDigest(metadata)
      } else {
        setMetadataError(ts('nft-mint.errors.json'))
      }
    }
  }

  const checkDigest = async (metadata) => {
    if (!metadata) return
    if (typeof metadata === 'string') {
      metadata = JSON.parse(metadata)
    }
    let ourDigest = await sha512(JSON.stringify(metadata)?.trim())
    ourDigest = ourDigest.toString().slice(0, 64)
    setDigest(ourDigest.toUpperCase())
  }

  return (
    <>
      <div className="page-services-nft-mint">
        {!minted && (
          <>
            <p>{ts('nft-mint.uriLabel')}</p>
            <div className="input-validation">
              <input
                placeholder="ipfs://bafkreignnol62jayyt3hbofhkqvb7jolxyr4vxtby5o7iqpfi2r2gmt6fa4"
                value={uri}
                onChange={onUriChange}
                className="input-text"
                ref={(node) => {
                  uriRef = node
                }}
                spellCheck="false"
                maxLength="256"
                name="uri"
              />
            </div>

            {!uriValidDigest && (
              <>
                <CheckBox checked={calculateDigest} setChecked={setCalculateDigest} name="add-digest">
                  <Trans i18nKey="nft-mint.addDigest" ns="services" components={[<b key="0" />]} />
                </CheckBox>

                {calculateDigest && (
                  <>
                    <p>{ts('nft-mint.digestHelp')}</p>

                    <button
                      className="button-action thin"
                      onClick={loadMetadata}
                      style={{ marginBottom: '10px' }}
                      name="load-metadata-button"
                    >
                      {ts('nft-mint.loadMetadata')}
                    </button>

                    <b className="orange" style={{ marginLeft: '20px' }}>
                      {metadataStatus}
                    </b>

                    <p>
                      {ts('nft-mint.metadataLabel')} <b className="orange">{metadataError}</b>
                    </p>
                    <textarea
                      value={metadata}
                      placeholder={ts('nft-mint.metadataPlaceholder')}
                      onChange={onMetadataChange}
                      className="input-text"
                      autoFocus={true}
                      readOnly={metaLoadedFromUri}
                      name="metadata"
                    />
                  </>
                )}
              </>
            )}

            {(calculateDigest || uriValidDigest) && (
              <>
                <p>{ts('nft-mint.digestLabel')}</p>
                <div className="input-validation">
                  <input
                    placeholder={ts('nft-mint.digestPlaceholder')}
                    value={digest}
                    onChange={onDigestChange}
                    className="input-text"
                    ref={(node) => {
                      digestRef = node
                    }}
                    spellCheck="false"
                    maxLength="64"
                    readOnly={metaLoadedFromUri}
                    name="digest"
                  />
                  {isIdValid(digest) && <img src={checkmark} className="validation-icon" alt="validated" />}
                </div>
              </>
            )}

            <CheckBox checked={flags.tfBurnable} setChecked={() => handleFlagChange('tfBurnable')} name="burnable">
              {ts('nft-mint.burnableShort')}
            </CheckBox>

            {/* Mint and Send (Remit) Option */}
            <CheckBox
              checked={mintAndSend}
              setChecked={() => {
                setMintAndSend(!mintAndSend)
                if (!mintAndSend) {
                  setCreateSellOffer(false)
                }
              }}
              name="mint-and-send-remit"
            >
              {ts('nft-mint.mintAndSend')}
            </CheckBox>
            {mintAndSend && (
              <div className="orange" style={{ marginTop: '5px', fontSize: '14px' }}>
                {ts('nft-mint.mintAndSendReserve')}
              </div>
            )}

            {/* Create Sell Offer */}
            <div>
              <CheckBox
                checked={createSellOffer}
                setChecked={() => {
                  if (!createSellOffer) {
                    // Reset to XAH when enabling sell offer
                    setSelectedToken({ currency: nativeCurrency })
                  }
                  setCreateSellOffer(!createSellOffer)
                }}
                name="create-sell-offer"
                disabled={!account?.address || mintAndSend}
              >
                {ts('nft-mint.createSellOffer')}
              </CheckBox>
              {!account?.address && (
                <div className="orange" style={{ marginTop: '5px', fontSize: '14px' }}>
                  <span className="link" onClick={() => setSignRequest({})}>
                    {ts('nft-mint.loginFirst')}
                  </span>{' '}
                  {ts('nft-mint.loginSellOffer')}
                </div>
              )}
            </div>

            {/* Sell Offer Fields */}
            {createSellOffer && !mintAndSend && (
              <>
                <br />
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <span className="input-title">
                      {ts('nft-mint.initialListingPrice', { suffix: '' })}
                    </span>
                    <div className="input-validation">
                      <input
                        placeholder="0.0"
                        value={amount}
                        onChange={onAmountChange}
                        onKeyPress={typeNumberOnly}
                        className="input-text"
                        spellCheck="false"
                        maxLength="35"
                        min="0"
                        type="text"
                        inputMode="decimal"
                        name="amount"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <span className="input-title">{ts('nft-mint.currency')}</span>
                    <TokenSelector
                      value={selectedToken}
                      onChange={onTokenChange}
                      destinationAddress={account?.address}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Remit Destination Field */}
            {(mintAndSend || createSellOffer) && (
              <>
                <br />
                <AddressInput
                  title={ts('nft-mint.destinationTitle', {
                    status: mintAndSend ? ts('nft-mint.destinationRequired') : ts('nft-mint.destinationOptional')
                  })}
                  placeholder={ts('nft-mint.destinationPlaceholder')}
                  setInnerValue={onDestinationChange}
                  name="destination"
                  hideButton={true}
                />
              </>
            )}

            <br />

            <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
              <Trans
                i18nKey="shared.agree-terms"
                ns="services"
                components={[<Link key="0" href="/terms-and-conditions" target="_blank" />]}
              />
            </CheckBox>

            <CheckBox
              checked={agreeToPrivacyPolicy}
              setChecked={setAgreeToPrivacyPolicy}
              name="agree-to-privacy-policy"
            >
              <Trans
                i18nKey="nft-mint.privacyAgree"
                ns="services"
                components={[<Link key="0" href="/privacy-policy" target="_blank" />]}
              />
            </CheckBox>

            <p className="center service-form-actions">
              <button className="button-action" onClick={onSubmit} name="submit-button">
                {ts('nft-mint.mintButton')}
              </button>
            </p>
          </>
        )}

        {minted && (
          <>
            {ts('nft-mint.success')}
            <br />
            <Link href={'/nft/' + minted} className="brake">
              {server}/nft/{minted}
            </Link>
            <br />
            <br />
            <center>
              <button className="button-action" onClick={() => setMinted('')} name="mint-another-nft">
                {ts('nft-mint.mintAnother')}
              </button>
            </center>
          </>
        )}

        <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || '&nbsp;' }} />
      </div>
    </>
  )
}
