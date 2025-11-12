import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import { Turnstile } from '@marsidev/react-turnstile'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SEO from '../../components/SEO'
import FormInput from '../../components/UI/FormInput'
import AddressInput from '../../components/UI/AddressInput'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import { ledgerName, nativeCurrency, turnstileSupportedLanguages } from '../../utils'
import { useTheme } from '../../components/Layout/ThemeContext'
import { getIsSsrMobile } from '../../utils/mobile'
import { shortAddress } from '../../utils/format'
import { isDomainValid, stripDomain } from '../../utils'
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

export default function IssueCurrency({ account, setSignRequest }) {
  const { i18n } = useTranslation()
  const { theme } = useTheme()
  const [currentStep, setCurrentStep] = useState(1)
  const [supplyType, setSupplyType] = useState('') // 'closed' or 'open'
  const [coldWalletAddress, setColdWalletAddress] = useState('')
  const [hotWalletAddress, setHotWalletAddress] = useState('')
  const [totalSupply, setTotalSupply] = useState('')
  const [coldAddressError, setColdAddressError] = useState('')
  const [coldAddressSuccess, setColdAddressSuccess] = useState('')
  
  // Token metadata fields
  const [tokenName, setTokenName] = useState('')
  const [tokenTicker, setTokenTicker] = useState('')
  const [tokenDescription, setTokenDescription] = useState('')
  const [tokenImageUrl, setTokenImageUrl] = useState('')
  
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
  // Turnstile
  const [siteKey, setSiteKey] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey] = useState(0)

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

  // Update canProceedFromStep1 when dependent values change
  useEffect(() => {
    setCanProceedFromStep1(!!supplyType)
  }, [supplyType])

  // Update canProceedFromStep2 when dependent values change
  useEffect(() => {
    setCanProceedFromStep2(!!hotWalletAddress)
  }, [hotWalletAddress])

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

  // Fetch Turnstile site key
  useEffect(() => {
    const fetchCaptcha = async () => {
      try {
        const res = await axios.get('client/captcha')
        const captchaData = res?.data
        if (captchaData?.captcha?.siteKey) setSiteKey(captchaData.captcha.siteKey)
      } catch (e) {
        // ignore errors
      }
    }
    fetchCaptcha()
  }, [])

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

  // Convert domain to hex
  const domainToHex = (domain) => {
    return Array.from(domain)
      .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }

  // Reusable FlagOption component
  const FlagOption = ({ title, description, checked, onChange, readOnly = false }) => {
    const statusClass = checked ? 'enabled' : 'disabled'
    const statusText = checked ? '✓ Enabled' : '✗ Disabled'
    
    return (
      <div 
        className={`ic-flag-option ${readOnly ? 'enabled' : statusClass}`}
        onClick={readOnly ? undefined : onChange}
      >
        <div className="ic-flag-header">
          <label>
            <input
              type="checkbox"
              checked={checked}
              onChange={readOnly ? undefined : (e) => onChange(e)}
              readOnly={readOnly}
            />
            <span>{title}</span>
          </label>
        </div>
        <div className="ic-flag-status">
          <small>{description}</small>
          <span className="ic-flag-status-indicator no-brake">
            {readOnly ? '✓ Enabled' : statusText}
          </span>
        </div>
      </div>
    )
  }

  // Reusable Message component for error and success messages
  const Message = ({ message, type = 'error', additionalClass = '' }) => {
    if (!message) return null
    
    const className = type === 'error' ? 'ic-error-message' : 'ic-success-message'
    const textClassName = type === 'error' ? 'error-text' : 'success-text'
    
    return (
      <div className={className}>
        <span className={`${textClassName} ${additionalClass}`}>{message}</span>
      </div>
    )
  }

  // Reusable wallet validation helper
  const validateWallet = (walletAddress, expectedAddress, setError) => {
    if (!walletAddress) {
      setError('Please enter a wallet address')
      return false
    }

    if (!account?.address) {
      setError('Please connect your wallet first')
      return false
    }

    if (account.address !== expectedAddress) {
      setError(`You must be signed in with the wallet address (${shortAddress(expectedAddress)}). Currently signed in as ${shortAddress(account.address)}.`)
      return false
    }

    return true
  }

  // Reusable StepActions component
  const StepActions = ({ onPrev, onNext, canProceed, prevLabel, nextLabel, showNext = true }) => {
    return (
      <div className="ic-step-actions">
        {onPrev && (
          <button 
            className="ic-button-action mr-2"
            onClick={onPrev}
          >
            {prevLabel || 'Back'}
          </button>
        )}
        {showNext && (
          <button 
            className="ic-button-action"
            onClick={onNext}
            disabled={!canProceed}
          >
            {nextLabel || 'Continue'}
          </button>
        )}
      </div>
    )
  }

  // Reusable WalletSignInInfo component
  const WalletSignInInfo = ({ title, description, walletAddress, walletType, operations }) => {
    return (
      <div className="ic-wallet-signin-info">
        <h4>{title || '⚠️ Important: Wallet Sign-In Required'}</h4>
        {description && <p><strong>{description}</strong></p>}
        {operations && (
          <>
            <p>The following operations require you to be signed in with the {walletType}:</p>
            <ul>
              {operations.map((op, idx) => (
                <li key={idx}>{op}</li>
              ))}
            </ul>
          </>
        )}
        {!account?.address && (
          <p className="ic-warning-text">⚠️ You are not currently signed in. Please sign in with your {walletType} address before configuring.</p>
        )}
        {account?.address && walletAddress && account.address !== walletAddress && (
          <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}, but you entered {shortAddress(walletAddress)} as the {walletType}. Please sign in with the {walletType} address.</p>
        )}
        {account?.address && walletAddress && account.address === walletAddress && (
          <p className="ic-success-text">✓ You are signed in with the correct wallet ({shortAddress(account.address)})</p>
        )}
      </div>
    )
  }

  // Generate new token TOML entry
  const generateTokenEntry = () => {
    let entry = `[[TOKENS]]
issuer = "${coldWalletAddress}"
currency = "${tokenTicker}"
name = "${tokenName}"`
    
    if (tokenDescription) {
      entry += `\ndesc = "${tokenDescription}"`
    }
    
    if (tokenImageUrl) {
      entry += `\nicon = "${tokenImageUrl}"`
    }
    
    entry += `\nasset_class = "rwa"
asset_subclass = "stablecoin"`
    
    return entry
  }

  // Merge token entry into existing TOML
  const mergeTokenIntoToml = (rawtoml, toml, newTokenEntry) => {
    if (!rawtoml || !rawtoml.trim()) {
      // No existing TOML, create new one
      return `# xrp-ledger.toml

${newTokenEntry}
`
    }

    // Check if TOKENS section exists in parsed toml
    const hasTokens = toml && toml.TOKENS && Array.isArray(toml.TOKENS) && toml.TOKENS.length > 0

    if (!hasTokens) {
      // TOKENS doesn't exist, append to the end
      return `${rawtoml.trim()}

${newTokenEntry}
`
    }

    // TOKENS exists, need to add to existing TOKENS section
    // Find the last TOKENS section and add after it
    const lines = rawtoml.split('\n')
    const result = []
    let i = 0
    let lastTokensIndex = -1

    // First pass: find the last TOKENS section index
    for (let idx = 0; idx < lines.length; idx++) {
      if (lines[idx].trim() === '[[TOKENS]]') {
        lastTokensIndex = idx
      }
    }

    if (lastTokensIndex === -1) {
      // TOKENS section not found in rawtoml but exists in parsed toml, append at end
      return `${rawtoml.trim()}

${newTokenEntry}
`
    }

    // Second pass: build result, adding new entry after last TOKENS section
    i = 0
    while (i < lines.length) {
      const line = lines[i]
      
      // If this is the last TOKENS section, process it and add new entry after
      if (i === lastTokensIndex) {
        result.push(line) // Add [[TOKENS]] header
        i++
        
        // Add all lines of this TOKENS entry until next section
        while (i < lines.length) {
          const nextLine = lines[i]
          // Stop if we hit another section header
          if (nextLine.trim().startsWith('[[') && nextLine.trim() !== '[[TOKENS]]') {
            break
          }
          // Stop if we hit a top-level section (single bracket)
          if (nextLine.trim().startsWith('[') && !nextLine.trim().startsWith('[[')) {
            break
          }
          result.push(nextLine)
          i++
        }
        
        // Add new token entry after this TOKENS entry
        result.push('')
        result.push(newTokenEntry)
        continue
      }
      
      result.push(line)
      i++
    }

    return result.join('\n')
  }

  // Download TOML file
  const downloadTomlFile = (content, filename = 'xrp-ledger.toml') => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Save token metadata to TOML file
  const saveTokenMetadata = async (captchaToken) => {
    if (!domain) {
      return { success: false, error: 'Domain is required to save metadata' }
    }

    if (!tokenName || !tokenTicker) {
      return { success: false, error: 'Token name, ticker, and currency code are required' }
    }

    try {
      const response = await axios.post('/v2/domainVerification', {
        domain: domain,
        'cf-turnstile-response': captchaToken,
      })

      if (response.data.error) {
        return { success: false, error: response.data.error }
      }

      const { rawtoml, toml } = response.data
      const newTokenEntry = generateTokenEntry()
      const finalTomlContent = mergeTokenIntoToml(rawtoml || '', toml || {}, newTokenEntry)
      downloadTomlFile(finalTomlContent)

      const tomlExists = rawtoml && rawtoml.trim().length > 0
      const statusMessage = tomlExists
        ? 'Updated existing TOML file with new token entry'
        : 'Created new TOML file with token entry'

      return { 
        success: true, 
        data: response.data,
        message: `${statusMessage}. File downloaded. Please upload it to: https://${domain}/.well-known/xrp-ledger.toml`
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
    if (!validateWallet(coldWalletAddress, coldWalletAddress, setColdAddressError)) {
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
      SetFlag: ASF_FLAGS.asfDefaultRipple
    }

    if (transferRateValue > 0) {
      tx.TransferRate = 1000000000 + Math.round(transferRateValue * 1000000000)
    }

    // Add domain if provided
    const isValidDomain = isDomainValid(domain)
    if (!isValidDomain) {
      setColdAddressError('Invalid domain format')
      return
    }
    if (domain) {
      tx.Domain = domainToHex(stripDomain(domain))
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
    if (!validateWallet(hotWalletAddress, hotWalletAddress, setHotWalletError)) {
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
      tx.Domain = domainToHex(stripDomain(hotDomain))
    }

    // Add SetFlag for RequireAuth if enabled
    if (hotRequireAuth) {
      tx.SetFlag = ASF_FLAGS.asfRequireAuth
    }

    // Add TF flags if any are set
    if (hotTfFlags > 0) {
      tx.Flags = hotTfFlags
    }
    
    try {
      setSignRequest({
        request: tx,
        data: tx,
        type: 'transaction',
        callback: async () => {
          setHotWalletSuccess('Hot wallet AccountSet transaction submitted successfully!')
          setHotWalletError('')
        },
        errorCallback: (error) => {
          setHotWalletError(`Transaction failed: ${error?.message || error || 'Unknown error'}`)
          setHotWalletSuccess('')
        }
      })
    } catch (error) {
      setHotWalletError(`Error preparing transaction: ${error?.message || error || 'Unknown error'}`)
    }
  }

  // Handle token issuance from cold to hot wallet
  const handleIssueTokens = () => {
    if (!issueQuantity || !tokenTicker || !coldWalletAddress || !hotWalletAddress) {
      setTokenError('Please fill in all required fields for token issuance')
      return
    }

    if (!validateWallet(coldWalletAddress, coldWalletAddress, setTokenError)) {
      return
    }

    setTokenError('')
    setTokenSuccess('')

    // Create Payment transaction for token issuance
    const tx = {
      TransactionType: 'Payment',
      Account: account.address,
      Amount: {
        currency: tokenTicker,
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
        callback: async () => {
          setTokenSuccess(`Successfully issued ${issueQuantity} ${tokenTicker} to hot wallet!`)
          setTokenError('')
          const metadataResult = await saveTokenMetadata(captchaToken)
          if (metadataResult.success) {
            setTokenSuccess(`Successfully issued ${issueQuantity} ${tokenTicker} and saved metadata!`)
          } else {
            setTokenSuccess(`Successfully issued ${issueQuantity} ${tokenTicker}, but metadata save failed: ${metadataResult.error}`)
          }
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

    if (!validateWallet(hotWalletAddress, hotWalletAddress, setTrustLineError)) {
      return
    }

    const tx = {
      TransactionType: 'TrustSet',
      Account: account.address,
      LimitAmount: {
        currency: tokenTicker,
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
        description={`Create and issue your own custom currency on the ${ledgerName}`}
      />

      <section className="home-section">
        <h1 className="center">Issue Your Own Currency</h1>
        <p className="center">Create and manage your own custom tokens on the {ledgerName}</p>
        <NetworkTabs />
      </section>

      <div>
        <div className="ic-step-progress">
          <div className="ic-step-indicator">
            <div className={`ic-step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            <div className={`ic-step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
            <div className={`ic-step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
            <div className={`ic-step ${currentStep >= 4 ? 'active' : ''}`}>4</div>
          </div>
        </div>

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
                  title={<span className="bold">Token Ticker</span>}
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
                
                <FormInput
                  title={<span className="bold">Token Image/Logo (IPFS URL)</span>}
                  placeholder="e.g., ipfs://QmXxxx..."
                  setInnerValue={setTokenImageUrl}
                  defaultValue={tokenImageUrl}
                  hideButton={true}
                />
                <small>Enter the IPFS URL for your token image/logo (e.g., ipfs://QmXxxx...)</small>
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

            <StepActions 
              onNext={handleNextStep}
              canProceed={canProceedFromStep1}
              nextLabel="Continue to Step 2"
              showNext={true}
            />
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
              
              <WalletSignInInfo
                description="To configure the cold wallet, you must be signed in with the cold wallet address."
                walletAddress={coldWalletAddress}
                walletType="cold wallet"
              />
              <p>When you enter the cold wallet address below and click "Configure Cold Wallet", you need to be signed in with that same wallet to authorize the transaction.</p>
              
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
                  <small>Transfer rate is a fee fraction charged on payments made in this token. Enter a value from 0 to 1.</small>
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
                    title={<span className="bold">Domain</span>}
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
                    <FlagOption
                      title="Enable Default Ripple"
                      description="Allow rippling on trust lines by default"
                      checked={true}
                      readOnly={true}
                    />
                    <FlagOption
                      title={`Disallow ${nativeCurrency}`}
                      description={`Prevent incoming ${nativeCurrency} payments`}
                      checked={disallowXRP}
                      onChange={() => setDisallowXRP(!disallowXRP)}
                    />
                    <FlagOption
                      title="Require Destination Tag"
                      description="Require destination tag for incoming payments"
                      checked={requireDestTag}
                      onChange={() => setRequireDestTag(!requireDestTag)}
                    />
                  </div>
                </div>

                <Message message={coldAddressError} type="error" />
                <Message message={coldAddressSuccess} type="success" />

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

            <StepActions 
              onPrev={handlePrevStep}
              onNext={handleNextStep}
              canProceed={!!coldWalletAddress}
              prevLabel="Back to Step 1"
              nextLabel="Continue to Step 3"
            />
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
              
              <WalletSignInInfo
                description="To configure the hot wallet and create the trust line, you must be signed in with the hot wallet address."
                walletAddress={hotWalletAddress}
                walletType="hot wallet"
                operations={[
                  'Configure Hot Wallet AccountSet (current step)',
                  'Create TrustLine from hot wallet to cold wallet (Step 4)'
                ]}
              />
              
              <AddressInput
                title={<span className="bold">Hot Wallet Address</span>}
                placeholder="r..."
                setInnerValue={setHotWalletAddress}
                rawData={hotWalletAddress}
                hideButton={true}
              />
              <h3>Configure Hot Wallet AccountSet Settings:</h3>
              <p>Set up security and operational settings for your hot wallet to prevent accidental trust line usage and enhance security.</p>
              
              <div className="ic-form-section">
                <h4>Basic Settings</h4>
                <FormInput
                  title={<span className="bold">Domain</span>}
                  placeholder="example.com"
                  setInnerValue={setHotDomain}
                  defaultValue={hotDomain}
                  hideButton={true}
                />
              </div>

              <div className="ic-form-section">
                <h4>Security Flags</h4>
                <div className="ic-flag-options">
                  <FlagOption
                    title="Require Authorization"
                    description="Prevents accidental trust line usage by requiring explicit authorization"
                    checked={hotRequireAuth}
                    onChange={() => setHotRequireAuth(!hotRequireAuth)}
                  />
                  <FlagOption
                    title={`Disallow ${nativeCurrency}`}
                    description={`Prevent incoming ${nativeCurrency} payments to hot wallet`}
                    checked={hotDisallowXRP}
                    onChange={() => setHotDisallowXRP(!hotDisallowXRP)}
                  />
                  <FlagOption
                    title="Require Destination Tag"
                    description="Require destination tag for incoming payments"
                    checked={hotRequireDestTag}
                    onChange={() => setHotRequireDestTag(!hotRequireDestTag)}
                  />
                </div>
              </div>

              <Message message={hotWalletError} type="error" />
              <Message message={hotWalletSuccess} type="success" />

              <div className="ic-hot-wallet-actions">
                <button 
                  className="ic-button-action"
                  onClick={handleSetHotWallet}
                  disabled={!hotWalletAddress || !account?.address}
                >
                  Configure Hot Wallet
                </button>
              </div>
            </div>

            <StepActions 
              onPrev={handlePrevStep}
              onNext={handleNextStep}
              canProceed={canProceedFromStep2}
              prevLabel="Back to Step 2"
              nextLabel="Continue to Step 4"
            />
          </div>
        )}

        {/* Step 4: Create TrustLine and Issue Tokens */}
        {currentStep === 4 && (
          <div className="ic-step-container">
            <h2>Step 4: Create TrustLine and Issue Tokens</h2>
            <p>Create a trust line from hot to cold wallet, then issue tokens from cold to hot.</p>

            <WalletSignInInfo
              title="⚠️ Important: Different Wallets for Different Operations"
              walletAddress={null}
              walletType=""
            />
            <p>Step 4 involves multiple transactions that require different wallet sign-ins:</p>
            <ul>
              <li><strong>Create TrustLine:</strong> Sign in with the <strong>hot wallet</strong> ({hotWalletAddress ? shortAddress(hotWalletAddress) : 'not set'})</li>
              <li><strong>Issue Tokens (Cold to Hot):</strong> Sign in with the <strong>cold wallet</strong> ({coldWalletAddress ? shortAddress(coldWalletAddress) : 'not set'})</li>
            </ul>
            <p>Make sure to switch between wallets as needed for each operation.</p>
            {account?.address && (
              <p className="ic-info-text">Currently signed in as: <strong>{shortAddress(account.address)}</strong></p>
            )}

            {/* Step 1: Create TrustLine */}
            <div className="ic-trustline-step">
              <h3>1. Create TrustLine</h3>
              <p><strong>Required wallet:</strong> Sign in with the hot wallet ({hotWalletAddress ? shortAddress(hotWalletAddress) : 'not set'})</p>
              <div className="ic-form-section">
                <h4>Currency Properties</h4>
                <div className="ic-form-spacing" />
                <FormInput
                  title={<span className="bold">Total Supply</span>}
                  placeholder="e.g., 1000000"
                  setInnerValue={setTotalSupply}
                  defaultValue={totalSupply}
                  hideButton={true}
                />
              </div>
              {account?.address && hotWalletAddress && account.address !== hotWalletAddress && (
                <p className="ic-warning-text">⚠️ You are signed in as {shortAddress(account.address)}. Please sign in with the hot wallet ({shortAddress(hotWalletAddress)}) to create the trust line.</p>
              )}
              {account?.address && hotWalletAddress && account.address === hotWalletAddress && (
                <p className="ic-success-text">✓ You are signed in with the hot wallet ({shortAddress(account.address)})</p>
              )}
              <div className="ic-trustline-info">
                <h4>TrustLine Setup Details:</h4>
                <ul>
                  <li><strong>Currency:</strong> {tokenTicker}</li>
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
              <Message message={trustLineError} type="error" additionalClass="red" />
              <Message message={trustLineSuccess} type="success" additionalClass="green" />
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

              {/* Turnstile captcha like in Faucet/EmailLoginPopup */}
              {siteKey && (
                <div style={{ marginTop: '10px' }}>
                  <Turnstile
                    key={captchaResetKey}
                    siteKey={siteKey}
                    style={{ margin: 'auto' }}
                    options={{
                      theme,
                      language: turnstileSupportedLanguages.includes(i18n.language) ? i18n.language : 'en'
                    }}
                    onSuccess={setCaptchaToken}
                    onError={() => {
                      // ignore Turnstile errors
                    }}
                  />
                </div>
              )}

              <div className="ic-issue-actions">
                <button 
                  className="ic-button-action"
                  onClick={handleIssueTokens}
                  disabled={!issueQuantity || !tokenTicker || !coldWalletAddress || !hotWalletAddress || !captchaToken}
                >
                  Issue Tokens
                </button>
              </div>
              {/* Error and Success Messages */}
              <Message message={tokenError} type="error" />
              <Message message={tokenSuccess} type="success" />
            </div>

            <StepActions 
              onPrev={handlePrevStep}
              showNext={false}
              prevLabel="Back to Step 3"
            />
          </div>
        )}
      </div>
    </>
  )
}
