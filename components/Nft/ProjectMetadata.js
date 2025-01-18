import { stripText } from '../../utils'
import { timeFromNow } from '../../utils/format'
import { useTranslation } from 'next-i18next'

const tableWithData = (data) => {
  return (
    <table style={{ fontSize: 12 }}>
      <tbody>
        {Array.isArray(data)
          ? data.map((n, i) => (
              <tr key={i}>
                <td>{typeof n === 'object' ? tableWithData(n) : n}</td>
              </tr>
            ))
          : Object.keys(data).map((n, i) => (
              <tr key={i}>
                <td>{n}:</td>
                <td>{typeof data[n] === 'object' ? tableWithData(data[n]) : data[n]}</td>
              </tr>
            ))}
      </tbody>
    </table>
  )
}

export default function ProjectMetadata({ data, updatedAt }) {
  const { t, i18n } = useTranslation()
  return (
    <table className="table-details autowidth">
      <thead>
        <tr>
          <th colSpan="100">Project metadata </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{t('table.updated')}</td>
          <td>{timeFromNow(updatedAt, i18n)}</td>
        </tr>
        {Object.keys(data).map((name, i) => (
          <tr key={i}>
            <td>{stripText(name)}</td>
            <td>{typeof data[name] === 'object' ? tableWithData(data[name]) : stripText(data[name])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
