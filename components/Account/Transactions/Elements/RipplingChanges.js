import { amountFormat } from '../../../../utils/format'
import { add } from '../../../../utils/calc'

export const RipplingChanges = ({ balanceChanges }) => {
  if (!balanceChanges || balanceChanges.length === 0) return null

  const gatewayAmountChange = balanceChanges.reduce((sum, item) => {
    return add(sum, Number(item.value || 0))
  }, 0)

  return (
    <div>
      <span>Affected accounts: </span>
      <br />
      {balanceChanges.map((change, index) => {
        //if rippling, use counterparty as issuer
        const formattedChange = {
          ...change,
          issuer: change.counterparty,
          issuerDetails: change.counterpartyDetails
        }
        return (
          <div key={index}>
            {amountFormat(formattedChange, {
              icon: true,
              showPlus: true,
              withIssuer: true,
              bold: true,
              color: 'direction',
              precise: 'nice',
              issuerShort: false
            })}
          </div>
        )
      })}
      {gatewayAmountChange !== null && (
        <div>
          <span>Total gateway change: </span>
          <span>
            {amountFormat(
              { ...balanceChanges[0], value: gatewayAmountChange },
              {
                icon: true,
                bold: true,
                color: 'direction',
                precise: 'nice'
              }
            )}
          </span>
        </div>
      )}
    </div>
  )
}
