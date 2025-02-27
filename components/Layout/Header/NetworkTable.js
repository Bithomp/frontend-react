import { network, networks } from '../../../utils'
import { useRouter } from 'next/router'

export default function NetworkTable({ close }) {
  const router = useRouter()

  const handleChange = (newNetwork) => {
    close()
    if (network === newNetwork) return
    router.push(networks[newNetwork].server + router.asPath)
  }

  const spanClass = (option) => {
    if (!option) return
    return network === option.value ? 'link blue' : 'link'
  }

  const td = (list, i, columnsNumber) => {
    let cols = []
    for (let j = 0; j < columnsNumber; j++) {
      cols.push(
        <td key={j}>
          <span
            className={spanClass(list[columnsNumber * i + j])}
            onClick={() => handleChange(list[columnsNumber * i + j].value)}
          >
            {list[columnsNumber * i + j]?.label}
          </span>
        </td>
      )
    }
    return cols
  }

  const list = [
    { value: 'mainnet', label: networks['mainnet'].explorerName },
    { value: 'xahau', label: networks['xahau'].explorerName },
    { value: 'testnet', label: networks['testnet'].explorerName },
    { value: 'devnet', label: networks['devnet'].explorerName },
    { value: 'xahau-testnet', label: networks['xahau-testnet'].explorerName },
    { value: 'xahau-jshooks', label: networks['xahau-jshooks'].explorerName }
  ]

  const table = () => {
    const columnsNumber = 1
    const lines = Math.ceil(list.length / columnsNumber)
    let rows = []
    for (let i = 0; i < lines; i++) {
      rows.push(<tr key={i}>{td(list, i, columnsNumber)}</tr>)
    }
    return (
      <table>
        <tbody>{rows}</tbody>
      </table>
    )
  }

  return table()
}
