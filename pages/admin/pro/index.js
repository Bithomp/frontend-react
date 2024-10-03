import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Tabs/AdminTabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import AddressInput from '../../../components/UI/AddressInput'
import { encode, useWidth } from '../../../utils'
import { removeProAddress } from '../../../utils/pro'
import FormInput from '../../../components/UI/FormInput'
import { fullDateAndTime } from '../../../utils/format'
import Image from 'next/image'

import { MdDelete } from 'react-icons/md'
import Link from 'next/link'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin']))
    }
  }
}

export default function Pro({ account, setAccount, setSignRequest, refreshPage }) {
  const router = useRouter()
  const width = useWidth()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState('')
  const [verifiedAddresses, setVerifiedAddresses] = useState(null)
  const [addressToVerify, setAddressToVerify] = useState('')
  const [addressName, setAddressName] = useState('')
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)
  const [rawData, setRawData] = useState({})

  const suggestAddress = (account, verAddresses) => {
    setRawData({})
    if (!verAddresses || !account) return
    let loggedInAddressAlreadyVerified = false
    for (let i = 0; i < verAddresses.length; i++) {
      if (verAddresses[i].address === account.address) {
        loggedInAddressAlreadyVerified = true
        break
      }
    }
    //suggest the loggedin address to get verified
    if (!loggedInAddressAlreadyVerified) {
      setRawData({
        address: account?.address,
        addressDetails: {
          username: account?.username
        }
      })
    }
  }

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch((error) => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === 'errors.token.required') {
        onLogOut()
        return
      }
      if (error && error.message !== 'canceled') {
        setErrorMessage(t(error.response?.data?.error || 'error.' + error.message))
      }
    })
    setLoadingVerifiedAddresses(false)
    const data = response?.data
    /*
      {
        "total": 1,
        "count": 1,
        "addresses": [
          {
            "id": 1,
            "createdAt": 1721461101,
            "address": "fytuuyfgukhg",
            "name": "vasia"
          }
        ]
      }
    */
    setVerifiedAddresses(data?.addresses)
    suggestAddress(account, data?.addresses)
  }

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = 'Bearer ' + sessionToken
      setErrorMessage('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setAddressName('')
    setAddressToVerify('')
    suggestAddress(account, verifiedAddresses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  useEffect(() => {
    getVerifiedAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPage])

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
    setAccount({ ...account, pro: null })
    setErrorMessage('')
  }

  const addAddressClicked = () => {
    if (!account?.pro) {
      setErrorMessage('There is no pro email')
      return
    }

    const command = {
      action: 'addAddress',
      email: account?.pro
    }

    const tx = {
      Account: addressToVerify,
      TransactionType: 'AccountSet',
      Memos: [
        {
          Memo: {
            MemoType: encode('json'),
            MemoData: encode(JSON.stringify(command))
          }
        }
      ]
    }

    setSignRequest({
      wallet: 'xumm',
      request: tx,
      data: {
        signOnly: true,
        action: 'pro-add-address',
        address: addressToVerify,
        name: addressName
      }
    })
  }

  const afterAddressRemoved = (data) => {
    if (data?.error) {
      setErrorMessage(data.error)
    }
    getVerifiedAddresses()
  }

  return (
    <>
      <SEO title="Pro accounts" />
      <div className="page-admin content-center">
        <h1 className="center">Pro addresses</h1>

        <AdminTabs name="mainTabs" tab="pro" />

        <h4 className="center">Verified addresses</h4>

        {!width || width > 750 ? (
          <table className="table-large no-hover">
            <thead>
              <tr>
                <th className="center">#</th>
                <th className="left">Address</th>
                <th className="right">Private name</th>
                <th>Verified at</th>
                <th className="center">Remove</th>
              </tr>
            </thead>
            <tbody>
              {verifiedAddresses?.length > 0 ? (
                <>
                  {verifiedAddresses.map((address, i) => (
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td className="left">
                        {address.address}
                        <br />
                        <br />
                        <Link
                          className="button-action narrow thin"
                          href={'/admin/pro/history?address=' + address.address}
                        >
                          History
                        </Link>
                      </td>
                      <td className="right">{address.name}</td>
                      <td>{fullDateAndTime(address.createdAt)}</td>
                      <td className="center red">
                        <MdDelete
                          onClick={() => {
                            removeProAddress(address.id, afterAddressRemoved)
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan="100" className="center">
                    {loadingVerifiedAddresses ? 'Loading data...' : 'You do not have verified addresses yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="table-mobile">
            <tbody>
              {verifiedAddresses?.length > 0 ? (
                <>
                  {verifiedAddresses.map((address, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px' }}>#{i + 1}</td>
                      <td>
                        <p>
                          Address: <b>{address.address}</b>
                        </p>
                        <p>
                          Name: <b>{address.name}</b>
                        </p>
                        <p>Verified at: {fullDateAndTime(address.createdAt)}</p>
                        <p>
                          <Link className="button-action narrow thin" href={'/admin/pro/history?address=' + address}>
                            History
                          </Link>{' '}
                          <button
                            className="button-action narrow thin"
                            onClick={() => {
                              removeProAddress(address.id, afterAddressRemoved)
                            }}
                          >
                            Remove
                          </button>
                        </p>
                      </td>
                    </tr>
                  ))}
                </>
              ) : (
                <tr>
                  <td colSpan="100" className="center">
                    {loadingVerifiedAddresses ? 'Loading data...' : 'You do not have verified addresses yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <br />
        <br />
        <div style={{ textAlign: 'left' }}>
          In order to use PRO functionality for your accounts, you would need to verify them first.
          <br />
          <br />
          <div>
            - Get your personal historical transaction's extracts and statistics.
            <br />
            - Auto cancelation of expired NFT offers
            <br />- Auto execution of time based escrows
          </div>
          {width > 851 && <br />}
          <br />
          <div className="flex flex-center">
            <span style={width > 851 ? { width: 'calc(70% - 20px)' } : { width: '100%', marginBottom: '-20px' }}>
              <AddressInput
                title="Address"
                placeholder="Enter address"
                setInnerValue={setAddressToVerify}
                hideButton={true}
                rawData={rawData}
                type="address"
              />
            </span>
            <span style={{ width: width > 851 ? '30%' : '100%' }}>
              <FormInput
                title="Private name"
                placeholder="Enter address name"
                setInnerValue={setAddressName}
                defaultValue={rawData?.addressDetails?.username}
                hideButton={true}
              />
            </span>
          </div>
          <br />
          <br />
          <center>
            <button className="button-action" onClick={addAddressClicked} disabled={!addressToVerify || !addressName}>
              Verify{' '}
              <Image
                src="/images/xaman.png"
                className={'xaman-logo' + (!addressToVerify || !addressName ? ' disabled' : '')}
                alt="xaman"
                height={24}
                width={24}
              />
            </button>
          </center>
        </div>
        <br />
        {errorMessage ? <div className="center orange bold">{errorMessage}</div> : <br />}
      </div>
    </>
  )
}
