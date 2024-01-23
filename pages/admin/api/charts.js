import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import { useWidth } from '../../../utils'

import SEO from '../../../components/SEO'
import Tabs from '../../../components/Tabs'
import SimpleChart from '../../../components/SimpleChart'
import DateAndTimeRange from '../../../components/UI/DateAndTimeRange'

export const getServerSideProps = async (context) => {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'admin'])),
    },
  }
}

const now = new Date()
const nowTime = new Date()
let hourAgo = nowTime.setHours(now.getHours() - 1)
let dayAgo = now.setDate(now.getDate() - 1)
let weekAgo = now.setDate(now.getDate() - 7)
let monthAgo = now.setDate(now.getDate() - 30)
let yearAgo = now.setDate(now.getDate() - 365)
hourAgo = new Date(hourAgo)
dayAgo = new Date(dayAgo)
weekAgo = new Date(weekAgo)
monthAgo = new Date(monthAgo)
yearAgo = new Date(yearAgo)

export default function Charts() {
  const { t } = useTranslation(['common', 'admin'])
  const router = useRouter()
  const width = useWidth()

  const [errorMessage, setErrorMessage] = useState("")
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState("day")
  const [startDate, setStartDate] = useState(dayAgo)
  const [endDate, setEndDate] = useState(new Date())

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken')
    if (!sessionToken) {
      router.push('/admin')
    } else {
      axios.defaults.headers.common['Authorization'] = "Bearer " + sessionToken
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let newStartDate = null
    let newEndDate = null
    if (period === "hour") {
      newStartDate = hourAgo
    } else if (period === "day") {
      newStartDate = dayAgo
    } else if (period === "week") {
      newStartDate = weekAgo
    } else if (period === "month") {
      newStartDate = monthAgo
    } else if (period === "year") {
      newStartDate = yearAgo
    }
    if (period !== "custom") {
      newEndDate = new Date()
      setEndDate(newEndDate)
      setStartDate(newStartDate)
    }

    getData({ newStartDate, newEndDate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const mainTabs = [
    { value: "account", label: "Account" },
    { value: "api", label: "API" },
    //{ value: "bots", label: "Bots" },
  ]

  const apiTabs = [
    { value: "api-info", label: "Information" },
    { value: "api-payments", label: "Payments" },
    { value: "api-statistics", label: "Statistics" },
    { value: "api-requests", label: "Requests" },
    { value: "api-charts", label: "Charts" },
  ]

  const periodTabs = [
    { value: "hour", label: "Hour" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" }
  ]

  const changePage = tab => {
    if (tab === "api") {
      router.push("/admin/api")
    } else if (tab === "bots") {
      router.push("/admin/bots")
    } else if (tab === "account") {
      router.push("/admin")
    } else if (tab === "api-info") {
      router.push("/admin/api")
    } else if (tab === "api-payments") {
      router.push("/admin/api/payments")
    } else if (tab === "api-requests") {
      router.push("/admin/api/requests")
    } else if (tab === "api-statistics") {
      router.push("/admin/api/statistics")
    } else if (tab === "api-charts") {
      router.push("/admin/api/charts")
    }
  }

  const getData = async ({ newStartDate, newEndDate }) => {
    setLoading(true)

    let span = "day"
    if (period === "day") {
      span = "hour"
    } else if (period === "hour") {
      span = "minute"
    }

    newStartDate = newStartDate || startDate
    newEndDate = newEndDate || endDate

    //&search=text&ip=z
    const apiRequests = await axios.get(
      'partner/partner/accessToken/requests/chart?span=' + span + '&period=' + newStartDate.toISOString() + '..' + newEndDate.toISOString(),
      { baseUrl: '/api/' }
    ).catch(error => {
      if (error && error.message !== "canceled") {
        setErrorMessage(t(error.response.data.error || "error." + error.message))
        if (error.response?.data?.error === "errors.token.required") {
          router.push('/admin')
        }
      }
      setLoading(false)
    })
    setLoading(false)

    if (apiRequests?.data?.requests?.length > 0) {
      const data = apiRequests.data.requests.map((item) => {
        return [item.time, item.count]
      })
      setChartData(data)
    }
  }

  return <>
    <SEO title={t("header", { ns: "admin" })} />
    <div className="page-admin content-text">
      <h1 className='center'>
        {t("header", { ns: "admin" })}
      </h1>

      <Tabs tabList={mainTabs} tab="api" setTab={changePage} name="mainTabs" />
      <Tabs tabList={apiTabs} tab="api-charts" setTab={changePage} name="apiTabs" />

      <Tabs tabList={periodTabs} tab={period} setTab={setPeriod} name="periodTabs" />
      <center>
        <DateAndTimeRange
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
        {width < 500 && <br />}
        <button
          className="button-action narrow thin"
          onClick={getData}
        >
          Search
        </button>
      </center>

      <div className='center'>
        <div style={{ marginTop: "20px", textAlign: "left" }}>
          <h4 className='center'>Requests count</h4>
          {!loading && chartData?.length > 0 &&
            <div style={{ maxWidth: "800px", margin: "auto" }}>
              <SimpleChart data={chartData} />
            </div>
          }
          {!loading && chartData.length === 0 &&
            <div className='center' style={{ marginTop: "20px" }}>
              no data available
            </div>
          }
          {loading &&
            <div className='center' style={{ marginTop: "20px" }}>
              <span className="waiting"></span>
              <br />{t("general.loading")}
            </div>
          }
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
