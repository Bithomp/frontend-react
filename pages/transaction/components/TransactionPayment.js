import { LinkAccount } from './Links'
import { TransactionDetails } from './TransactionDetails'

export const TransactionPayment = ({ tx }) => {

    const source = tx.specification?.source?.address
    const destination = tx.specification?.destination?.address

    return (
        <TransactionDetails tx={tx}>
            <tr>
                <td>Source:</td>
                <td><LinkAccount hash={source} /></td>
            </tr>
            <tr>
                <td>Destination:</td>
                <td><LinkAccount hash={destination} /></td>
            </tr>
            <tr>
                <td>Delivered amount:</td>
                <td>{tx.outcome.deliveredAmount?.value} {tx.outcome.deliveredAmount?.currency}</td>
            </tr>
        </TransactionDetails>
    )
}
