import React from 'react'
import axios from "axios"
import { useTranslation } from "next-i18next"
import { serverSideTranslations } from "next-i18next/serverSideTranslations"

import SearchBlock from "../../components/Layout/SearchBlock"
import SEO from "../../components/SEO"
import { server } from "../../utils"
import {
  lpTokenName,
  trWithAccount,
  shortHash,
  fullDateAndTime,
  fullNiceNumber,
  trAmountWithGateway,
} from "../../utils/format"
import { LinkTxIcon } from '../../utils/links'

import CopyButton from "../../components/UI/CopyButton"
import { useEffect, useState } from "react"

export async function getServerSideProps(context) {
  const { locale, query, req } = context;
  let initialData = null;
  const { id } = query;

  let headers = {};
  if (req.headers["x-real-ip"]) {
    headers["x-real-ip"] = req.headers["x-real-ip"]
  }
  if (req.headers["x-forwarded-for"]) {
    headers["x-forwarded-for"] = req.headers["x-forwarded-for"]
  }
  let errorMessage = null
  try {
    const res = await axios({
      method: "get",
      url: server + "/api/cors/v2/amm/" + id,
      headers,
    }).catch(error => {
      errorMessage = error.message
    });
    initialData = res?.data
  } catch (error) {
    console.error(error)
  }

  return {
    props: {
      id,
      data: initialData,
      errorMessage,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  }
}

export default function Amm(
  { id, data, errorMessage },
) {
  const { t } = useTranslation()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const lpToken = lpTokenName(data)

  const showPercents = (value) => {
    value = value ? (value / 1000) : "0"
    return value + "%"
  }

  return (
    <>
      <SEO
        page="AMM"
        title={
          t("explorer.header.amm") + " "
          + lpToken + " "
          + (data?.ammID || id)
        }
        description={
          "Automated market maker pool details for "
          + lpToken + " "
          + (data?.ammID || id)
        }
      />
      <SearchBlock tab="amm" />
      <div className="content-center short-top amm">
        {errorMessage ?
          <div className='center orange bold'>{errorMessage}</div>
          :
          <>
            {data.ammID &&
              <div className="column-right">
                <table className='table-details'>
                  <thead>
                    <tr>
                      <th colSpan="100">
                        Automated market maker pool
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>AMM ID</td>
                      <td>{shortHash(data.ammID, 10)} <CopyButton text={data.ammID} /></td>
                    </tr>
                    {trWithAccount(data, 'account', t("table.address"))}
                    {trAmountWithGateway({ amount: data.amount, name: "Asset 1" })}
                    {trAmountWithGateway({ amount: data.amount2, name: "Asset 2" })}
                    <tr>
                      <td>Trading fee</td>
                      <td>
                        {showPercents(data.tradingFee)}
                      </td>
                    </tr>
                    <tr>
                      <td>Balance</td>
                      <td>
                        {fullNiceNumber(data.lpTokenBalance.value)}
                        {" " + lpToken}
                      </td>
                    </tr>
                    <tr>
                      <td>Currency code</td>
                      <td>
                        {data.lpTokenBalance.currency} <CopyButton text={data.lpTokenBalance.currency} />
                      </td>
                    </tr>
                    <tr>
                      <td>Created</td>
                      <td>
                        {isMounted ?
                          fullDateAndTime(data.createdAt)
                          :
                          ""
                        }
                        <LinkTxIcon tx={data.createdTxHash} />
                      </td>
                    </tr>
                    {data.createdAt !== data.updatedAt &&
                      <tr>
                        <td>Last update</td>
                        <td>
                          {isMounted ?
                            fullDateAndTime(data.updatedAt)
                            :
                            ""
                          }
                          <LinkTxIcon tx={data.updatedTxHash} />
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                {data?.auctionSlot &&
                  <table className='table-details'>
                    <thead>
                      <tr><th colSpan="100">Auction slot</th></tr>
                    </thead>
                    <tbody>
                      {trWithAccount(data.auctionSlot, 'account', t("table.owner"))}
                      {data.auctionSlot.authAccounts?.length > 0 ?
                        data.auctionSlot.authAccounts.map((account, i) => (
                          <React.Fragment key={i}>
                            {trWithAccount(
                              account,
                              'account',
                              "Authorized account " + (data.auctionSlot.authAccounts.length > 1 ? i + 1 : "")
                            )}
                          </React.Fragment>
                        ))
                        :
                        <tr>
                          <td>Authorized accounts</td>
                          <td>The are no additional accounts that are authorized to trade at the discounted fee for this AMM instance.</td>
                        </tr>
                      }
                      <tr>
                        <td>Discounted fee</td>
                        <td>
                          {showPercents(data.auctionSlot.discountedFee)}
                        </td>
                      </tr>
                      <tr>
                        <td>Price</td>
                        <td>
                          {fullNiceNumber(data.auctionSlot.price.value)}
                          {" " + lpToken + " "}
                        </td>
                      </tr>
                      <tr>
                        <td>Expiration</td>
                        <td>
                          {isMounted ?
                            fullDateAndTime(data.auctionSlot.expiration)
                            :
                            ""
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                }

                {data?.voteSlots?.length > 0 &&
                  <table className='table-details'>
                    <thead>
                      <tr><th colSpan="100">Vote slots</th></tr>
                    </thead>
                    <tbody>
                      {data.voteSlots.map((slot, i) => (
                        <React.Fragment key={i}>
                          {
                            trWithAccount(
                              slot,
                              'account',
                              "Voter " + (data.voteSlots.length > 1 ? i + 1 : "")
                            )
                          }
                          <tr>
                            <td>Trading fee</td>
                            <td>{showPercents(slot.tradingFee)}</td>
                          </tr>
                          <tr>
                            <td>Vote weight</td>
                            <td>{showPercents(slot.voteWeight)}</td>
                          </tr>
                          <tr>
                            <td>Created</td>
                            <td>
                              {isMounted ?
                                fullDateAndTime(slot.createdAt)
                                :
                                ""
                              }
                              <LinkTxIcon tx={slot.createdTxHash} />
                            </td>
                          </tr>
                          {slot.createdAt !== slot.updatedAt &&
                            <tr>
                              <td>Last update</td>
                              <td>
                                {isMounted ?
                                  fullDateAndTime(slot.updatedAt)
                                  :
                                  ""
                                }
                                <LinkTxIcon tx={slot.updatedTxHash} />
                              </td>
                            </tr>
                          }
                          {i !== data.voteSlots.length - 1 &&
                            <tr><td colSpan="100"><hr /></td></tr>
                          }
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            }
          </>
        }
      </div>
    </>
  )
}
