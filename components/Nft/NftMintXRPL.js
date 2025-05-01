import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { sha512 } from 'crypto-hash'
import axios from 'axios'
import { encode, isIdValid, isValidJson, server, isAddressValid } from '../../utils'
import CheckBox from '../UI/CheckBox'
import AddressInput from '../UI/AddressInput'
import ExpirationSelect from '../UI/ExpirationSelect'
import SEO from '../SEO'

const checkmark = '/images/checkmark.svg'

export default function NftMintXRPL({ setSignRequest }) {
  const { t } = useTranslation()
  const [uri, setUri] = useState('')
  const [digest, setDigest] = useState('')
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
  const [uriValidDigest, setUriValidDigest] = useState(false)
  const [taxon, setTaxon] = useState('0') // XRPL specific - taxon field
  const [flags, setFlags] = useState({
    tfBurnable: false,
    tfOnlyXRP: false,
    tfTrustLine: false,
    tfTransferable: true
  }) // XRPL specific - NFToken flags

  // New fields for NFTokenMint
  const [issuer, setIssuer] = useState('') // Optional issuer field
  const [transferFee, setTransferFee] = useState('') // Transfer fee (0-50000 representing 0-50%)
  const [destination, setDestination] = useState('') // Optional destination address
  const [amount, setAmount] = useState('') // Amount for initial offer
  const [expiration, setExpiration] = useState(0) // Expiration in days

  let uriRef
  let digestRef
  let taxonRef
  let transferFeeRef
  let amountRef
  let interval
  let startTime

  useEffect(() => {
    return () => {
      setUpdate(false)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (update) {
      interval = setInterval(() => getMetadata(), 5000) // 5 seconds
    } else {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update])

  useEffect(() => {
    if (calculateDigest) {
      setDigest('')
    }
  }, [calculateDigest])

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  const onUriChange = (e) => {
    let uri = e.target.value
    setUri(uri)
    setMetaLoadedFromUri(false)
    setMetadata('')
    setDigest('')
    setMetadataError('')
    setUriValidDigest(false)
  }

  const onTaxonChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '')
    setTaxon(value)
  }

  const onTransferFeeChange = (e) => {
    // Accept decimal numbers for better user experience (like 2.5 for 2.5%)
    let value = e.target.value.replace(/[^\d\.]/g, '')
    
    // Ensure only one decimal point
    const decimalPoints = value.split('.').length - 1
    if (decimalPoints > 1) {
      const parts = value.split('.')
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Make sure the value doesn't exceed 50% (50000/1000)
    if (value === '' || parseFloat(value) <= 50) {
      setTransferFee(value)
    }
  }

  const onAmountChange = (e) => {
    // Only accept numbers and decimal point for amount
    let value = e.target.value.replace(/[^\d\.]/g, '')
    // Ensure only one decimal point
    const decimalPoints = value.split('.').length - 1
    if (decimalPoints > 1) {
      const parts = value.split('.')
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    setAmount(value)
  }

  const onIssuerChange = (value) => {
    setIssuer(typeof value === 'object' && value.address ? value.address : value)
  }

  const onDestinationChange = (value) => {
    setDestination(typeof value === 'object' && value.address ? value.address : value)
  }

  const onExpirationChange = (days) => {
    setExpiration(days)
  }

  const getMetadata = async () => {
    setMetadataStatus('Trying to load the metadata from URI...')
    const response = await axios
      .get('v2/metadata?url=' + encodeURIComponent(uri) + '&type=xls20')
      .catch((error) => {
        console.log(error)
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

    // Validate taxon value for XRPL
    if (!taxon || isNaN(parseInt(taxon))) {
      setErrorMessage('Please enter a valid Taxon value (integer)')
      taxonRef?.focus()
      return
    }

    // Validate transfer fee if provided
    if (transferFee && (isNaN(parseInt(transferFee)) || parseInt(transferFee) < 0 || parseInt(transferFee) > 50000)) {
      setErrorMessage('Transfer Fee must be between 0 and 50000 (0-50%)')
      transferFeeRef?.focus()
      return
    }

    // Validate amount if provided
    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      setErrorMessage('Please enter a valid amount')
      amountRef?.focus()
      return
    }

    setErrorMessage('')

    // Calculate flags for NFTokenMint
    let nftFlags = 0
    if (flags.tfBurnable) nftFlags |= 1
    if (flags.tfOnlyXRP) nftFlags |= 2
    if (flags.tfTrustLine) nftFlags |= 4
    if (!flags.tfTransferable) nftFlags |= 8

    // Build the NFTokenMint transaction request
    let request = {
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: parseInt(taxon),
      Flags: nftFlags,
      Memos: [
        {
          Memo: {
            MemoData: encode('NFT Mint')
          }
        }
      ]
    }

    // Add URI if provided (properly encoded)
    if (uri && uri.trim()) {
      request.URI = encode(uri)
    }

    // Add optional fields ONLY if they have valid values
    if (issuer && issuer.trim()) {
      request.Issuer = issuer.trim()
    }

    // Add TransferFee if provided - multiply by 1000 for XRPL format
    if (transferFee && transferFee.trim()) {
      // Convert from percentage (e.g., 2.5%) to the format expected by XRPL (2500)
      const feeValue = parseFloat(transferFee.trim())
      if (!isNaN(feeValue) && feeValue >= 0 && feeValue <= 50) {
        // Multiply by 1000 because XRPL stores transfer fee in thousandths of a percent
        request.TransferFee = Math.round(feeValue * 1000)
      }
    }

    if (destination && destination.trim()) {
      request.Destination = destination.trim()
    }

    // Determine if we need to create a sell offer after minting
    let createSellOffer = false
    let sellOfferRequest = null

    if (amount && parseFloat(amount) > 0) {
      createSellOffer = true

      // Prepare the NFTokenCreateOffer transaction (will be executed after minting)
      sellOfferRequest = {
        TransactionType: 'NFTokenCreateOffer',
        NFTokenID: '', // Will be filled after successful minting
        Amount: String(Math.round(parseFloat(amount) * 1000000)), // Convert to drops
        Flags: 1 // Sell offer
      }

      // Add destination if provided (for private offers)
      if (destination && destination.trim()) {
        sellOfferRequest.Destination = destination.trim()
      }

      // Add expiration if provided
      if (expiration > 0) {
        // Calculate expiration timestamp (current time + days in seconds)
        const expirationTimestamp = Math.floor(Date.now() / 1000) + (expiration * 24 * 60 * 60)
        sellOfferRequest.Expiration = expirationTimestamp
      }
    }

    console.log('NFTokenMint request:', request)
    
    // Send the minting request first, then handle the sell offer if needed
    setSignRequest({
      redirect: 'nft',
      request,
      callback: (id) => {
        if (createSellOffer && id) {
          // If NFT minting was successful and we want to create a sell offer
          sellOfferRequest.NFTokenID = id
          console.log('NFTokenCreateOffer request:', sellOfferRequest)
          
          // Chain the sell offer request after minting completes
          setSignRequest({
            redirect: 'nft',
            request: sellOfferRequest,
            callback: () => setMinted(id)
          })
        } else {
          // If only minting was done
          setMinted(id)
        }
      }
    })
  }

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

  const handleFlagChange = (flag) => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }))
  }

  return (
    <>
      <SEO title="XRP Ledger NFT Mint" />
      <div className="page-services-nft-mint">

        {!minted && (
          <>
            <p className="mb-2">URI that points to the data or metadata associated with the NFT:</p>
            <div className="input-validation mb-4">
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

            <p className="mb-2">NFT Taxon (classification number, required):</p>
            <div className="input-validation mb-4">
              <input
                placeholder="0"
                value={taxon}
                onChange={onTaxonChange}
                className="input-text"
                ref={(node) => {
                  taxonRef = node
                }}
                spellCheck="false"
                name="taxon"
              />
            </div>
            
            <p style={{ marginBottom: "-5px" }}>Issuer (optional - if different from your account):</p>
            <div className="mb-4">
              <AddressInput
                placeholder="Search by address or username..."
                onSelect={onIssuerChange}
                initialValue={issuer}
                name="issuer"
              />
            </div>
            
            <p className="mb-2">Transfer Fee (optional, 0-50%):</p>
            <div className="input-validation mb-4">
              <input
                placeholder="Enter percentage (e.g., 2.5)"
                value={transferFee}
                onChange={onTransferFeeChange}
                className="input-text"
                ref={(node) => {
                  transferFeeRef = node
                }}
                spellCheck="false"
                name="transfer-fee"
              />
            </div>
            
            <p style={{ marginBottom: "-5px" }}>Destination (optional - account to receive the NFT):</p>
            <div className="mb-4">
              <AddressInput
                placeholder="Search by address or username..."
                onSelect={onDestinationChange}
                initialValue={destination}
                name="destination"
              />
            </div>

            <p className="mb-2">Initial listing price in XRP (optional - creates a sell offer):</p>
            <div className="input-validation mb-4">
              <input
                placeholder="0.0"
                value={amount}
                onChange={onAmountChange}
                className="input-text"
                ref={(node) => {
                  amountRef = node
                }}
                spellCheck="false"
                name="amount"
              />
            </div>

            {amount && parseFloat(amount) > 0 && (
              <>
                <p className="mb-2">Offer expiration (if creating a sell offer):</p>
                <div className="mb-4">
                  <ExpirationSelect onChange={onExpirationChange} />
                </div>
              </>
            )}

            <p className="mb-2">NFT Flags:</p>
            <div className="nft-flags-container mb-4">
              <CheckBox checked={flags.tfTransferable} setChecked={() => handleFlagChange('tfTransferable')} name="transferable">
                Transferable (can be transferred to others)
              </CheckBox>
              <CheckBox checked={flags.tfBurnable} setChecked={() => handleFlagChange('tfBurnable')} name="burnable">
                Burnable (can be destroyed by the issuer)
              </CheckBox>
              <CheckBox checked={flags.tfOnlyXRP} setChecked={() => handleFlagChange('tfOnlyXRP')} name="only-xrp">
                Only XRP (can only be sold for XRP)
              </CheckBox>
              <CheckBox checked={flags.tfTrustLine} setChecked={() => handleFlagChange('tfTrustLine')} name="trustline">
                TrustLine (requires a trustline)
              </CheckBox>
            </div>

            {!uriValidDigest && (
              <>
                <div className="mb-4">
                  <CheckBox checked={calculateDigest} setChecked={setCalculateDigest} name="add-digest">
                    Add <b>Digest</b> (recommended)
                  </CheckBox>
                </div>

                {calculateDigest && (
                  <>
                    <p className="mb-2">
                      The digest is calculated from the metadata. It is used to verify that the URI and the metadata
                      have not been tampered with.
                    </p>

                    <div className="mb-4">
                      <button
                        className="button-action thin"
                        onClick={loadMetadata}
                        name="load-metadata-button"
                      >
                        Load metadata
                      </button>

                      <b className="orange" style={{ marginLeft: '20px' }}>
                        {metadataStatus}
                      </b>
                    </div>

                    <p className="mb-2">
                      Metadata: <b className="orange">{metadataError}</b>
                    </p>
                    <div className="mb-4">
                      <textarea
                        value={metadata}
                        placeholder="Paste your JSON metadata here"
                        onChange={onMetadataChange}
                        className="input-text"
                        autoFocus={true}
                        readOnly={metaLoadedFromUri}
                        name="metadata"
                        rows={6}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {(calculateDigest || uriValidDigest) && (
              <>
                <p className="mb-2">Digest:</p>
                <div className="input-validation mb-4">
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
                  {isIdValid(digest) && <img src={checkmark || "/placeholder.svg"} className="validation-icon" alt="validated" />}
                </div>
              </>
            )}

            <div className="mb-4">
              <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
                I agree with the{' '}
                <Link href="/terms-and-conditions" target="_blank">
                  Terms and conditions
                </Link>
                .
              </CheckBox>
            </div>

            <div className="mb-4">
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
            </div>

            <p className="center mt-6">
              <button className="button-action" onClick={onSubmit} name="submit-button">
                {amount && parseFloat(amount) > 0 ? 'Mint NFT & Create Sell Offer' : 'Mint NFT'}
              </button>
            </p>
          </>
        )}

        {minted && (
          <>
            <p className="mb-4">The NFT was successfully minted:</p>
            <p className="mb-4">
              <Link href={'/nft/' + minted} className="brake">
                {server}/nft/{minted}
              </Link>
            </p>
            <div className="center mt-6">
              <button className="button-action" onClick={() => setMinted('')} name="mint-another-nft">
                Mint another NFT
              </button>
            </div>
          </>
        )}

        <p className="red center mt-4" dangerouslySetInnerHTML={{ __html: errorMessage || '&nbsp;' }} />
      </div>
    </>
  )
}
