
import { useState } from 'react'

import SEO from '../../components/SEO'
import FormInput from '../../components/UI/FormInput'
import NetworkTabs from '../../components/Tabs/NetworkTabs'
import { ledgerName } from '../../utils'


export default function IssueCurrency({ subscriptionExpired, openEmailLogin, sessionToken }) {
  const [currencyCode, setCurrencyCode] = useState('')
  const [totalSupply, setTotalSupply] = useState('')
  const [transferRate, setTransferRate] = useState('0')
  const [issuerAddress, setIssuerAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if user has Pro subscription
  const hasProAccess = sessionToken && !subscriptionExpired

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!hasProAccess) {
      openEmailLogin()
      return
    }
    
    setIsSubmitting(true)
    // TODO: Implement currency issuance logic
    console.log('Issuing currency:', { currencyCode, totalSupply, transferRate, issuerAddress })
    setIsSubmitting(false)
  }

  if (!hasProAccess) {
    return (
      <>
        <SEO
          title="Issue Your Own Currency"
          description="Create and issue your own custom currency on the XRPL - Bithomp Pro feature"
        />
        <div className="content-text content-center">
          <h1 className="center">Issue Your Own Currency</h1>
          <div className="pro-access-required">
            <h2>Bithomp Pro Required</h2>
            <p>This feature is available exclusively to Bithomp Pro subscribers.</p>
            <p>Upgrade to Pro to unlock the ability to create and issue your own custom currencies on the XRPL.</p>
            <button 
              className="btn btn-primary"
              onClick={openEmailLogin}
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SEO
        title="Issue Your Own Currency"
        description="Create and issue your own custom currency on the XRPL - Bithomp Pro feature"
      />

      <section className="home-section">
        <h1 className="center">Issue Your Own Currency</h1>
        <p className="center">Create and manage your own custom tokens on the {ledgerName}</p>
        <NetworkTabs />
      </section>

      <div className="content-text content-center">
          <h2>How to Issue Your Own Currency</h2>
          
          <div>
            <h3>1. Understanding {ledgerName} Tokens</h3>
            <p>
            The {ledgerName} allows anyone to create custom tokens (also called "issued currencies" or "IOUs") 
            that can represent anything from stablecoins to loyalty points, gaming assets, or real-world 
            commodities. These tokens are backed by the issuer's account and can be traded on decentralized 
            exchanges.
            </p>
          </div>

          <div>
            <h3>2. Prerequisites</h3>
            <ul>
            <li><strong>Funded Account:</strong> Your account must hold at least 20 XRP (base reserve) plus additional XRP for transaction fees</li>
            <li><strong>Trust Lines:</strong> Other accounts need to establish trust lines to hold your tokens</li>
            <li><strong>Regulatory Compliance:</strong> Ensure your token complies with local laws and regulations</li>
            </ul>
          </div>

          <div>
              <h3>3. Token Properties</h3>
              <ul>
              <li><strong>Currency Code:</strong> 3-letter ISO code (e.g., USD, EUR) or 40-character hex string for custom codes</li>
              <li><strong>Total Supply:</strong> Maximum amount of tokens that can exist</li>
              <li><strong>Transfer Rate:</strong> Fee percentage charged on transfers (0-100%)</li>
              <li><strong>Issuer Address:</strong> Your account address that will issue and control the tokens</li>
              </ul>
          </div>

          <div>
              <h3>4. Best Practices</h3>
              <ul>
              <li>Choose a meaningful and unique currency code</li>
              <li>Set reasonable transfer rates to encourage adoption</li>
              <li>Maintain transparency about your token's purpose and backing</li>
              <li>Consider implementing a freeze feature for compliance</li>
              <li>Provide clear documentation for users</li>
              </ul>
          </div>

          <div>
              <h3>5. Security Considerations</h3>
              <ul>
              <li>Never share your private keys</li>
              <li>Use hardware wallets for large amounts</li>
              <li>Regularly monitor your account for suspicious activity</li>
              <li>Consider multi-signing for additional security</li>
              </ul>
          </div>

          <div>
            <h2>Issue New Currency</h2>
            <FormInput
              title="Currency Code *"
              placeholder="e.g., USD, EUR, or custom hex"
              setValue={setCurrencyCode}
              defaultValue={currencyCode}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
                }
              }}
            />
            <small>3-letter ISO code or up to 40-character hex string</small>

            <FormInput
              title="Total Supply *"
              placeholder="e.g., 1000000"
              setValue={setTotalSupply}
              defaultValue={totalSupply}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
                }
              }}
            />
            <small>Maximum number of tokens that can exist</small>

            <FormInput
              title="Transfer Rate (%)"
              placeholder="0"
              setValue={setTransferRate}
              defaultValue={transferRate}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
                }
              }}
            />
            <small>Fee percentage charged on transfers (0-100%)</small>

            <FormInput
              title="Issuer Address *"
              placeholder="r..."
              setValue={setIssuerAddress}
              defaultValue={issuerAddress}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
                }
              }}
            />
            <small>Your {ledgerName} account address</small>

            <button 
              type="submit" 
              className="button-action"
              disabled={isSubmitting}
              >
              {isSubmitting ? 'Issuing...' : 'Issue Currency'}
            </button>
          </div>
      </div>
    </>
  )
}
