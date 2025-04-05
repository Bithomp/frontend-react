import Link from 'next/link'
import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Select from 'react-select'
import CheckBox from '../../components/UI/CheckBox'
import { encode, isValidJson, useLocalStorage } from '../../utils'
import axios from 'axios'

const removeEmptyFields = (data) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => {
      // Check for empty string, null, undefined
      if (value === '' || value === null || value === undefined) {
        return false
      }
      // Keep if value exists
      return true
    })
  )
}

export default function XRPLNftMint({ setSignRequest }) {
  const [account] = useLocalStorage('account')

  const [data, setData] = useState({
    transferFee: '',
    issuer: '',
    uri: '',
    nftokenTaxon: '',
    amount: '',
    destination: '',
    flags: 1,
    expiration: null
  })

  let uriRef
  const [minted, setMinted] = useState('')
  const [metadataError, setMetadataError] = useState('')
  const [metadata, setMetadata] = useState('')
  const [metaLoadedFromUri, setMetaLoadedFromUri] = useState(false)
  const [metadataStatus, setMetadataStatus] = useState('')

  const [errorMessage, setErrorMessage] = useState('')
  const [agreeToSiteTerms, setAgreeToSiteTerms] = useState(false)
  const [agreeToPrivacyPolicy, setAgreeToPrivacyPolicy] = useState(false)

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value })
  }

  const onUriChange = (e) => {
    let uri = e.target.value
    setData((prev) => ({ ...prev, uri }))
    setMetaLoadedFromUri(false)
    setMetadata('')
    setMetadataError('')
  }

  const onFlagsChange = (value) => {
    setData((prev) => ({ ...prev, flags: value }))
  }

  const loadMetadata = async () => {
    if (data.uri) {
      setMetaLoadedFromUri(false)
      getMetadata()
    } else {
      setMetadataStatus('Please enter URI :)')
      uriRef?.focus()
    }
  }

  const getMetadata = async () => {
    setMetadataStatus('Trying to load the metadata from URI...')
    const response = await axios
      .get('v2/metadata?url=' + encodeURIComponent(data.uri) + '&type=xls20')
      .catch((error) => {
        console.log(error)
        setMetadataStatus('error')
      })
    if (response?.data) {
      if (response.data?.metadata) {
        setMetaLoadedFromUri(true)
        setMetadata(JSON.stringify(response.data.metadata, undefined, 4))
        setMetadataStatus('')
      } else if (response.data?.message) {
        setMetadataStatus(response.data.message)
      } else {
        setMetadataStatus('Load failed')
      }
    }
  }

  const onMetadataChange = (e) => {
    setMetadataError('')
    let metadata = e.target.value
    setMetadata(metadata)
    if (!metaLoadedFromUri) {
      if (!metadata || !isValidJson(metadata)) {
        setMetadataError('Please enter valid JSON')
      }
    }
  }

  const onSubmit = () => {
    if (!agreeToSiteTerms) {
      setErrorMessage('Please agree to the Terms and conditions')
      return
    }

    if (!agreeToPrivacyPolicy) {
      setErrorMessage('Please agree to the Privacy policy')
      return
    }

    if (!data.nftokenTaxon) {
      setErrorMessage('Please enter a valid NFTokenTaxon')
      return
    }

    // In docs it says that: Results in an error if the Amount field is not specified.
    if (data.expiration && !data.amount) {
      setErrorMessage('Expiration date is set but no amount is set')
      return
    }

    setErrorMessage('')

    let request = {
      TransactionType: 'NFTokenMint',
      TransferFee: data.transferFee ? parseFloat(data.transferFee) : '',
      Issuer: data.issuer,
      URI: encode(data.uri),
      NFTokenTaxon: data.nftokenTaxon ? parseFloat(data.nftokenTaxon) : '',
      Amount: data.amount ? `${parseFloat(data.amount) * 1000000}` : '',
      Destination: data.destination,
      Flags: data.flags.value,
      Account: account.address,
      Expiration: data.expiration ? Math.floor(data.expiration.getTime() / 1000) : null
    }

    setSignRequest({
      redirect: 'nft',
      request: removeEmptyFields(request),
      callback: afterSubmit
    })
  }

  const afterSubmit = (id) => {
    setMinted(id)
  }

  return (
    <div>
      <div className="flex">
        {/* Transfer fee */}
        <div
          style={{
            flex: 1
          }}
        >
          <p>Transfer fee:</p>
          <div className="input-validation">
            <input
              placeholder="25000"
              className="input-text"
              spellCheck="false"
              maxLength="256"
              name="transferFee"
              value={data.transferFee}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Issuer */}
        <div
          style={{
            flex: 1
          }}
        >
          <p>Issuer:</p>
          <div className="input-validation">
            <input
              placeholder="r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG"
              className="input-text"
              spellCheck="false"
              maxLength="256"
              name="issuer"
              value={data.issuer}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* URI */}
      <p>URI that points to the data or metadata associated with the NFT:</p>
      <div className="input-validation">
        <input
          placeholder="ipfs://bafkreignnol62jayyt3hbofhkqvb7jolxyr4vxtby5o7iqpfi2r2gmt6fa4"
          className="input-text"
          spellCheck="false"
          maxLength="256"
          name="uri"
          value={data.uri}
          onChange={onUriChange}
          ref={(node) => {
            uriRef = node
          }}
        />

        <button
          className="button-action thin"
          onClick={loadMetadata}
          style={{ margin: '10px 0' }}
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
      </div>

      <div className="flex">
        {/* NFTokenTaxon */}
        <div style={{ flex: 1 }}>
          <p>NFTokenTaxon:</p>
          <div className="input-validation">
            <input
              placeholder="0"
              className="input-text"
              spellCheck="false"
              maxLength="256"
              name="nftokenTaxon"
              value={data.nftokenTaxon}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Amount */}
        <div style={{ flex: 1 }}>
          <p>Amount (XRP):</p>
          <div className="input-validation">
            <input
              placeholder="12"
              className="input-text"
              spellCheck="false"
              maxLength="256"
              name="amount"
              value={data.amount}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Destination */}
        <div style={{ flex: 1 }}>
          <p>Destination:</p>
          <div className="input-validation">
            <input
              placeholder="r9spUPhPBfB6kQeF6vPhwmtFwRhBh2JUCG"
              className="input-text"
              spellCheck="false"
              maxLength="256"
              name="destination"
              value={data.destination}
              onChange={handleChange}
            />
          </div>
        </div>
        {/* Flags */}
        {/* https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint#nftokenmint-flags */}
        <div style={{ flex: 1 }}>
          <p>Flags:</p>
          <Select
            options={[
              { value: 1, label: 'Burnable' },
              { value: 2, label: 'OnlyXRP' },
              { value: 8, label: 'Transferable' },
              { value: 16, label: 'Mutable' }
            ]}
            isSearchable={false}
            name="flags"
            value={data.flags}
            onChange={(e) => onFlagsChange(e.valueOf())}
            className="simple-select"
            classNamePrefix="react-select"
            instanceId="seat-select"
            styles={{
              container: (base) => ({
                ...base,
                width: '100%'
              })
            }}
          />
        </div>
      </div>

      {/* Expiration */}
      <div style={{ flex: 1 }}>
        <p>Expiration:</p>
        <DatePicker
          selected={data.expiration}
          selectsStart
          showTimeInput
          minDate={new Date()}
          timeInputLabel="Expiration"
          dateFormat="yyyy/MM/dd HH:mm:ss"
          className="dateAndTimeRange nft-mint-date-picker"
          showMonthDropdown
          showYearDropdown
          onChange={(date) => setData((prev) => ({ ...prev, expiration: date }))}
        />
      </div>

      {/* Terms and conditions */}
      <div>
        <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
          I agree with the{' '}
          <Link href="/terms-and-conditions" target="_blank">
            Terms and conditions
          </Link>
          .
        </CheckBox>

        <CheckBox checked={agreeToPrivacyPolicy} setChecked={setAgreeToPrivacyPolicy} name="agree-to-privacy-policy">
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
        {minted && (
          <>
            The NFT was sucefully minted:
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
    </div>
  )
}