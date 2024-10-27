import DatePicker from 'react-datepicker'
import { useTranslation } from 'next-i18next'
import { useEffect, useState } from 'react'

import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale, setDefaultLocale } from 'react-datepicker'
import { useRouter } from 'next/router'

import RadioOptions from './RadioOptions'
import Tabs from '../Tabs'
import { useWidth, setTabParams, networkMinimumDate } from '../../utils'

export default function DateAndTimeRange({ setPeriod, minDate, tabs, radio, defaultPeriod, style, periodQueryName }) {
  if (!periodQueryName) {
    periodQueryName = 'period'
  }

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
  hourAgo = new Date(hourAgo).setMilliseconds(0)
  dayAgo = new Date(dayAgo).setMilliseconds(0)
  weekAgo = new Date(weekAgo).setMilliseconds(0)
  monthAgo = new Date(monthAgo).setMilliseconds(0)
  yearAgo = new Date(yearAgo).setMilliseconds(0)

  if (minDate === 'nft') {
    minDate = networkMinimumDate('nft')
  }

  if (!minDate) {
    minDate = networkMinimumDate()
  }

  let periodTabs = [
    { value: 'hour', label: t('tabs.hour') },
    { value: 'day', label: t('tabs.day') },
    { value: 'week', label: t('tabs.week') },
    { value: 'month', label: t('tabs.month') },
    { value: 'year', label: t('tabs.year') }
  ]

  // if minDate was less than a year ago, do not show tab "all"
  //usefull for xahau, when there is less data than for a year, otherwise the all stats looks weird
  if (minDate < yearAgo || radio) {
    periodTabs.push({ value: 'all', label: t('tabs.all-time') })
  }

  const setValues = (periodName, startDatePassed, endDatePassed) => {
    let startDateIn = startDatePassed || startDate
    let endDateIn = endDatePassed || endDate
    if (periodName?.includes('..')) {
      const periodParts = periodName.split('..')
      setStartDate(new Date(new Date(periodParts[0]).setMilliseconds(0)))
      setEndDate(new Date(new Date(periodParts[1]).setMilliseconds(0)))
      return
    }

    setEndDate(endDateIn || new Date(new Date().setMilliseconds(0)))

    if (startDatePassed) {
      setStartDate(startDateIn)
    } else {
      let newStartDate = null
      if (periodName === 'hour') {
        newStartDate = hourAgo
      } else if (periodName === 'day') {
        newStartDate = dayAgo
      } else if (periodName === 'week') {
        newStartDate = weekAgo
      } else if (periodName === 'month') {
        newStartDate = monthAgo
      } else if (periodName === 'year') {
        newStartDate = yearAgo
      } else if (periodName === 'all') {
      }
      if (
        periodName === 'hour' ||
        periodName === 'day' ||
        periodName === 'week' ||
        periodName === 'month' ||
        periodName === 'year'
      ) {
        if (minDate && newStartDate < minDate) {
          setStartDate(minDate)
        } else {
          setStartDate(newStartDate)
        }
      } else {
        if (minDate && (!newStartDate || newStartDate < minDate) && periodName !== 'custom') {
          setStartDate(minDate)
        }
      }
    }

    let queryAddList = []
    let queryRemoveList = []

    if (periodName && periodName !== 'custom') {
      if (periodName !== defaultPeriod) {
        queryAddList.push({ name: periodQueryName, value: periodName })
      } else {
        queryRemoveList.push(periodQueryName)
      }
      setPeriod(periodName)
    } else if (startDateIn && endDateIn) {
      const range = new Date(startDateIn).toISOString() + '..' + new Date(endDateIn).toISOString()
      queryAddList.push({ name: periodQueryName, value: range })
      setPeriod(range)
    } else {
      queryRemoveList.push(periodQueryName)
    }

    setTabParams(router, [], queryAddList, queryRemoveList)
  }

  useEffect(() => {
    setReady(true)
    setValues(periodName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodName])

  let lang = i18n.language

  const notSupportedLanguages = ['my']
  if (notSupportedLanguages.includes(lang)) {
    lang = 'en'
  }

  if (lang) {
    if (lang !== 'en') {
      const languageData = require('date-fns/locale/' + lang + '/index.js')
      registerLocale(lang, languageData)
    }
    setDefaultLocale(lang)
  }

  const startOnChange = (date) => {
    setValues('custom', date, null)
  }

  const endOnChange = (date) => {
    setValues('custom', null, date)
  }

  return (
    <span style={style}>
      {tabs && ready && (
        <>
          <Tabs tabList={periodTabs} tab={periodName} setTab={setPeriodName} name={periodQueryName + 'Tabs'} />
          {windowWidth < 910 && <br />}
        </>
      )}

      {radio && ready && (
        <>
          <RadioOptions tabList={periodTabs} tab={periodName} setTab={setPeriodName} name={periodQueryName + 'Tabs'} />
          {windowWidth < 910 && <br />}
        </>
      )}

      <DatePicker
        selected={startDate}
        onChange={startOnChange}
        selectsStart
        showTimeInput
        timeInputLabel={t('table.time')}
        startDate={startDate}
        minDate={minDate}
        maxDate={new Date().setMilliseconds(0)}
        endDate={endDate}
        dateFormat="yyyy/MM/dd HH:mm"
        className="dateAndTimeRange"
        showMonthDropdown
        showYearDropdown
        name="StartDate"
      />
      <DatePicker
        selected={endDate}
        onChange={endOnChange}
        selectsEnd
        showTimeInput
        timeInputLabel={t('table.time')}
        startDate={startDate}
        endDate={endDate}
        minDate={startDate}
        maxDate={new Date().setMilliseconds(0)}
        dateFormat="yyyy/MM/dd HH:mm"
        className="dateAndTimeRange"
        showMonthDropdown
        showYearDropdown
        name="EndDate"
      />
    </span>
  )
}
