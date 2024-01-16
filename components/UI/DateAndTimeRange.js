
import DatePicker from "react-datepicker"
import { useTranslation } from "react-i18next"

import "react-datepicker/dist/react-datepicker.css"
import { registerLocale, setDefaultLocale } from "react-datepicker"

export default function DateAndTimeRange({ startDate, setStartDate, endDate, setEndDate, minDate }) {
  const { i18n, t } = useTranslation()

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

  const now = new Date()

  return <>
    <DatePicker
      selected={startDate}
      onChange={(date) => setStartDate(date)}
      selectsStart
      showTimeInput
      timeInputLabel={t("table.time")}
      startDate={startDate}
      minDate={minDate}
      maxDate={now}
      endDate={endDate}
      dateFormat="Pp"
      className="dateAndTimeRange"
      showMonthDropdown
      showYearDropdown
    />
    <DatePicker
      selected={endDate}
      onChange={(date) => setEndDate(date)}
      selectsEnd
      showTimeInput
      timeInputLabel={t("table.time")}
      startDate={startDate}
      endDate={endDate}
      minDate={startDate}
      maxDate={now}
      dateFormat="Pp"
      className="dateAndTimeRange"
      showMonthDropdown
      showYearDropdown
    />
  </>
}