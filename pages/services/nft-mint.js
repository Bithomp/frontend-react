import { useState, useEffect } from 'react'
import { useTranslation } from 'next-i18next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { getIsSsrMobile } from '../../utils/mobile'
import { sha512 } from 'crypto-hash'
import axios from 'axios'

import { addAndRemoveQueryParams, encode, isIdValid, isValidJson, server, xahauNetwork } from '../../utils'

const checkmark = '/images/checkmark.svg'

export const getServerSideProps = async (context) => {
  const { query, locale } = context
  const { uri, digest } = query
  return {
    props: {
      uriQuery: uri || '',
      digestQuery: digest || '',
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common']))
    }
  }
}

import CheckBox from '../../components/UI/CheckBox'
import SEO from '../../components/SEO'

let interval
let startTime

export default function NftMint({ setSignRequest, uriQuery, digestQuery }) {
  const { i18n } = useTranslation()
  const router = useRouter()

  const [uri, setUri] = useState(uriQuery)
  const [digest, setDigest] = useState(digestQuery)
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
  const [uriValidDigest, setUriValidDigest] = useState(isIdValid(digestQuery))

  let uriRef
  let digestRef

  useEffect(() => {
    //on component unmount
    return () => {
      setUpdate(false)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (update) {
      interval = setInterval(() => getMetadata(), 5000) //5 seconds
    } else {
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [update])

  useEffect(() => {
    setErrorMessage('')
  }, [i18n.language])

  const onUriChange = (e) => {
    let uri = e.target.value
    setUri(uri)
    setMetaLoadedFromUri(false)
    setMetadata('')
    setDigest('')
    setMetadataError('')
    setUriValidDigest(false)
  }

  const getMetadata = async () => {
    setMetadataStatus('Trying to load the metadata from URI...')
    const nftType = xahauNetwork ? 'xls35' : 'xls20'
    const response = await axios
      .get('v2/metadata?url=' + encodeURIComponent(uri) + '&type=' + nftType)
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
          // 2 minutes
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

    setErrorMessage('')

    let request = {
      TransactionType: 'URITokenMint',
      Memos: [
        {
          Memo: {
            MemoData: encode('NFT Mint')
          }
        }
      ]
    }

    if (uri) {
      request.URI = encode(uri)
    }

    if (digest) {
      request.Digest = digest
    }

    setSignRequest({
      redirect: 'nft',
      request,
      callback: afterSubmit
    })
  }

  const afterSubmit = (id) => {
    setMinted(id)
  }

  useEffect(() => {
    if (agreeToSiteTerms || agreeToPrivacyPolicy) {
      setErrorMessage('')
    }
  }, [agreeToSiteTerms, agreeToPrivacyPolicy])

  useEffect(() => {
    if (calculateDigest) {
      setDigest('')
    }
  }, [calculateDigest])

  useEffect(() => {
    let queryAddList = []
    let queryRemoveList = []
    if (digest) {
      queryAddList.push({
        name: 'digest',
        value: digest
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('digest')
    }
    if (uri) {
      queryAddList.push({
        name: 'uri',
        value: uri
      })
      setErrorMessage('')
    } else {
      queryRemoveList.push('uri')
    }
    addAndRemoveQueryParams(router, queryAddList, queryRemoveList)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest, uri])

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

  return (
    <>
      <SEO title="NFT Mint" />
      <div className="page-services-nft-mint content-center">
        <h1 className="center">NFT Mint</h1>
        <p>
          You can use this page to create a new NFT, a unique digital asset that can be used in a variety of
          applications.
        </p>

        {!minted && (
          <>
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

            {!uriValidDigest && (
              <>
                <CheckBox checked={calculateDigest} setChecked={setCalculateDigest} name="add-digest">
                  Add <b>Digest</b> (recommended)
                </CheckBox>

                {calculateDigest && (
                  <>
                    <p>
                      The digest is calculated from the metadata. It is used to verify that the URI and the metadata
                      have not been tampered with.
                    </p>

                    <button
                      className="button-action thin"
                      onClick={loadMetadata}
                      style={{ marginBottom: '10px' }}
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
                  </>
                )}
              </>
            )}

            {(calculateDigest || uriValidDigest) && (
              <>
                <p>Digest:</p>
                <div className="input-validation">
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
                  {isIdValid(digest) && <img src={checkmark} className="validation-icon" alt="validated" />}
                </div>
              </>
            )}

            <CheckBox checked={agreeToSiteTerms} setChecked={setAgreeToSiteTerms} name="agree-to-terms">
              I agree with the{' '}
              <Link href="/terms-and-conditions" target="_blank">
                Terms and conditions
              </Link>
              .
            </CheckBox>

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

            <p className="center">
              <button className="button-action" onClick={onSubmit} name="submit-button">
                Mint NFT
              </button>
            </p>
          </>
        )}

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
    </>
  )
}
