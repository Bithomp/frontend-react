import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
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
  nativeCurrency
} from '../../../utils'
import { multiply } from '../../../utils/calc'
const checkmark = '/images/checkmark.svg'
import CheckBox from '../../UI/CheckBox'
import AddressInput from '../../UI/AddressInput'
import TokenSelector from '../../UI/TokenSelector'

let interval
let startTime

export default function URITokenMint({ setSignRequest, uriQuery, digestQuery, account }) {
  const { i18n } = useTranslation()
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
  const [createSellOffer, setCreateSellOffer] = useState(false)
  const [amount, setAmount] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedToken, setSelectedToken] = useState({ currency: nativeCurrency })
  const [flags, setFlags] = useState({
    tfBurnable: false
  })

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

  useEffect(() => {
    if (!account?.address) {
      setCreateSellOffer(false)
    }
  }, [account?.address])

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
    setMetadataStatus('Trying to load the metadata from URI...')
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
            'Trying to load the metadata from URI... (' +
              Math.ceil((Date.now() - startTime) / 1000 / 5) +
              '/24 attempts)'
          )
        } else {
          setUpdate(false)
          setMetadataStatus('Load failed')
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
      setMetadataStatus('Please enter URI :)')
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
      setErrorMessage('Please enter URI')
      uriRef?.focus()
      return
    }

    if (digest && !isIdValid(digest)) {
      setErrorMessage('Please enter a valid Digest')
      digestRef?.focus()
      return
    }

    if (!agreeToSiteTerms) {
      setErrorMessage('Please agree to the Terms and conditions')
      return
    }

    if (!agreeToPrivacyPolicy) {
      setErrorMessage('Please agree to the Privacy policy')
      return
    }

    if (createSellOffer && amount !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) < 0) {
      setErrorMessage('Please enter a valid Amount')
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
          setErrorMessage('Please specify a Destination or change Amount')
          return
        }
      } else if (parseFloat(amount) > 0) {
        // Handle amount based on selected token
        if (selectedToken.currency === nativeCurrency && selectedToken.issuer === null) {
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
        setErrorMessage('Please enter a valid Amount')
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
      queryAddList.push({
        name: 'digest',
        value: digest
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('digest')
    }
    if (uri) {
      queryAddList.push({
        name: 'uri',
        value: uri
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('uri')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest, uri])

  const onMetadataChange = (e) => {
    setDigest('')
    setMetadataError('')
    let metadata = e.target.value
    setMetadata(metadata)
    if (!metaLoadedFromUri) {
      if (metadata && isValidJson(metadata)) {
        checkDigest(metadata)
      } else {
        setMetadataError('Please enter valid JSON')
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
      <div className="page-services-nft-mint content-center">
        {!minted && (
          <>
            <p>URI that points to the data or metadata associated with the NFT:</p>
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
                  Add <b>Digest</b> (recommended)
                </CheckBox>

                {calculateDigest && (
                  <>
                    <p>
                      The digest is calculated from the metadata. It is used to verify that the URI and the metadata
                      have not been tampered with.
                    </p>

                    <button
                      className="button-action thin"
                      onClick={loadMetadata}
                      style={{ marginBottom: '10px' }}
                      name="load-metadata-button"
                    >
                      Load metadata
                    </button>

                    <b className="orange" style={{ marginLeft: '20px' }}>
                      {metadataStatus}
                    </b>

                    <p>
                      Metadata: <b className="orange">{metadataError}</b>
                    </p>
                    <textarea
                      value={metadata}
                      placeholder="Paste your JSON metadata here"
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
                <p>Digest:</p>
                <div className="input-validation">
                  <input
                    placeholder="Digest"
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
              Burnable
            </CheckBox>

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
                disabled={!account?.address}
              >
                Create a Sell offer
              </CheckBox>
              {!account?.address && (
                <div className="orange" style={{ marginTop: '5px', fontSize: '14px' }}>
                  <span className="link" onClick={() => setSignRequest({})}>
                    Login first
                  </span>{' '}
                  if you want to add the sell offer in the same transaction.
                </div>
              )}
            </div>

            {/* Sell Offer Fields */}
            {createSellOffer && (
              <>
                <br />
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex-1">
                    <span className="input-title">Initial listing price (Amount):</span>
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
                    <span className="input-title">Currency</span>
                    <TokenSelector 
                      value={selectedToken} 
                      onChange={onTokenChange}
                      destinationAddress={account?.address}
                    />                    
                  </div>
                </div>
                <br />
                <AddressInput
                  title="Destination (optional - account to receive the NFT):"
                  placeholder="Destination address"
                  setValue={onDestinationChange}
                  name="destination"
                  hideButton={true}
                />
              </>
            )}

            <br />

            <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
              I agree with the{' '}
              <Link href="/terms-and-conditions" target="_blank">
                Terms and conditions
              </Link>
              .
            </CheckBox>

            <CheckBox
              checked={agreeToPrivacyPolicy}
              setChecked={setAgreeToPrivacyPolicy}
              name="agree-to-privacy-policy"
            >
              I agree with the{' '}
              <Link href="/privacy-policy" target="_blank">
                Privacy policy
              </Link>
              .
            </CheckBox>

            <p className="center">
              <button className="button-action" onClick={onSubmit} name="submit-button">
                Mint NFT
              </button>
            </p>
          </>
        )}

        {minted && (
          <>
            The NFT was successfully minted:
            <br />
            <Link href={'/nft/' + minted} className="brake">
              {server}/nft/{minted}
            </Link>
            <br />
            <br />
            <center>
              <button className="button-action" onClick={() => setMinted('')} name="mint-another-nft">
                Mint another NFT
              </button>
            </center>
          </>
        )}

        <p className="red center" dangerouslySetInnerHTML={{ __html: errorMessage || '&nbsp;' }} />
      </div>
    </>
  )
}
