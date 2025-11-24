import { TData } from '../Table'
import { useTranslation } from 'next-i18next'
import { TransactionCard } from './TransactionCard'
import { AddressWithIconFilled, duration, fullDateAndTime, showFlags } from '../../utils/format'

export const TransactionCron = ({ data, pageFiatRate, selectedCurrency }) => {
  const { t } = useTranslation()
  if (!data) return null
  const { specification, tx } = data

  const flags = showFlags(specification?.flags)

  return (
    <TransactionCard data={data} pageFiatRate={pageFiatRate} selectedCurrency={selectedCurrency}>
      <tr>
        <TData tooltip="The Hook account initiating the cron. This is the account that will be invoked when the cron executes.">
          Hook account
        </TData>
        <TData>
          <AddressWithIconFilled data={specification.source} name="address" />
        </TData>
      </tr>
      {tx?.Owner && (
        <tr>
          <TData>Owner</TData>
          <TData>
            <AddressWithIconFilled data={specification} name="owner" />
          </TData>
        </tr>
      )}
      {tx?.StartTime !== undefined && (
        <tr>
          <TData tooltip="Time when the first execution should occur.">Start time</TData>
          <TData>{tx.StartTime ? fullDateAndTime(tx.StartTime, 'ripple') : 'immediate execution'}</TData>
        </tr>
      )}
      {tx?.RepeatCount !== undefined && (
        <tr>
          <TData tooltip="Number of times the cron should execute.">Repeat count</TData>
          <TData>{tx.RepeatCount}</TData>
        </tr>
      )}
      {tx?.DelaySeconds && (
        <tr>
          <TData tooltip="Time interval in seconds between each execution.">Delay seconds</TData>
          <TData>
            {tx.DelaySeconds}{' '}
            {tx.DelaySeconds > 59 && <span className="grey">({duration(t, tx.DelaySeconds, { seconds: true })})</span>}
          </TData>
        </tr>
      )}
      {flags && (
        <tr>
          <TData>Flags</TData>
          <TData>{flags}</TData>
        </tr>
      )}
    </TransactionCard>
  )
}
