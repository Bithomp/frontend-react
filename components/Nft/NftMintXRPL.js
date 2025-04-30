
import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { typeNumberOnly, encode } from '../../utils'
import CheckBox from '../../components/UI/CheckBox'
import AddressInput from "../../components/UI/AddressInput"
import IssuerSelect from "../../components/UI/IssuerSelect"

export default function NftMintXRPL({ account, setSignRequest, refreshPage }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    transferFee: '',
    issuer: '',
    uri: '',
    nftokenTaxon: '0',
    expiration: '',
    destination: '',
    flags: {
      burnable: false,
      onlyXRP: false,
      transferable: true,
      mutable: false
    }
  })
  const [calculatedNFTokenID, setCalculatedNFTokenID] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [rawData, setRawData] = useState({})
  const [taxonsList, setTaxonsList] = useState([])
  const [isLoadingTaxons, setIsLoadingTaxons] = useState(false)

  // Update NFTokenID calculation whenever relevant form fields change
  useEffect(() => {
    calculateNFTokenID()
  }, [formData.issuer, formData.nftokenTaxon, formData.transferFee, formData.flags, account])
  
  // Placeholder for fetching taxons
  useEffect(() => {
    // In a real implementation, you would fetch taxons from your API
    setTaxonsList([0, 1, 2, 3, 4, 5])
    setIsLoadingTaxons(false)
  }, [])

  const calculateNFTokenID = () => {
    // Only calculate if we have at least issuer and taxon
    if (!formData.issuer && !account) {
      setCalculatedNFTokenID('')
      return
    }

    try {


      // This is a simplified placeholder for the NFTokenID calculation
      // In a real implementation, you would need to follow the XRPL protocol
      const issuerAddress = formData.issuer || account;
      const taxon = parseInt(formData.nftokenTaxon || 0);
      const flags = getFlagsValue();
      
      // Format: "chain:144:NFTokenID" for XRPL mainnet
      const tokenId = `chain:144:00000000${issuerAddress.substring(0, 8)}${taxon.toString(16).padStart(8, '0')}`;
      setCalculatedNFTokenID(tokenId.toUpperCase());
    } catch (err) {
      console.error("Error calculating NFTokenID:", err)
      setCalculatedNFTokenID('')
    }
  }

  const getFlagsValue = () => {
    let flagsValue = 0
    if (formData.flags.burnable) flagsValue |= 1
    if (formData.flags.onlyXRP) flagsValue |= 2
    if (formData.flags.transferable) flagsValue |= 8
    if (formData.flags.mutable) flagsValue |= 4
    return flagsValue;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleFlagChange = (name, checked) => {
    setFormData({
      ...formData,
      flags: { ...formData.flags, [name]: checked }
    })
  }
  
  const setIssuer = (value) => {
    setFormData({ ...formData, issuer: value })
    setRawData({ ...rawData, issuer: value })
  }

  const setDestination = (value) => {
    setFormData({ ...formData, destination: value })
    setRawData({ ...rawData, owner: value }) 
  }

  const onTaxonInput = (value) => {
    setFormData({ ...formData, nftokenTaxon: value })
  }

  const onSubmit = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Validate input
      // if (!account) {
      //   throw new Error(t('common:error.not-connected', 'Please connect your wallet first'))
      // }

      if (!formData.nftokenTaxon) {
        throw new Error(t('nft-mint.error.taxon-required', 'NFTokenTaxon is required'))
      }

      // Prepare the NFTokenMint transaction
      const tx = {
        TransactionType: 'NFTokenMint',
        Account: formData.issuer || account,
        NFTokenTaxon: parseInt(formData.nftokenTaxon),
        Flags: getFlagsValue()
      }

      // Add optional fields
      if (formData.transferFee && formData.transferFee !== '') {
        // Convert percentage to basis points (1% = 1000)
        const feeValue = Number.parseFloat(formData.transferFee)
        if (feeValue < 0 || feeValue > 50) {
          throw new Error(t('nft-mint.error.transfer-fee-range', 'Transfer fee must be between 0 and 50%'))
        }
        tx.TransferFee = Number.parseInt(feeValue * 1000)
      }
      
      if (formData.uri && formData.uri !== '') {
        // Check URI length before encoding
        if (Buffer.from(formData.uri).length > 256) {
          throw new Error(t('nft-mint.error.uri-too-long', 'URI must be less than 256 bytes'))
        }
        // Convert URI to hex format
        tx.URI = encode(formData.uri)
      }

      if (formData.destination && formData.destination !== '') {
        // Validate destination address (simple check, can be enhanced)
        if (!formData.destination.startsWith('r')) {
          throw new Error(t('nft-mint.error.invalid-destination', 'Invalid destination address'))
        }
        tx.Destination = formData.destination
      }

      if (formData.expiration && formData.expiration !== '') {
        const expirationDate = new Date(formData.expiration)
        const now = new Date()
        if (expirationDate <= now) {
          throw new Error(t('nft-mint.error.expiration-past', 'Expiration date must be in the future'))
        }
        tx.Expiration = Math.floor(expirationDate.getTime() / 1000)
      }

      // Send transaction to parent component for signing
      setSignRequest({
        tx,
        feeMultiplier: 1.2,
        callback: () => {
          refreshPage && refreshPage()
        }
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="nft-mint-form" style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
    }}>
      <h2 style={{ 
        marginBottom: '20px', 
        textAlign: 'center',
        color: 'var(--text-main)'
      }}>Mint NFT on XRPL</h2>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <AddressInput
          title={t("table.issuer", "Issuer Address")}
          placeholder={t("nfts.search-by-issuer", "Enter issuer address")}
          setValue={setIssuer}
          rawData={rawData}
          type="issuer"
          defaultValue={account || ""}
          style={{ padding: '8px' }}
        />
        <small style={{  display: 'block', color: 'var(--text-secondary)' }}>
          Leave blank to use your connected account. Must be a valid XRPL address.
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px',
          color: 'var(--text-main)' 
        }}>{t("table.taxon", "NFTokenTaxon*")}:</label>
        <div className="input-validation">
          <IssuerSelect
            issuersList={taxonsList.map((taxon) => ({ value: taxon.toString(), label: taxon.toString() }))}
            selectedIssuer={formData.nftokenTaxon}
            setSelectedIssuer={onTaxonInput}
            placeholder="Search or enter taxon"
            isLoading={isLoadingTaxons}
            allowCustomValue={true}
            style={{ padding: '8px' }}
          />
        </div>
        <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
          Collection or category ID (integer). Used to group NFTs.
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px',
          color: 'var(--text-main)' 
        }}>URI:</label>
        <div className="input-validation">
          <input
            type="text"
            name="uri"
            placeholder="ipfs://bafkreignnol62jayyt3hbofhkqvb7jolxyr4vxtby5o7iqpfi2r2gmt6fa4"
            value={formData.uri}
            onChange={handleInputChange}
            className="input-text"
            
          />
        </div>
        <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
          Link to external metadata or content (max 256 bytes).
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px',
          color: 'var(--text-main)' 
        }}>Transfer Fee (%):</label>
        <div className="input-validation">
          <input
            type="text"
            name="transferFee"
            placeholder="0.0"
            value={formData.transferFee}
            onChange={handleInputChange}
            max="50"
            min="0"
            className="input-text"
            
          />
        </div>
        <small style={{  display: 'block', color: 'var(--text-secondary)' }}>
          Royalty fee between 0 and 50% that the issuer receives when the NFT is resold.
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <AddressInput
          title={t("table.destination", "Destination")}
          placeholder={t("nfts.search-by-owner", "Enter destination address")}
          setValue={setDestination}
          rawData={{ owner: formData.destination }}
          type="owner"
          style={{ padding: '8px' }}
        />
        <small style={{  display: 'block', color: 'var(--text-secondary)' }}>
          XRPL address to receive the minted NFT.
        </small>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px',
          color: 'var(--text-main)' 
        }}>Expiration:</label>
        <div className="input-validation" style={{ position: 'relative' }}>
          <input
            type="datetime-local"
            name="expiration"
            value={formData.expiration}
            onChange={handleInputChange}
            className="input-text calendar-teal"
            
          />
          <style jsx>{`
            .calendar-teal::-webkit-calendar-picker-indicator {
              /* Use current text color */
              filter: brightness(0) saturate(100%) invert(40%) sepia(28%) saturate(3280%) hue-rotate(156deg) brightness(92%) contrast(90%);
            }
          `}</style>
        </div>
        <small style={{  display: 'block', color: 'var(--text-secondary)' }}>
          Date and time when the NFT offer expires.
        </small>
      </div>

      <div className="form-group flags" style={{ 
        marginBottom: '16px', 
        padding: '15px', 
        backgroundColor: 'var(--background-input)', 
        borderRadius: '6px'
      }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px',
          color: 'var(--text-main)'
        }}>Flags:</label>
        <div className="flag-options" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '10px'
        }}>
          <CheckBox
            checked={formData.flags.burnable}
            setChecked={(checked) => handleFlagChange('burnable', checked)}
            name="burnable-xrpl"
          >
            Burnable
          </CheckBox>

          <CheckBox
            checked={formData.flags.onlyXRP}
            setChecked={(checked) => handleFlagChange('onlyXRP', checked)}
            name="onlyXRP-xrpl"
          >
            Only XRP
          </CheckBox>

          <CheckBox
            checked={formData.flags.transferable}
            setChecked={(checked) => handleFlagChange('transferable', checked)}
            name="transferable-xrpl"
          >
            Transferable
          </CheckBox>

          <CheckBox
            checked={formData.flags.mutable}
            setChecked={(checked) => handleFlagChange('mutable', checked)}
            name="mutable-xrpl"
          >
            Mutable
          </CheckBox>
        </div>
      </div>

      {calculatedNFTokenID && (
        <div className="predicted-nftid" style={{ 
          padding: '15px', 
          backgroundColor: 'var(--background-input)', 
          borderRadius: '6px', 
          marginTop: '20px', 
          marginBottom: '20px',
          border: '1px solid var(--button-additional)'
        }}>
          <h3 style={{ 
            marginBottom: '10px',
            color: 'var(--accent-icon)'
          }}>Predicted NFTokenID:</h3>
          <div className="token-id-box" style={{ 
            padding: '10px', 
            backgroundColor: 'var(--background-main)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '4px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <code style={{ 
              wordBreak: 'break-all',
              color: 'var(--text-main)'
            }}>{calculatedNFTokenID}</code>
            <button
              type="button"
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(calculatedNFTokenID)}
              style={{ 
                padding: '6px 10px', 
                marginLeft: '10px',
                backgroundColor: 'var(--background-button)',
                color: 'var(--text-button)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
          </div>
          <small style={{ display: 'block', color: 'var(--text-secondary)' }}>
            This is the pre-calculated NFTokenID with format: {`{chain:144:NFTokenID}`}. You can add this to your
            metadata before minting.
          </small>
        </div>
      )}

      {error && <div className="error-message" style={{ 
        padding: '10px 15px', 
        backgroundColor: 'var(--background-error)',
        color: 'var(--text-error)',
        borderRadius: '4px',
        marginBottom: '20px' 
      }}>{error}</div>}

      <p className="center" style={{ textAlign: 'center', marginTop: '25px' }}>
        <button
          type="button"
          className="button-action"
          onClick={onSubmit}
          disabled={isLoading}
          name="submit-button"
          style={{ padding: '6px 12px', fontSize: '16px' }}
        >
          {isLoading ? "Loading..." : "Mint NFT"}
        </button>
      </p>
    </div>
  )
}
