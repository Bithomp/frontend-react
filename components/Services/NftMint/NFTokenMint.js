import { useState, useEffect } from 'react'
import Link from 'next/link'
import { encode, server, network } from '../../../utils'
import { isValidTaxon } from '../../../utils/nft'
import CheckBox from '../../UI/CheckBox'
import AddressInput from '../../UI/AddressInput'
import ExpirationSelect from '../../UI/ExpirationSelect'

export default function NFTokenMint({ setSignRequest }) {
  const [uri, setUri] = useState('')
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
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
  let taxonRef

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  const onUriChange = (e) => {
    let uri = e.target.value
    setUri(uri)
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

  const onSubmit = async () => {
    if (!uri) {
      setErrorMessage('Please enter URI')
      uriRef?.focus()
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

    if (!isValidTaxon(taxon)) {
      setErrorMessage('Please enter a valid Taxon value')
      taxonRef?.focus()
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

    let request = {
      TransactionType: 'NFTokenMint',
      NFTokenTaxon: parseInt(taxon),
      Flags: nftFlags
    }

    if (uri && uri.trim()) {
      request.URI = encode(uri)
    }

    if (issuer && issuer.trim()) {
      request.Issuer = issuer.trim()
    }

    if (transferFee && transferFee.trim()) {
      const feeValue = parseFloat(transferFee.trim())
      if (!isNaN(feeValue) && feeValue >= 0 && feeValue <= 50) {
        request.TransferFee = Math.round(feeValue * 1000)
      }
    }

    if (createSellOffer && amount !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 0) {
      request.Amount = String(Math.round(parseFloat(amount) * 1000000))
      if (destination && destination.trim()) {
        request.Destination = destination.trim()
      }
      if (expiration > 0) {
        request.Expiration = Math.floor(Date.now() / 1000) + expiration * 24 * 60 * 60 - 946684800
      }
    }

    setSignRequest({
      redirect: 'nft',
      request,
      callback: (id) => setMinted(id)
    })
  }

  const handleFlagChange = (flag) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
  }

  return (
    <>
      <div className="page-services-nft-mint">
        {!minted && (
          <>
            {/* URI */}
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

            {/* NFT Taxon */}
            <p> NFT Taxon (collection identifier, leave as 0 for the issuer's first collection):</p>
            <div className="input-validation ">
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

            {/* Transferable */}
            <div>
              <CheckBox
                checked={flags.tfTransferable}
                setChecked={() => {
                  // If disabling and royalty is set, do nothing
                  if (flags.tfTransferable && transferFee && parseFloat(transferFee) > 0) {
                    return
                  }
                  handleFlagChange('tfTransferable')
                }}
                name="transferable"
              >
                Transferable (can be transferred to others)
              </CheckBox>
            </div>

            {/* Royalty (Transfer Fee) - only show if Transferable is checked */}
            {flags.tfTransferable && (
              <>
                <p>Royalty (paid to the issuer, 0-50%):</p>
                <div className="input-validation">
                  <input
                    placeholder="0"
                    value={transferFee}
                    onChange={onTransferFeeChange}
                    className="input-text"
                    spellCheck="false"
                    name="transfer-fee"
                  />
                </div>
              </>
            )}

            {/* Mutable */}
            {network === 'devnet' && (
              <div>
                <CheckBox checked={flags.tfMutable} setChecked={() => handleFlagChange('tfMutable')} name="mutable">
                  Mutable (URI can be updated)
                </CheckBox>
              </div>
            )}

            {/* Only XRP */}
            <div>
              <CheckBox checked={flags.tfOnlyXRP} setChecked={() => handleFlagChange('tfOnlyXRP')} name="only-xrp">
                Only XRP (can only be sold for XRP)
              </CheckBox>
            </div>

            {/* Burnable */}
            <div>
              <CheckBox checked={flags.tfBurnable} setChecked={() => handleFlagChange('tfBurnable')} name="burnable">
                Burnable (can be destroyed by the issuer)
              </CheckBox>
            </div>

            {/* Create Sell Offer */}
            <div>
              <CheckBox
                checked={createSellOffer}
                setChecked={() => setCreateSellOffer(!createSellOffer)}
                name="create-sell-offer"
              >
                Create a Sell offer
              </CheckBox>
            </div>

            {/* Sell Offer Fields */}
            {createSellOffer && (
              <>
                <p>Initial listing price in XRP (Amount):</p>
                <div className="input-validation">
                  <input
                    placeholder="0.0"
                    value={amount}
                    onChange={onAmountChange}
                    className="input-text"
                    spellCheck="false"
                    name="amount"
                  />
                </div>

                <p style={{ marginBottom: '-5px' }}>Destination (optional - account to receive the NFT):</p>
                <div>
                  <AddressInput
                    placeholder="Destination address"
                    setValue={onDestinationChange}
                    initialValue={destination}
                    name="destination"
                    hideButton={true}
                  />
                </div>

                <p>Offer expiration:</p>
                <div>
                  <ExpirationSelect onChange={onExpirationChange} />
                </div>
              </>
            )}

            {/* Mint on behalf of another account */}
            <div>
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
                <p style={{ marginBottom: '-5px' }}>Issuer (account you're minting for):</p>
                <div>
                  <AddressInput
                    placeholder="Issuer address"
                    setValue={onIssuerChange}
                    initialValue={issuer}
                    name="issuer"
                    hideButton={true}
                  />
                </div>
                <p className="orange">
                  Note: You must be authorized as a minter for this account, or the transaction will fail.
                </p>
              </>
            )}

            <div style={{ height: 32 }} />

            {/* Terms and Privacy */}
            <div>
              <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
                I agree with the{' '}
                <Link href="/terms-and-conditions" target="_blank">
                  Terms and conditions
                </Link>
                .
              </CheckBox>
            </div>

            <div>
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

            <p className="center">
              <button className="button-action" onClick={onSubmit} name="submit-button">
                Mint NFT
              </button>
            </p>
          </>
        )}

        {minted && (
          <>
            <p>The NFT was successfully minted:</p>
            <p>
              <Link href={'/nft/' + minted} className="brake">
                {server}/nft/{minted}
              </Link>
            </p>
            <div className="center">
              <button className="button-action" onClick={() => setMinted('')} name="mint-another-nft">
                Mint another NFT
              </button>
            </div>
          </>
        )}

        <p className="red center " dangerouslySetInnerHTML={{ __html: errorMessage || '&nbsp;' }} />
      </div>
    </>
  )
}
