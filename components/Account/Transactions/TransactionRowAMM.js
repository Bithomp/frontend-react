import { TransactionRowCard } from './TransactionRowCard'

export const TransactionRowAMM = ({ data, address, index, selectedCurrency }) => {
  const { tx } = data

  const ammTypeLabels = {
    AMMCreate: 'AMM Create',
    AMMDeposit: 'AMM Deposit',
    AMMWithdraw: 'AMM Withdraw',
    AMMVote: 'AMM Vote'
  }

  const txTypeSpecial = ammTypeLabels[tx?.TransactionType] // it will fallback to tx?.TransactionType if not found

  return (
    <TransactionRowCard
      data={data}
      address={address}
      index={index}
      selectedCurrency={selectedCurrency}
      txTypeSpecial={txTypeSpecial}
    >
      {(tx.TradingFee || tx.TradingFee === 0) && (
        <>
          Trading fee: <span className="bold">{tx.TradingFee}%</span>
          <br />
        </>
      )}
    </TransactionRowCard>
  )
}
