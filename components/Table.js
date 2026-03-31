import { BsInfoCircleFill } from 'react-icons/bs'

export const TData = ({ tooltip, className, style, colSpan, children }) => (
  <>
    <td className={(className ? className + ' ' : '') + 'tx-td'} colSpan={colSpan} style={style ? style : {}}>
      {children}
      {tooltip && (
        <>
          {' '}
          <span className="tooltip">
            <BsInfoCircleFill style={{ marginBottom: -2 }} />
            <span className="responsive-tooltip tooltiptext">{tooltip}</span>
          </span>
        </>
      )}
    </td>
    <style jsx>{`
      .tx-td {
        padding: 4px;
        &:first-child {
          color: var(--text-secondary);
          text-align: right;
        }
        &:nth-child(2) {
          word-break: break-word;
        }
      }
      .responsive-tooltip {
        width: min(220px, calc(100vw - 24px));
        text-align: left !important;
      }
    `}</style>
  </>
)
