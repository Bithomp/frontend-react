import { useEffect, useState } from 'react'
import { CSVLink } from 'react-csv'

import DownloadIcon from '../../public/images/download.svg'

export default function CsvExportButton({ data, headers, className = '', style }) {
  const [rendered, setRendered] = useState(false)
  const [dateAndTimeNow, setDateAndTimeNow] = useState('')

  useEffect(() => {
    const date = new Date(Date.now()).toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' })
    const time = new Date(Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    setDateAndTimeNow(date + ' at ' + time)
    setRendered(true)
  }, [])

  if (!rendered) return ''

  return (
    <CSVLink
      data={data || []}
      headers={headers}
      filename={'export ' + dateAndTimeNow + '.csv'}
      className={'button-action narrow' + (!(data?.length > 0) ? ' disabled' : '') + (className ? ' ' + className : '')}
      style={style}
    >
      <DownloadIcon /> CSV
    </CSVLink>
  )
}
