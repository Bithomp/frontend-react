import { BsInfoCircleFill } from 'react-icons/bs'
import styled from 'styled-components'

export const TDetails = styled.table`
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  color: var(--text-main);
  font-size: 16px;
  font-weight: 400;
  text-align: left;
  margin: auto;
`

export const TBody = ({ children }) => <tbody>{children}</tbody>
export const TRow = ({ children }) => <tr>{children}</tr>

const TDataStyled = styled.td`
  padding: 4px;
  &:first-child {
    color: var(--text-secondary);
    text-align: right;
  }
  &:nth-child(2) {
    word-break: break-word;
  }
`

const ResponsiveTooltip = styled.span`
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
`

export const TData = ({ tooltip, className, children }) => (
  <TDataStyled className={className}>
    {children}
    {tooltip && (
      <>
        {' '}
        <span className="tooltip">
          <BsInfoCircleFill style={{ marginBottom: -2 }} />
          <ResponsiveTooltip className="tooltiptext">{tooltip}</ResponsiveTooltip>
        </span>
      </>
    )}
  </TDataStyled>
)
