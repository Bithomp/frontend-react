import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { sha512 } from 'crypto-hash'
import axios from 'axios'
import { encode, isIdValid, server } from '../../utils'
import CheckBox from '../UI/CheckBox'
import AddressInput from '../UI/AddressInput'
import ExpirationSelect from '../UI/ExpirationSelect'
import SEO from '../SEO'

export default function NFTokenMint ({ setSignRequest }) {

  const [uri, setUri] = useState('')
  const [digest, setDigest] = useState('')
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [update, setUpdate] = useState(false)
  const [minted, setMinted] = useState('')
  const [taxon, setTaxon] = useState('0')
  const [flags, setFlags] = useState({
    tfBurnable: false,
    tfOnlyXRP: false,
    tfTransferable: true,
    tfMutable: false
  })

  const [issuer, setIssuer] = useState('')
  const [transferFee, setTransferFee] = useState('')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [expiration, setExpiration] = useState(0)
  const [mintForOtherAccount, setMintForOtherAccount] = useState(false)
  const [createSellOffer, setCreateSellOffer] = useState(false)

  let uriRef
  let digestRef
  let taxonRef
  let transferFeeRef
  let amountRef
  const intervalRef = useRef(null) // useRef for interval
  let startTime

  useEffect(() => {
    return () => {
      setUpdate(false)
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (update) {
      intervalRef.current = setInterval(() => getMetadata(), 5000)
    } else {
      clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update])

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  const onUriChange = (e) => {
    let uri = e.target.value
    setUri(uri)
    setDigest('')
  }

  const onTaxonChange = (e) => {
    const value = e.target.value.replace(/[^\d]/g, '')
    setTaxon(value)
  }

  const onTransferFeeChange = (e) => {
    let value = e.target.value.replace(/[^\d\.]/g, '')
    const decimalPoints = value.split('.').length - 1
    if (decimalPoints > 1) {
      const parts = value.split('.')
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    if (value === '' || parseFloat(value) <= 50) {
      setTransferFee(value)
    }
  }

  const onAmountChange = (e) => {
    let value = e.target.value.replace(/[^\d\.]/g, '')
    const decimalPoints = value.split('.').length - 1
    if (decimalPoints > 1) {
      const parts = value.split('.')
      value = parts[0] + '.' + parts.slice(1).join('')
    }
    setAmount(value)
  }

  const onIssuerChange = (value) => {
    if (typeof value === 'object' && value.address) {
      setIssuer(value.address)
    } else if (typeof value === 'string') {
      setIssuer(value)
    }
  }

  const onDestinationChange = (value) => {
    if (typeof value === 'object' && value.address) {
      setDestination(value.address)
    } else if (typeof value === 'string') {
      setDestination(value)
    }
  }

  const onExpirationChange = (days) => {
    setExpiration(days)
  }

  const getMetadata = async () => {
    setMetadataStatus('Trying to load the metadata from URI...')
    const response = await axios
      .get('v2/metadata?url=' + encodeURIComponent(uri) + '&type=xls20')
      .catch(() => {
        setMetadataStatus('error')
      })
    if (response?.data) {
      if (response.data?.metadata) {

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

    if (!taxon || isNaN(parseInt(taxon))) {
      setErrorMessage('Please enter a valid Taxon value (integer)')
      taxonRef?.focus()
      return
    }

    if (transferFee && (isNaN(parseInt(transferFee)) || parseInt(transferFee) < 0 || parseInt(transferFee) > 50000)) {
      setErrorMessage('Transfer Fee must be between 0 and 50000 (0-50%)')
      transferFeeRef?.focus()
      return
    }

    if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
      setErrorMessage('Please enter a valid amount')
      amountRef?.focus()
      return
    }

    if (transferFee && parseFloat(transferFee) > 0 && !flags.tfTransferable) {
      setErrorMessage('Transferable flag must be enabled if Transfer Fee is set.')
      return
    }

    if (mintForOtherAccount && (!issuer || !issuer.trim())) {
      setErrorMessage('Please enter an Issuer address when minting for another account.')
      return
    }

    setErrorMessage('')

    let nftFlags = 0
    if (flags.tfBurnable) nftFlags |= 1
    if (flags.tfOnlyXRP) nftFlags |= 2
    if (flags.tfTransferable) nftFlags |= 8
    if (flags.tfMutable) nftFlags |= 16

    let mintRequest = {
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

    if (uri && uri.trim()) {
      mintRequest.URI = encode(uri)
    }

    if (issuer && issuer.trim()) {
      mintRequest.Issuer = issuer.trim()
    }

    if (transferFee && transferFee.trim()) {
      const feeValue = parseFloat(transferFee.trim())
      if (!isNaN(feeValue) && feeValue >= 0 && feeValue <= 50) {
        mintRequest.TransferFee = Math.round(feeValue * 1000)
      }
    }

    if (createSellOffer && amount && parseFloat(amount) > 0) {
      mintRequest.Amount = String(Math.round(parseFloat(amount) * 1000000))
      if (destination && destination.trim()) {
        mintRequest.Destination = destination.trim()
      }
      if (expiration > 0) {
        mintRequest.Expiration = Math.floor(Date.now() / 1000) + (expiration * 24 * 60 * 60)
      }
    }

    setSignRequest({
      redirect: 'nft',
      request: mintRequest,
      callback: (id) => setMinted(id)
    })
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

            <p className="mb-2">NFT Taxon (collection identifier, leave as 0 for the issuer’s first collection):</p>
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
            
            <>
              <div >
                <CheckBox 
                  checked={mintForOtherAccount} 
                  setChecked={() => {
                    if (mintForOtherAccount) {
                      setIssuer('') 
                    }
                    setMintForOtherAccount(!mintForOtherAccount)
                  }} 
                  name="mint-for-other"
                >
                  Mint on behalf of another account
                </CheckBox>
              </div>

              {mintForOtherAccount && (
                <>
                  <p style={{ marginBottom: "-5px" }}>Issuer (account you're minting for):</p>
                  <div >
                    <AddressInput
                      placeholder="Issuer address"
                      setValue={onIssuerChange}
                      initialValue={issuer}
                      name="issuer"
                      hideButton={true}
                    />
                  </div>
                  <p className="orange mb-2">
                    Note: You must be authorized as a minter for this account, or the transaction will fail.
                  </p>
                </>
              )}
            </>
            
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
            
            <div >
              <CheckBox
                checked={createSellOffer}
                setChecked={() => setCreateSellOffer(!createSellOffer)}
                name="create-sell-offer"
              >
                Create a Sell offer
              </CheckBox>
            </div>

            {createSellOffer && (
              <>
                <p className="mb-2">Initial listing price in XRP (Amount):</p>
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

                <p style={{ marginBottom: "-5px" }}>Destination (optional - account to receive the NFT):</p>
                <div >
                  <AddressInput
                    placeholder="Destination address"
                    setValue={onDestinationChange}
                    initialValue={destination}
                    name="destination"
                    hideButton={true}
                  />
                </div>

                <p className="mb-2">Offer expiration:</p>
                <div >
                  <ExpirationSelect onChange={onExpirationChange} />
                </div>
              </>
            )}

            <p className="mb-2">NFT Flags:</p>
            <div className="nft-flags-container mb-4">
              <CheckBox
                checked={flags.tfTransferable}
                setChecked={() => {
                  if (flags.tfTransferable && transferFee && parseFloat(transferFee) > 0) {
                    return
                  }
                  handleFlagChange('tfTransferable')
                }}
                name="transferable"
              >
                Transferable (can be transferred to others)
              </CheckBox>
              {transferFee && parseFloat(transferFee) > 0 && !flags.tfTransferable && (
                <div className="red mb-2" style={{ marginTop: '8px', marginBottom: '8px' }}>
                  Transferable flag must be enabled if Transfer Fee is set.
                </div>
              )}
              <CheckBox checked={flags.tfBurnable} setChecked={() => handleFlagChange('tfBurnable')} name="burnable">
                Burnable (can be destroyed by the issuer)
              </CheckBox>
              <CheckBox checked={flags.tfOnlyXRP} setChecked={() => handleFlagChange('tfOnlyXRP')} name="only-xrp">
                Only XRP (can only be sold for XRP)
              </CheckBox>
              <CheckBox checked={flags.tfMutable} setChecked={() => handleFlagChange('tfMutable')} name="mutable">
                Mutable (URI can be updated)
              </CheckBox>
            </div>

            <div style={{ height: 32 }} />

            <div >
              <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
                I agree with the{' '}
                <Link href="/terms-and-conditions" target="_blank">
                  Terms and conditions
                </Link>
                .
              </CheckBox>
            </div>

            <div >
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
                Mint NFT
              </button>
            </p>
          </>
        )}

        {minted && (
          <>
            <p >The NFT was successfully minted:</p>
            <p >
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