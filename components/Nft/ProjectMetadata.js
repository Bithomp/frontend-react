import { stripText } from '../../utils'

export default function ProjectMetadata({ data }) {
  return (
    <table className="table-details autowidth">
      <thead>
        <tr>
          <th colSpan="100">Project metadata</th>
        </tr>
      </thead>
      <tbody>
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
