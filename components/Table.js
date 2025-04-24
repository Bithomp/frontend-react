import { BsInfoCircleFill } from 'react-icons/bs'

export const TData = ({ tooltip, className, colSpan, children }) => (
  <>
    <td className={className + ' tx-td'} colSpan={colSpan}>
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
        width: 170px;
        text-align: left !important;
        &::after {
          top: 16px !important;
        }
        @media (max-width: 800px) {
          left: -75px;
          top: 28px !important;
          &::after {
            top: 0 !important;
            left: 77.5px !important;
            border-color: transparent transparent #333 transparent !important;
            margin-top: -10px !important;
          }
        }
      }
    `}</style>
  </>
)
