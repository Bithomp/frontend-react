import { stripText } from '../../utils'
import { timeFromNow } from '../../utils/format'
import { useTranslation } from 'next-i18next'

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
            <td>
              {typeof data[name] === 'object' ? (
                <table style={{ fontSize: 12 }}>
                  <tbody>
                    {Object.keys(data[name]).map((n, i) => (
                      <tr key={i}>
                        <td>{n}:</td>
                        <td>{data[name][n]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                stripText(data[name])
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
