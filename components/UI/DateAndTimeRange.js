
import DatePicker from "react-datepicker"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"

import "react-datepicker/dist/react-datepicker.css"
import { registerLocale, setDefaultLocale } from "react-datepicker"
import { useRouter } from "next/router"

import Tabs from "../Tabs"
import { network, useWidth, setTabParams } from "../../utils"

export default function DateAndTimeRange({ setPeriod, minDate, tabs, defaultPeriod, style }) {
  const { i18n, t } = useTranslation()
  const windowWidth = useWidth()
  const router = useRouter()

  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [periodName, setPeriodName] = useState(defaultPeriod)
  const [ready, setReady] = useState(false)

  let hourAgo = new Date().setHours(new Date().getHours() - 1)
  let dayAgo = new Date().setDate(new Date().getDate() - 1)
  let weekAgo = new Date().setDate(new Date().getDate() - 7)
  let monthAgo = new Date().setDate(new Date().getDate() - 30)
  let yearAgo = new Date().setDate(new Date().getDate() - 365)
  hourAgo = new Date(hourAgo)
  dayAgo = new Date(dayAgo)
  weekAgo = new Date(weekAgo)
  monthAgo = new Date(monthAgo)
  yearAgo = new Date(yearAgo)

  if (minDate === "nft") {
    if (network === "mainnet") {
      minDate = new Date("2022-10-31T20:50:51.000Z") // first nft on the xrpl mainent
    } else if (network === "xahau") {
      minDate = new Date("2023-11-01T13:00:29.000Z") //first nft on xahau
    } else if (network === "xahau-testnet") {
      minDate = new Date("2023-01-28T08:35:30.000Z") //first nft on xahau-testnet
    } else if (network === "testnet") {
      minDate = new Date("2023-08-09T01:53:41.000Z") // first nft in history for the testnet
    } else if (network === "devnet") {
      minDate = new Date("2023-09-19T20:36:40.000Z") // first nft in history for the devnet
    } else {
      minDate = new Date("2013-01-01T03:21:10.000Z") // ledger 32570
    }
  }

  const periodTabs = [
    { value: "hour", label: t("tabs.hour") },
    { value: "day", label: t("tabs.day") },
    { value: "week", label: t("tabs.week") },
    { value: "month", label: t("tabs.month") },
    { value: "year", label: t("tabs.year") },
    { value: "all", label: t("tabs.all-time") }
  ]

  useEffect(() => {
    setReady(true)

    if (periodName?.includes("..")) {
      const periodParts = periodName.split("..")
      setStartDate(new Date(periodParts[0]))
      setEndDate(new Date(periodParts[1]))
      return
    }

    let newStartDate = null

    setEndDate(new Date())
    if (periodName === "hour") {
      newStartDate = hourAgo
    } else if (periodName === "day") {
      newStartDate = dayAgo
    } else if (periodName === "week") {
      newStartDate = weekAgo
    } else if (periodName === "month") {
      newStartDate = monthAgo
    } else if (periodName === "year") {
      newStartDate = yearAgo
    } else if (periodName === "all") {
    }
    if (periodName === "hour" ||
      periodName === "day" ||
      periodName === "week" ||
      periodName === "month" ||
      periodName === "year"
    ) {
      if (minDate && newStartDate < minDate) {
        setStartDate(minDate)
      } else {
        setStartDate(newStartDate)
      }
    } else {
      if (minDate && newStartDate < minDate) {
        setStartDate(minDate)
      }
    }

    let queryAddList = []
    let queryRemoveList = []

    if (periodName && periodName !== "custom") {
      queryAddList.push({ name: "period", value: periodName })
      setPeriod(periodName)
    } else if (startDate && endDate) {
      const range = startDate.toISOString() + '..' + endDate.toISOString()
      queryAddList.push({ name: "period", value: range })
      setPeriod(range)
    } else {
      queryRemoveList.push("period")
    }

    setTabParams(router, [], queryAddList, queryRemoveList)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodName])

  useEffect(() => {
    //need it to update the search, only for custom to keep the names
    if (startDate && endDate && (periodName === "custom" || !periodName)) {
      setPeriod(startDate.toISOString() + '..' + endDate.toISOString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  let lang = i18n.language

  const notSupportedLanguages = ['my']
  if (notSupportedLanguages.includes(lang)) {
    lang = "en"
  }

  if (lang) {
    if (lang !== "en") {
      const languageData = require('date-fns/locale/' + lang + '/index.js')
      registerLocale(lang, languageData)
    }
    setDefaultLocale(lang)
  }

  if (!minDate) {
    minDate = new Date("2013-01-01T03:21:10.000Z") // ledger 32570
  }

  const startOnChange = date => {
    setStartDate(date)
    setPeriodName("custom")
  }

  const endOnChange = date => {
    setEndDate(date)
    setPeriodName("custom")
  }

  return <span style={style}>
    {tabs && ready &&
      <>
        <Tabs tabList={periodTabs} tab={periodName} setTab={setPeriodName} name="periodTabs" />
        {windowWidth < 910 && <br />}
      </>
    }

    <DatePicker
      selected={startDate}
      onChange={startOnChange}
      selectsStart
      showTimeInput
      timeInputLabel={t("table.time")}
      startDate={startDate}
      minDate={minDate}
      maxDate={new Date()}
      endDate={endDate}
      dateFormat="yyyy/MM/dd HH:mm"
      className="dateAndTimeRange"
      showMonthDropdown
      showYearDropdown
    />
    <DatePicker
      selected={endDate}
      onChange={endOnChange}
      selectsEnd
      showTimeInput
      timeInputLabel={t("table.time")}
      startDate={startDate}
      endDate={endDate}
      minDate={startDate}
      maxDate={new Date()}
      dateFormat="yyyy/MM/dd HH:mm"
      className="dateAndTimeRange"
      showMonthDropdown
      showYearDropdown
    />
  </span>
}