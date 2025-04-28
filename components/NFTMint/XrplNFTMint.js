import { useState } from 'react'
import { isValidAddress, isValidNFTokenTaxon } from '../../utils'
import AddressInput from '../UI/AddressInput'
import CheckBox from '../UI/CheckBox'

export default function XrplNFTMint({ setSignRequest }) {
  const [transferFee, setTransferFee] = useState('')
  const [issuer, setIssuer] = useState('')
  const [uri, setUri] = useState('')
  const [nftokenTaxon, setNFTokenTaxon] = useState('')
  const [amount, setAmount] = useState('')
  const [expiration, setExpiration] = useState('')
  const [destination, setDestination] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Flags
  const [burnable, setBurnable] = useState(false)
  const [onlyXRP, setOnlyXRP] = useState(false)
  const [transferable, setTransferable] = useState(true)
  const [mutable, setMutable] = useState(false)

  const calculateFlags = () => {
    let flags = 0
    if (burnable) flags |= 0x00000001
    if (onlyXRP) flags |= 0x00000002
    if (!transferable) flags |= 0x00000008
    if (mutable) flags |= 0x00000010
    return flags || undefined
  }

  const onSubmit = () => {
    // Validation
    if (transferFee && (transferFee < 0 || transferFee > 50000)) {
      setErrorMessage('Transfer Fee must be between 0 and 50000')
      return
    }

    if (issuer && !isValidAddress(issuer)) {
      setErrorMessage('Invalid Issuer address')
      return
    }

    if (nftokenTaxon && !isValidNFTokenTaxon(nftokenTaxon)) {
      setErrorMessage('Invalid NFTokenTaxon')
      return
    }

    if (destination && !isValidAddress(destination)) {
      setErrorMessage('Invalid Destination address')
      return
    }

    const request = {
      TransactionType: 'NFTokenMint',
      Flags: calculateFlags()
    }

    if (transferFee) request.TransferFee = parseInt(transferFee)
    if (issuer) request.Issuer = issuer
    if (uri) request.URI = Buffer.from(uri).toString('hex').toUpperCase()
    if (nftokenTaxon) request.NFTokenTaxon = parseInt(nftokenTaxon)
    if (amount) request.Amount = (parseFloat(amount) * 1000000).toString()
    if (expiration) {
      request.Expiration = Math.floor(new Date(expiration).getTime() / 1000)
    }
    if (destination) request.Destination = destination

    setSignRequest({
      redirect: 'nft',
      request,
      callback: (id) => {
        // Handle successful mint
        console.log('Minted NFT:', id)
      }
    })
  }

  return (
    <div className="xrpl-nft-mint">
      <div className="input-group">
        <label>Transfer Fee (0-50000):</label>
        <input
          type="number"
          value={transferFee}
          onChange={(e) => setTransferFee(e.target.value)}
          min="0"
          max="50000"
        />
      </div>

      <div className="input-group">
        <label>Issuer:</label>
        <AddressInput
          value={issuer}
          onChange={setIssuer}
          placeholder="Enter issuer address"
        />
      </div>

      <div className="input-group">
        <label>URI:</label>
        <input
          type="text"
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          placeholder="Enter URI"
        />
      </div>

      <div className="input-group">
        <label>NFTokenTaxon:</label>
        <input
          type="number"
          value={nftokenTaxon}
          onChange={(e) => setNFTokenTaxon(e.target.value)}
          placeholder="Enter NFTokenTaxon"
        />
      </div>

      <div className="input-group">
        <label>Amount (XRP):</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount in XRP"
          step="0.000001"
        />
      </div>

      <div className="input-group">
        <label>Expiration:</label>
        <input
          type="datetime-local"
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          className="input-text"
        />
      </div>

      <div className="input-group">
        <label>Destination:</label>
        <AddressInput
          value={destination}
          onChange={setDestination}
          placeholder="Enter destination address"
        />
      </div>

      <div className="flags-section">
        <h3>Flags:</h3>
        <CheckBox checked={burnable} setChecked={setBurnable}>
          Burnable
        </CheckBox>
        <CheckBox checked={onlyXRP} setChecked={setOnlyXRP}>
          Only XRP
        </CheckBox>
        <CheckBox checked={transferable} setChecked={setTransferable}>
          Transferable
        </CheckBox>
        <CheckBox checked={mutable} setChecked={setMutable}>
          Mutable
        </CheckBox>
      </div>

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <button className="button-action" onClick={onSubmit}>
        Mint NFT
      </button>
    </div>
  )
} 