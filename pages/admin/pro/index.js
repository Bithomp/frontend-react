import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import { getIsSsrMobile } from '../../../utils/mobile'
import AdminTabs from '../../../components/Admin/Tabs'
import { axiosAdmin } from '../../../utils/axios'

import SEO from '../../../components/SEO'
import AddressInput from '../../../components/UI/AddressInput'
import { encode } from '../../../utils'
import { removeProAddress } from '../../../utils/pro'
import FormInput from '../../../components/UI/FormInput'
import { fullDateAndTime } from '../../../utils/format'
import Image from 'next/image'

import { MdDelete } from "react-icons/md"

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

export default function Pro({
  account,
  setAccount,
  setSignRequest,
  refreshPage
}) {
  const router = useRouter()

  const { t } = useTranslation(['common', 'admin'])
  const [errorMessage, setErrorMessage] = useState("")
  const [verifiedAddresses, setVerifiedAddresses] = useState(null)
  const [addressToVerify, setAddressToVerify] = useState("")
  const [addressName, setAddressName] = useState("")
  const [loadingVerifiedAddresses, setLoadingVerifiedAddresses] = useState(false)

  const getVerifiedAddresses = async () => {
    setLoadingVerifiedAddresses(true)
    const response = await axiosAdmin.get('user/addresses').catch(error => {
      setLoadingVerifiedAddresses(false)
      if (error.response?.data?.error === "errors.token.required") {
        onLogOut()
        return
      }
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response?.data?.error || "error." + error.message))
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
    if (data?.addresses) {
      setVerifiedAddresses(data.addresses)
    }
  }

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axiosAdmin.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
      setErrorMessage("") //delete
    }

    getVerifiedAddresses()

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    getVerifiedAddresses()
    setAddressName("")
    setAddressToVerify("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPage])

  const onLogOut = () => {
    localStorage.removeItem('sessionToken')
    setAccount({ ...account, pro: null })
    setErrorMessage("")
  }

  const addAddressClicked = () => {
    const command = {
      action: "addAddress",
      email: account?.pro
    }

    const tx = {
      Account: addressToVerify,
      TransactionType: "AccountSet",
      Memos: [
        {
          Memo: {
            MemoType: encode("json"),
            MemoData: encode(JSON.stringify(command)),
          },
        },
      ],
    }

    setSignRequest({
      wallet: "xumm",
      request: tx,
      data: {
        signOnly: true,
        action: "pro-add-address",
        address: addressToVerify,
        name: addressName
      }
    })
  }

  const afterAddressRemoved = data => {
    if (data?.error) {
      setErrorMessage(data.error)
    }
    getVerifiedAddresses()
  }

  return <>
    <SEO title="Pro accounts" />
    <div className="page-admin content-center">
      <h1 className='center'>
        Pro addresses
      </h1>

      <AdminTabs name="mainTabs" tab="pro" />

      <div className='center'>
        <h4>Verified addresses</h4>

        <table className='table-large'>
          <thead>
            <tr>
              <th className='center'>#</th>
              <th className='left'>Address</th>
              <th className='right'>Private name</th>
              <th>Verified at</th>
              <th className='center'>Remove</th>
            </tr>
          </thead>
          <tbody>
            {verifiedAddresses?.length > 0 ?
              <>
                {
                  verifiedAddresses.map((address, i) =>
                    <tr key={i}>
                      <td className="center">{i + 1}</td>
                      <td className='left'>{address.address}</td>
                      <td className='right'>{address.name}</td>
                      <td>{fullDateAndTime(address.createdAt)}</td>
                      <td className='center red'>
                        <MdDelete onClick={() => { removeProAddress(address.id, afterAddressRemoved) }} />
                      </td>
                    </tr>)
                }
              </>
              :
              <tr>
                <td colSpan="100" className='center'>
                  {loadingVerifiedAddresses ?
                    "Loading data..."
                    :
                    "You do not have verified addresses yet."
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        <br /><br />
        <div style={{ textAlign: "left" }}>
          In order to use PRO functionality for your accounts, you would need to verify them first.
          <br /><br />
          <div>
            - Get your personal historical transaction's extracts and statistics.
            <br />
            - Auto cancelation of expired NFT offers
            <br />
            - Auto execution of time based escrows
          </div>
          <br /><br />
          <div className='flex flex-center'>
            <span style={{ width: "calc(70% - 20px)" }}>
              <AddressInput
                title="Address"
                placeholder="Enter address"
                setValue={setAddressToVerify}
                rawData={{
                  address: account?.address,
                  addressDetails: {
                    username: account?.username
                  }
                }}
                type='address'
                hideButton={true}
              />
            </span>
            <span style={{ width: "30%" }}>
              <FormInput
                title="Private name"
                placeholder="Enter address name"
                setInnerValue={setAddressName}
                hideButton={true}
              />
            </span>
          </div>
          <br /><br />
          <center>
            <button
              className="button-action"
              onClick={addAddressClicked}
              disabled={!addressToVerify || !addressName}
            >
              Verify {" "}
              <Image src="/images/xumm.png" className={'xumm-logo' + ((!addressToVerify || !addressName) ? ' disabled' : '')} alt="xaman" height={24} width={24} />
            </button>
          </center>
        </div>
        <br />
        {errorMessage ?
          <div className='center orange bold'>
            {errorMessage}
          </div>
          :
          <br />
        }
      </div>
    </div>
  </>
}
