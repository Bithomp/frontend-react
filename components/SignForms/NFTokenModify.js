import { encode } from '../../utils'

export default function NFTokenModify({ setSignRequest, signRequest, setStatus }) {
  const onURIChange = (e) => {
    let newUri = e.target.value
    newUri = newUri.trim()

    let newRequest = signRequest

    newRequest.request.URI = encode(newUri)
    setStatus('')

    setSignRequest(newRequest)
  }

  return (
    <div className="center">
      <br />
      <span className="halv">
        <span className="input-title">New URI</span>
        <input
          placeholder="Enter a new URI for the NFT"
          onChange={onURIChange}
          className="input-text"
          spellCheck="false"
        />
      </span>
    </div>
  )
}
