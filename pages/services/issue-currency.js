import { useState, useEffect } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import FormInput from '../../components/UI/FormInput'
import AddressInput from '../../components/UI/AddressInput'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import { ledgerName, nativeCurrency } from '../../utils'
import { getIsSsrMobile } from '../../utils/mobile'
import { shortAddress } from '../../utils/format'
import { FiUpload } from 'react-icons/fi'
import axios from 'axios'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      isSsrMobile: getIsSsrMobile(context)
    }
  }
}

export default function IssueCurrency({ subscriptionExpired, openEmailLogin, sessionToken, account, setSignRequest }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [supplyType, setSupplyType] = useState('') // 'closed' or 'open'
  const [coldWalletAddress, setColdWalletAddress] = useState('')
  const [hotWalletAddress, setHotWalletAddress] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [totalSupply, setTotalSupply] = useState('')
  const [coldAddressError, setColdAddressError] = useState('')
  const [coldAddressSuccess, setColdAddressSuccess] = useState('')
  
  // Token metadata fields
  const [tokenName, setTokenName] = useState('')
  const [tokenTicker, setTokenTicker] = useState('')
  const [tokenDescription, setTokenDescription] = useState('')
  const [tokenImage, setTokenImage] = useState(null) // eslint-disable-line no-unused-vars
  const [tokenImagePreview, setTokenImagePreview] = useState('')
  
  // AccountSet transaction fields for cold wallet
  const [coldTransferRate, setColdTransferRate] = useState(0)
  const [tickSize, setTickSize] = useState(5)
  const [domain, setDomain] = useState('')
  const [disallowXRP, setDisallowXRP] = useState(false)
  const [requireDestTag, setRequireDestTag] = useState(false)

  // Hot wallet AccountSet fields
  const [hotDomain, setHotDomain] = useState('')
  const [hotRequireAuth, setHotRequireAuth] = useState(false)
  const [hotDisallowXRP, setHotDisallowXRP] = useState(false)
  const [hotRequireDestTag, setHotRequireDestTag] = useState(false)
  const [isSettingHotWallet, setIsSettingHotWallet] = useState(false)
  const [hotWalletError, setHotWalletError] = useState('')
  const [hotWalletSuccess, setHotWalletSuccess] = useState('')
  const [canProceedFromStep1, setCanProceedFromStep1] = useState(false)
  const [canProceedFromStep2, setCanProceedFromStep2] = useState(false)

  // Token issuance and sending fields
  const [issueQuantity, setIssueQuantity] = useState('')
  const [destinationTag, setDestinationTag] = useState('1')
  const [tokenError, setTokenError] = useState('')
  const [tokenSuccess, setTokenSuccess] = useState('')
  
  // TrustLine creation fields
  const [isCreatingTrustLine, setIsCreatingTrustLine] = useState(false)
  const [trustLineError, setTrustLineError] = useState('')
  const [trustLineSuccess, setTrustLineSuccess] = useState('')

  // Flag constants
  const ASF_FLAGS = {
    asfDefaultRipple: 8,
    asfRequireAuth: 2
  }

  const TF_FLAGS = {
    requireDestTag: { set: 0x00010000, clear: 0x00020000 },
    requireAuth: { set: 0x00040000, clear: 0x00080000 },
    disallowXRP: { set: 0x00100000, clear: 0x00200000 }
  }


  // Check if user has Pro subscription
  const hasProAccess = sessionToken && !subscriptionExpired

  // Update canProceedFromStep1 when dependent values change
  useEffect(() => {
    setCanProceedFromStep1(!!supplyType)
  }, [supplyType])

  // Update canProceedFromStep2 when dependent values change
  useEffect(() => {
    setCanProceedFromStep2(hotWalletAddress && currencyCode && totalSupply)
    setIsSettingHotWallet(false)
  }, [hotWalletAddress, currencyCode, totalSupply])

  useEffect(() => {
    if (!(coldTransferRate >= 0 && coldTransferRate <= 1)) {
      setTimeout(() => {
        setColdTransferRate(0)
      }, 1000)
    }
  }, [coldTransferRate])

  useEffect(() => {
    if (!(tickSize >= 0 && tickSize <= 15)) {
      setTimeout(() => {
        setTickSize(5)
      }, 1000)
    }
  }, [tickSize])

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }
      setTokenImage(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setTokenImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
      // TODO: In the future, upload tokenImage to IPFS or another storage service
      console.log('Token image selected:', file.name, 'Size:', file.size, 'bytes')
    }
  }

  if (!hasProAccess) {
    return (
      <>
        <SEO
          title="Issue Your Own Currency"
          description={`Create and issue your own custom currency on the ${ledgerName} - Bithomp Pro feature`}
        />
        <div className="content-text content-center">
          <h1 className="center">Issue Your Own Currency</h1>
          <div className="ic-pro-access-required">
            <h2>Bithomp Pro Required</h2>
            <p>This feature is available exclusively to Bithomp Pro subscribers.</p>
            <p>Upgrade to Pro to unlock the ability to create and issue your own custom currencies on the {ledgerName}.</p>
            <br />
            <center>
              <button className="button-action" onClick={openEmailLogin}>
                Register or Sign In
              </button>
            </center>
          </div>
        </div>
      </>
    )
  }


  // Generate WalletLocator from cold wallet address
  const generateWalletLocator = (address) => {
    if (!address) return ''
    // Convert address to hex and pad to 64 characters
    const addressHex = Array.from(address)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
    return addressHex.padEnd(64, '0').substring(0, 64).toUpperCase()
  }

  // Convert domain to hex
  const domainToHex = (domain) => {
    if (!domain) return ''
    return Array.from(domain)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }

  // Save token metadata to TOML file
  const saveTokenMetadata = async (cfTurnstileResponse = '') => {
    console.log('saveTokenMetadata =============================================>', cfTurnstileResponse)
    if (!domain) {
      return { success: false, error: 'Domain is required to save metadata' }
    }

    if (!tokenName || !tokenTicker || !currencyCode) {
      return { success: false, error: 'Token name, ticker, and currency code are required' }
    }

    try {
      // Format metadata as TOML
      const tomlContent = `
[[CURRENCIES]]
code = "${currencyCode}"
issuer = "${coldWalletAddress}"
display_decimals = ${tickSize || 5}
name = "${tokenName}"
symbol = "${tokenTicker}"
${tokenDescription ? `description = "${tokenDescription}"` : ''}

${tokenImagePreview ? `[CURRENCIES.image]\nurl = "${tokenImagePreview}"` : ''}
`.trim()

      // Call domain verification endpoint to save TOML
      const response = await axios.post('/v2/domainVerification', {
        domain: domain,
        'cf-turnstile-response': cfTurnstileResponse,
        toml: tomlContent
      })

      if (response.data.error) {
        return { success: false, error: response.data.error }
      }

      return { 
        success: true, 
        data: response.data,
        message: 'Token metadata saved successfully to TOML file'
      }
    } catch (error) {
      return { 
        success: false, 
        error: error?.response?.data?.error || error?.message || 'Failed to save metadata' 
      }
    }
  }

  // Handle cold address setting with comprehensive AccountSet
  const handleSetColdAddress = () => {    
    if (!coldWalletAddress) {
      setColdAddressError('Please enter a cold wallet address')
      return
    }

    if (!account?.address) {
      setColdAddressError('Please connect your wallet first')
      return
    }

    if (account.address !== coldWalletAddress) {
      setColdAddressError(`You must be signed in with the cold wallet address (${shortAddress(coldWalletAddress)}). Currently signed in as ${shortAddress(account.address)}.`)
      return
    }

    const generatedWalletLocator = generateWalletLocator(coldWalletAddress)
    
    // Validate WalletLocator format
    if (!/^[0-9A-F]{64}$/.test(generatedWalletLocator)) {
      setColdAddressError('Invalid cold wallet address format')
      return
    }
    
    setColdAddressError('')
    setColdAddressSuccess('')

    // Build TF flags
    let tfFlags = 0
    if (requireDestTag) {
      tfFlags |= TF_FLAGS.requireDestTag.set
    }
    if (disallowXRP) {
      tfFlags |= TF_FLAGS.disallowXRP.set
    }

    // Validate TransferRate and TickSize
    const transferRateValue = parseFloat(coldTransferRate)
    const tickSizeValue = parseInt(tickSize)
    
    if (transferRateValue < 0 || transferRateValue > 1) {
      setColdAddressError('Transfer rate must be between 0 and 1')
      return
    }
    
    if (tickSizeValue < 0 || tickSizeValue > 15) {
      setColdAddressError('Tick size must be between 0 and 15')
      return
    }

    // Create comprehensive AccountSet transaction
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address,
      TickSize: tickSizeValue,
      WalletLocator: generatedWalletLocator,
      SetFlag: ASF_FLAGS.asfDefaultRipple
    }

    if (transferRateValue > 0) {
      tx.TransferRate = 1000000000 + Math.round(transferRateValue * 1000000000)
    }

    // Add domain if provided
    if (domain) {
      // Validate domain format (basic validation)
      if (domain.length > 256) {
        setColdAddressError('Domain name too long (maximum 256 characters)')
        return
      }
      tx.Domain = domainToHex(domain)
    }

    // Add TF flags if any are set
    if (tfFlags > 0) {
      tx.Flags = tfFlags
    }

    try {
      setSignRequest({
        request: tx,
        data: tx,
        type: 'transaction',
        callback: () => {
          setColdAddressSuccess('Cold address AccountSet transaction submitted successfully!')
          setColdAddressError('')
        },
        errorCallback: (error) => {
          setColdAddressError(`Transaction failed: ${error?.message || error || 'Unknown error'}`)
          setColdAddressSuccess('')
        }
      })
    } catch (error) {
      setColdAddressError(`Error preparing transaction: ${error?.message || error || 'Unknown error'}`)
    }
  }

  // Handle hot wallet AccountSet configuration
  const handleSetHotWallet = () => {
    
    if (!hotWalletAddress) {
      setHotWalletError('Please enter a hot wallet address')
      return
    }

    if (!account?.address) {
      setHotWalletError('Please connect your wallet first')
      return
    }

    if (account.address !== hotWalletAddress) {
      setHotWalletError(`You must be signed in with the hot wallet address (${shortAddress(hotWalletAddress)}). Currently signed in as ${shortAddress(account.address)}.`)
      return
    }

    setHotWalletError('')
    setHotWalletSuccess('')

    // Build TF flags for hot wallet
    let hotTfFlags = 0
    if (hotRequireDestTag) {
      hotTfFlags |= TF_FLAGS.requireDestTag.set
    }
    if (hotDisallowXRP) {
      hotTfFlags |= TF_FLAGS.disallowXRP.set
    }

    // Create hot wallet AccountSet transaction
    const tx = {
      TransactionType: 'AccountSet',
      Account: account.address
    }

    // Add domain if provided
    if (hotDomain) {
      tx.Domain = domainToHex(hotDomain)
    }

    // Add SetFlag for RequireAuth if enabled
    if (hotRequireAuth) {
      tx.SetFlag = ASF_FLAGS.asfRequireAuth
    }

    // Add TF flags if any are set
    if (hotTfFlags > 0) {
      tx.Flags = hotTfFlags
    }

    setIsSettingHotWallet(true)
    
    try {
      setSignRequest({
        request: tx,
        data: tx,
        type: 'transaction',
        callback: async () => {
          setHotWalletSuccess('Hot wallet AccountSet transaction submitted successfully!')
          setHotWalletError('')
          setIsSettingHotWallet(false)
          
          // Save token metadata to TOML file if all required data is available
          if (domain && tokenName && tokenTicker && currencyCode && coldWalletAddress) {
            const metadataResult = await saveTokenMetadata()
            if (metadataResult.success) {
              setHotWalletSuccess('Hot wallet configured and token metadata saved successfully!')
            } else {
              setHotWalletSuccess(`Hot wallet configured successfully, but metadata save failed: ${metadataResult.error}`)
            }
          }
        },
        errorCallback: (error) => {
          setHotWalletError(`Transaction failed: ${error?.message || error || 'Unknown error'}`)
          setHotWalletSuccess('')
          setIsSettingHotWallet(false)
        }
      })
    } catch (error) {
      setHotWalletError(`Error preparing transaction: ${error?.message || error || 'Unknown error'}`)
      setIsSettingHotWallet(false)
    }
  }

  // Handle token issuance from cold to hot wallet
  const handleIssueTokens = () => {
    
    if (!issueQuantity || !currencyCode || !coldWalletAddress || !hotWalletAddress) {
      setTokenError('Please fill in all required fields for token issuance')
      return
    }

    if (!account?.address) {
      setTokenError('Please connect your wallet first')
      return
    }

    if (account.address !== coldWalletAddress) {
      setTokenError(`You must be signed in with the cold wallet address (${shortAddress(coldWalletAddress)}). Currently signed in as ${shortAddress(account.address)}.`)
      return
    }

    setTokenError('')
    setTokenSuccess('')

    // Create Payment transaction for token issuance
    const tx = {
      TransactionType: 'Payment',
      Account: account.address,
      Amount: {
        currency: currencyCode,
        value: issueQuantity,
        issuer: coldWalletAddress
      },
      Destination: hotWalletAddress
    }

    // Add destination tag if required
    if (hotRequireDestTag && destinationTag) {
      tx.DestinationTag = parseInt(destinationTag)
    }

    try {
      setSignRequest({
        request: tx,
        data: tx,
        type: 'transaction',
        callback: () => {
          setTokenSuccess(`Successfully issued ${issueQuantity} ${currencyCode} to hot wallet!`)
          setTokenError('')
        },
        errorCallback: (error) => {
          setTokenError(`Token issuance failed: ${error?.message || error || 'Unknown error'}`)
          setTokenSuccess('')
        }
      })
    } catch (error) {
      setTokenError(`Error preparing transaction: ${error?.message || error || 'Unknown error'}`)
      setTokenSuccess('')
    }
  }

  const handleCreateTrustLine = () => {
    setTrustLineError('')
    setTrustLineSuccess('')

    if (!account?.address) {
      setTrustLineError('Please connect your wallet first')
      return
    }

    if (account.address !== hotWalletAddress) {
      setTrustLineError(`You must be signed in with the hot wallet address (${shortAddress(hotWalletAddress)}). Currently signed in as ${shortAddress(account.address)}.`)
      return
    }

    const tx = {
      TransactionType: 'TrustSet',
      Account: account.address,
      LimitAmount: {
        currency: currencyCode,
        issuer: coldWalletAddress,
        value: totalSupply
      }
    }

    setIsCreatingTrustLine(true)
    try {
      setSignRequest({
        request: tx,
        data: tx,
        type: 'transaction',
        callback: () => {
          setTrustLineSuccess('TrustLine created successfully!')
          setTrustLineError('')
          setIsCreatingTrustLine(false)
        },
        errorCallback: (error) => {
          setTrustLineError(`TrustLine creation failed: ${error?.message || error || 'Unknown error'}`)
          setTrustLineSuccess('')
          setIsCreatingTrustLine(false)
        }
      })
    } catch (error) {
      setTrustLineError(`Error preparing transaction: ${error?.message || error || 'Unknown error'}`)
      setIsCreatingTrustLine(false)
    }
  }

  return (
    <>
      <SEO
        title="Issue Your Own Currency"
        description={`Create and issue your own custom currency on the ${ledgerName} - Bithomp Pro feature`}
      />

      <section className="home-section">
        <h1 className="center">Issue Your Own Currency</h1>
        <p className="center">Create and manage your own custom tokens on the {ledgerName}</p>
        <NetworkTabs />
      </section>

      <div>
        {/* Progress Indicator */}
        <div className="ic-step-progress">
          <div className="ic-step-indicator">
            <div className={`ic-step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className={`ic-step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
            <div className={`ic-step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
            <div className={`ic-step ${currentStep >= 4 ? 'active' : ''}`}>4</div>
          </div>
        </div>

        {/* Step 1: Token Information and Supply Type */}
        {currentStep === 1 && (
          <div className="ic-step-container">
            <h2>Step 1: Token Information and Supply Type</h2>
            <p>First, provide your token information and decide whether you want a Closed Supply or Open Supply currency.</p>
            
            <div className="ic-token-metadata">
              <h3>Token Information:</h3>
              <p>Provide basic information about your token for identification and display purposes.</p>
              
              <div className="ic-form-section">
                <FormInput
                  title={<span className="bold">Token Name</span>}
                  placeholder="e.g., My Custom Token"
                  setInnerValue={setTokenName}
                  defaultValue={tokenName}
                  hideButton={true}
                />
                <small>The full name of your token</small>
                <div className="form-spacing" />
                
                <FormInput
                  title={<span className="bold">Token Ticker/Symbol</span>}
                  placeholder="e.g., MCT"
                  setInnerValue={setTokenTicker}
                  defaultValue={tokenTicker}
                  hideButton={true}
                />
                <small>The short ticker symbol (typically 3-4 characters)</small>
                <div className="form-spacing" />
                
                <FormInput
                  title={<span className="bold">Token Description</span>}
                  placeholder="e.g., A utility token for..."
                  setInnerValue={setTokenDescription}
                  defaultValue={tokenDescription}
                  hideButton={true}
                />
                <small>Brief description of your token's purpose and use case</small>
                <div className="form-spacing" />
                
                <div className="ic-image-upload">
                  <label className="bold">Token Image/Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="token-image-upload"
                  />
                  <label htmlFor="token-image-upload" className="ic-image-preview-wrapper">
                    {tokenImagePreview ? (
                      <div className="ic-image-preview">
                        <img src={tokenImagePreview} alt="Token preview" />
                        <div className="ic-image-overlay">
                          <FiUpload className="ic-upload-icon" />
                        </div>
                      </div>
                    ) : (
                      <div className="ic-image-preview ic-image-placeholder">
                        <FiUpload className="ic-upload-icon" />
                      </div>
                    )}
                  </label>
                  <small>Upload a square image (PNG, JPG, or SVG) for your token. Max size: 5MB</small>
                </div>
              </div>
            </div>
            
            <div className="ic-supply-type-selection">
              <h3>Choose Your Supply Type:</h3>
              <div className="ic-radio-options">
                <label className={`ic-radio-option ${supplyType === 'closed' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="supplyType"
                    value="closed"
                    checked={supplyType === 'closed'}
                    onChange={(e) => setSupplyType(e.target.value)}
                  />
                  <div className="ic-option-content">
                    <h4>Closed Supply</h4>
                    <p>Fixed total supply that cannot be increased. The issuer account will be blackholed (keys destroyed) after issuance.</p>
                    <ul>
                      <li>Maximum supply is fixed forever</li>
                      <li>Issuer account becomes unchangeable</li>
                      <li>Higher security and trust</li>
                      <li>Suitable for tokens with fixed economics</li>
                    </ul>
                  </div>
                </label>
                
                <label className={`ic-radio-option ${supplyType === 'open' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="supplyType"
                    value="open"
                    checked={supplyType === 'open'}
                    onChange={(e) => setSupplyType(e.target.value)}
                  />
                  <div className="ic-option-content">
                    <h4>Open Supply</h4>
                    <p>Flexible supply that can be increased or decreased by the issuer account.</p>
                    <ul>
                      <li>Can mint additional tokens</li>
                      <li>Can burn tokens to reduce supply</li>
                      <li>Issuer maintains control</li>
                      <li>Suitable for dynamic token economics</li>
                    </ul>
                  </div>
                </label>
              </div>
            </div>

            {/* Cold wallet moved to Step 2 */}

            <div className="ic-step-actions">
              <button 
                className="ic-button-action"
                onClick={handleNextStep}
                disabled={!canProceedFromStep1}
              >
                Continue to Step 2
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Cold Wallet (Issuer) */}
        {currentStep === 2 && (
          <div className="ic-step-container">
            <h2>Step 2: Configure Cold Wallet (Issuer)</h2>
            <p>Set up your issuer account (cold wallet). This account will issue your currency.</p>

            {/* Cold wallet content moved here */}
            <div className="ic-cold-wallet-setup">
              <h3>Create and Configure Your Issuer Account (Cold Wallet):</h3>
              <p>
                This will be your cold wallet that issues the currency.
                {supplyType === 'closed' ?
                  ' It will be blackholed after issuance for maximum security.' :
                  ' You will maintain control over this account.'
                }
                Configure comprehensive AccountSet settings including transfer rates, tick size, domain, and security flags.
              </p>
              
              <div className="ic-wallet-signin-info">
                <h4>⚠️ Important: Wallet Sign-In Required</h4>
                <p><strong>To configure the cold wallet, you must be signed in with the cold wallet address.</strong></p>
                <p>When you enter the cold wallet address below and click "Configure Cold Wallet", you need to be signed in with that same wallet to authorize the transaction.</p>
                {!account?.address && (
                  <p className="ic-warning-text">⚠️ You are not currently signed in. Please sign in with your cold wallet address before configuring.</p>
                )}
                {account?.address && coldWalletAddress && account.address !== coldWalletAddress && (
                  <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}, but you entered {shortAddress(coldWalletAddress)} as the cold wallet. Please sign in with the cold wallet address.</p>
                )}
                {account?.address && coldWalletAddress && account.address === coldWalletAddress && (
                  <p className="ic-success-text">✓ You are signed in with the correct wallet ({shortAddress(account.address)})</p>
                )}
              </div>
              
              <AddressInput
                title={<span className="bold">Cold Wallet Address (Issuer Account)</span>}
                placeholder="r..."
                setInnerValue={setColdWalletAddress}
                rawData={coldWalletAddress}
                hideButton={true}
              />
              
              {supplyType === 'closed' && (
                <div className="ic-blackhole-warning">
                  <h4>⚠️ Blackhole Warning</h4>
                  <p>For Closed Supply, the issuer account will be blackholed (keys destroyed) after issuance. This means:</p>
                  <ul>
                    <li>No one can ever mint new tokens</li>
                    <li>No one can freeze or modify the currency</li>
                    <li>The total supply becomes permanently fixed</li>
                    <li>This action is irreversible</li>
                  </ul>
                </div>
              )}
              
              <div className="ic-cold-address-form">
                <div className="ic-form-section">
                  <h4>Basic Settings</h4>

                  <FormInput
                    title={<span className="bold">Transfer Rate (0–1)</span>}
                    placeholder="0"
                    setInnerValue={setColdTransferRate}
                    defaultValue={coldTransferRate}
                    hideButton={true}
                    />
                  <small>Transfer rate is a fee fraction charged on payments made in this token. Enter a value from 0 to 1 (e.g., 0.01 for 1%).</small>
                  <div className="form-spacing">
                    {!(coldTransferRate >= 0 && coldTransferRate <= 1) && window.innerWidth > 800 &&
                      <span className="error-text red">Transfer rate must be between 0 and 1</span>
                    }
                  </div>
                  
                  <FormInput
                    title={<span className="bold">Tick Size</span>}
                    placeholder="5"
                    setInnerValue={setTickSize}
                    defaultValue={tickSize}
                    hideButton={true}
                  />
                  <small>Tick size is the number of significant digits for the currency.</small>
                  <div className="form-spacing">
                    {!(tickSize >= 0 && tickSize <= 15) && window.innerWidth > 800 &&
                      <span className="error-text red">Tick size must be between 0 and 15</span>
                    }
                  </div>
                  
                  <FormInput
                    title={<span className="bold">Domain (optional)</span>}
                    placeholder="example.com"
                    setInnerValue={setDomain}
                    defaultValue={domain}
                    hideButton={true}
                  />
                  <small>Domain is the domain name for the currency.</small>
                </div>

                <div className="ic-form-section">
                  <h4>Security Flags</h4>
                  <div className="ic-flag-options">
                    <div className={`ic-flag-option enabled`}>
                      <div className="ic-flag-header">
                        <label>
                          <input type="checkbox" checked={true} readOnly/>
                          <span>Enable Default Ripple</span>
                        </label>
                      </div>
                      <div className="ic-flag-status">
                        <small>Allow rippling on trust lines by default </small>
                        <span className="ic-flag-status-indicator no-brake">
                          ✓ Enabled
                        </span>
                      </div>
                    </div>
                      <div 
                        className={`ic-flag-option ${disallowXRP ? 'enabled' : 'disabled'}`}
                        onClick={() => {
                          setDisallowXRP(!disallowXRP)
                        }}
                      >
                      <div className="ic-flag-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={disallowXRP}
                            onChange={(e) => {
                              setDisallowXRP(e.target.checked)
                            }}
                          />
                          <span>Disallow {nativeCurrency}</span>
                        </label>
                      </div>
                      <div className="ic-flag-status">
                        <small>Prevent incoming {nativeCurrency} payments </small>
                        <span className="ic-flag-status-indicator no-brake">
                          {disallowXRP ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </div>
                    </div>
                      <div 
                        className={`ic-flag-option ${requireDestTag ? 'enabled' : 'disabled'}`}
                        onClick={() => {
                          setRequireDestTag(!requireDestTag)
                        }}
                      >
                      <div className="ic-flag-header">
                        <label>
                          <input
                            type="checkbox"
                            checked={requireDestTag}
                            onChange={(e) => {
                              setRequireDestTag(e.target.checked)
                            }}
                          />
                          <span>Require Destination Tag</span>
                        </label>
                      </div>
                      <div className="ic-flag-status">
                        <small>Require destination tag for incoming payments </small>
                        <span className="ic-flag-status-indicator no-brake">
                          {requireDestTag ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {coldAddressError && (
                  <div className="ic-error-message">
                    <span className="error-text">{coldAddressError}</span>
                  </div>
                )}

                {coldAddressSuccess && (
                  <div className="ic-success-message">
                    <span className="success-text">{coldAddressSuccess}</span>
                  </div>
                )}

                <div className="ic-cold-address-actions">
                  <button 
                    className="ic-button-action"
                    onClick={handleSetColdAddress}
                    disabled={!coldWalletAddress || !account?.address}
                  >
                    Configure Cold Wallet
                  </button>
                </div>
              </div>
            </div>

            <div className="ic-step-actions">
              <button 
                className="ic-button-action mr-2"
                onClick={handlePrevStep}
              >
                Back to Step 1
              </button>
              <button 
                className="ic-button-action"
                onClick={handleNextStep}
                disabled={!coldWalletAddress}
              >
                Continue to Step 3
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Hot Wallet Settings */}
        {currentStep === 3 && (
          <div className="ic-step-container">
            <h2>Step 3: Configure Hot Wallet Settings</h2>
            <p>Set up your hot wallet that will hold and manage the issued currency for daily operations.</p>
            
            <div className="ic-hot-wallet-setup">
              <h3>Hot Wallet Configuration:</h3>
              <p>The hot wallet is where you'll store the issued currency for trading, transfers, and other operations. This should be a separate account from your issuer account.</p>
              
              <div className="ic-wallet-signin-info">
                <h4>⚠️ Important: Wallet Sign-In Required</h4>
                <p><strong>To configure the hot wallet and create the trust line, you must be signed in with the hot wallet address.</strong></p>
                <p>The following operations require you to be signed in with the hot wallet:</p>
                <ul>
                  <li>Configure Hot Wallet AccountSet (current step)</li>
                  <li>Create TrustLine from hot wallet to cold wallet (Step 3)</li>
                </ul>
                {!account?.address && (
                  <p className="ic-warning-text">⚠️ You are not currently signed in. Please sign in with your hot wallet address before configuring.</p>
                )}
                {account?.address && hotWalletAddress && account.address !== hotWalletAddress && (
                  <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}, but you entered {shortAddress(hotWalletAddress)} as the hot wallet. Please sign in with the hot wallet address.</p>
                )}
                {account?.address && hotWalletAddress && account.address === hotWalletAddress && (
                  <p className="ic-success-text">✓ You are signed in with the correct wallet ({shortAddress(account.address)})</p>
                )}
              </div>
              
              <AddressInput
                title={<span className="bold">Hot Wallet Address</span>}
                placeholder="r..."
                setInnerValue={setHotWalletAddress}
                rawData={hotWalletAddress}
                hideButton={true}
              />
              
              <div className="ic-currency-properties">
                <h3>Currency Properties:</h3>
                <FormInput
                  title={<span className="bold">Currency Code</span>}
                  placeholder="e.g., USD, EUR, or custom hex"
                  setInnerValue={setCurrencyCode}
                  defaultValue={currencyCode}
                  hideButton={true}
                />
                <div className="ic-form-spacing" />
                <FormInput
                  title={<span className="bold">Total Supply</span>}
                  placeholder="e.g., 1000000"
                  setInnerValue={setTotalSupply}
                  defaultValue={totalSupply}
                  hideButton={true}
                />
              </div>
            </div>

            <div className="ic-hot-wallet-accountset">
              <h3>Configure Hot Wallet AccountSet Settings:</h3>
              <p>Set up security and operational settings for your hot wallet to prevent accidental trust line usage and enhance security.</p>
              
              <div className="ic-form-section">
                <h4>Basic Settings</h4>
                <FormInput
                  title={<span className="bold">Domain (optional)</span>}
                  placeholder="example.com"
                  setInnerValue={setHotDomain}
                  defaultValue={hotDomain}
                  hideButton={true}
                />
              </div>

              <div className="ic-form-section">
                <h4>Security Flags</h4>
                <div className="ic-flag-options">
                  <div 
                    className={`ic-flag-option ${hotRequireAuth ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      setHotRequireAuth(!hotRequireAuth)
                      setIsSettingHotWallet(false)
                    }}
                  >
                    <div className="ic-flag-header">
                      <label>
                        <input
                          type="checkbox"
                          checked={hotRequireAuth}
                          onChange={(e) => {
                            setHotRequireAuth(e.target.checked)
                            setIsSettingHotWallet(false)
                          }}
                        />
                        <span>Require Authorization</span>
                      </label>
                      
                      <div className="ic-flag-status">
                        <small>Prevents accidental trust line usage by requiring explicit authorization </small>
                        <span className="ic-flag-status-indicator no-brake">
                        {hotRequireAuth ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`ic-flag-option ${hotDisallowXRP ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      setHotDisallowXRP(!hotDisallowXRP)
                      setIsSettingHotWallet(false)
                    }}
                  >
                    <div className="ic-flag-header">
                      <label>
                        <input
                          type="checkbox"
                          checked={hotDisallowXRP}
                          onChange={(e) => {
                            setHotDisallowXRP(e.target.checked)
                            setIsSettingHotWallet(false)
                          }}
                        />
                        <span>Disallow {nativeCurrency}</span>
                      </label>
                      <div className="ic-flag-status">
                        <small>Prevent incoming {nativeCurrency} payments to hot wallet </small>
                        <span className="ic-flag-status-indicator no-brake">
                        {hotDisallowXRP ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`ic-flag-option ${hotRequireDestTag ? 'enabled' : 'disabled'}`}
                    onClick={() => {
                      setHotRequireDestTag(!hotRequireDestTag)
                      setIsSettingHotWallet(false)
                    }}
                  >
                    <div className="ic-flag-header">
                      <label>
                        <input
                          type="checkbox"
                          checked={hotRequireDestTag}
                          onChange={(e) => {
                            setHotRequireDestTag(e.target.checked)
                            setIsSettingHotWallet(false)
                          }}
                        />
                        <span>Require Destination Tag</span>
                      </label>
                      <div className="ic-flag-status">
                        <small>Require destination tag for incoming payments </small>
                        <span className="ic-flag-status-indicator no-brake">
                          {hotRequireDestTag ? '✓ Enabled' : '✗ Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {hotWalletError && (
                <div className="ic-error-message">
                  <span className="error-text">{hotWalletError}</span>
                </div>
              )}

              {hotWalletSuccess && (
                <div className="ic-success-message">
                  <span className="success-text">{hotWalletSuccess}</span>
                </div>
              )}

              <div className="ic-hot-wallet-actions">
                <button 
                  className="ic-button-action"
                  onClick={handleSetHotWallet}
                  disabled={!hotWalletAddress || !account?.address || isSettingHotWallet}
                >
                  {isSettingHotWallet ? 'Configuring Hot Wallet...' : 'Configure Hot Wallet'}
                </button>
              </div>
            </div>

            <div className="ic-step-actions">
              <button 
                className="ic-button-action mr-2"
                onClick={handlePrevStep}
              >
                Back to Step 2
              </button>
              <button 
                className="ic-button-action"
                onClick={handleNextStep}
                disabled={!canProceedFromStep2}
              >
                Continue to Step 4
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Create TrustLine and Issue Tokens */}
        {currentStep === 4 && (
          <div className="ic-step-container">
            <h2>Step 4: Create TrustLine and Issue Tokens</h2>
            <p>Create a trust line from hot to cold wallet, then issue tokens from cold to hot.</p>

            <div className="ic-wallet-signin-info">
              <h4>⚠️ Important: Different Wallets for Different Operations</h4>
              <p>Step 3 involves multiple transactions that require different wallet sign-ins:</p>
              <ul>
                <li><strong>Create TrustLine:</strong> Sign in with the <strong>hot wallet</strong> ({hotWalletAddress ? shortAddress(hotWalletAddress) : 'not set'})</li>
                <li><strong>Issue Tokens (Cold to Hot):</strong> Sign in with the <strong>cold wallet</strong> ({coldWalletAddress ? shortAddress(coldWalletAddress) : 'not set'})</li>
              </ul>
              <p>Make sure to switch between wallets as needed for each operation.</p>
              {account?.address && (
                <p className="ic-info-text">Currently signed in as: <strong>{shortAddress(account.address)}</strong></p>
              )}
            </div>

            {/* Step 1: Create TrustLine */}
            <div className="ic-trustline-step">
              <h3>1. Create TrustLine</h3>
              <p><strong>Required wallet:</strong> Sign in with the hot wallet ({hotWalletAddress ? shortAddress(hotWalletAddress) : 'not set'})</p>
              {account?.address && hotWalletAddress && account.address !== hotWalletAddress && (
                <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}. Please sign in with the hot wallet ({shortAddress(hotWalletAddress)}) to create the trust line.</p>
              )}
              {account?.address && hotWalletAddress && account.address === hotWalletAddress && (
                <p className="ic-success-text">✓ You are signed in with the hot wallet ({shortAddress(account.address)})</p>
              )}
              <div className="ic-trustline-info">
                <h4>TrustLine Setup Details:</h4>
                <ul>
                  <li><strong>Currency:</strong> {currencyCode}</li>
                  <li><strong>Issuer:</strong> {window.innerWidth > 800 ? coldWalletAddress : shortAddress(coldWalletAddress)}</li>
                  <li><strong>Limit:</strong> {totalSupply}</li>
                </ul>
              </div>
              <button 
                className="ic-button-action"
                onClick={handleCreateTrustLine}
              >
                {isCreatingTrustLine ? 'Creating TrustLine...' : 'Create TrustLine'}
              </button>
              {trustLineError && (
                <div className="ic-error-message">
                  <span className="error-text red">{trustLineError}</span>
                </div>
              )}
              {trustLineSuccess && (
                <div className="ic-success-message">
                  <span className="success-text green">{trustLineSuccess}</span>
                </div>
              )}
            </div>

            {/* Step 2: Issue Tokens from Cold to Hot */}
            <div className="ic-issue-tokens-step">
              <h3>2. Issue Tokens (Cold to Hot Wallet)</h3>
              <p><strong>Required wallet:</strong> Sign in with the cold wallet ({coldWalletAddress ? shortAddress(coldWalletAddress) : 'not set'})</p>
              <p>Issue tokens from your cold wallet to the hot wallet for operational use.</p>
              {account?.address && coldWalletAddress && account.address !== coldWalletAddress && (
                <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}. Please sign in with the cold wallet ({shortAddress(coldWalletAddress)}) to issue tokens.</p>
              )}
              {account?.address && coldWalletAddress && account.address === coldWalletAddress && (
                <p className="ic-success-text">✓ You are signed in with the cold wallet ({shortAddress(account.address)})</p>
              )}
              
              <div className="ic-form-section">
                <h4>Token Issuance Settings</h4>
                <FormInput
                  title={<span className="bold">Issue Quantity</span>}
                  placeholder="e.g., 1000"
                  setInnerValue={setIssueQuantity}
                  defaultValue={issueQuantity}
                  hideButton={true}
                />
                
                {hotRequireDestTag && (
                  <FormInput
                    title={<span className="bold">Destination Tag</span>}
                    placeholder="1"
                    setInnerValue={setDestinationTag}
                    defaultValue={destinationTag}
                    hideButton={true}
                  />
                )}
              </div>

              <div className="ic-issue-actions">
                <button 
                  className="ic-button-action"
                  onClick={handleIssueTokens}
                >
                  Issue Tokens
                </button>
              </div>
              {/* Error and Success Messages */}
              {tokenError && (
                <div className="ic-error-message">
                  <span className="error-text">{tokenError}</span>
                </div>
              )}

              {tokenSuccess && (
                <div className="ic-success-message">
                  <span className="success-text">{tokenSuccess}</span>
                </div>
              )}
            </div>

            <div className="ic-step-actions">
              <button 
                className="ic-button-action mr-2"
                onClick={handlePrevStep}
              >
                Back to Step 3
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
