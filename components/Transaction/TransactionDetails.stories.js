import { TransactionDetails } from "./TransactionDetails";

export default {
  component: TransactionDetails,
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: "760px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Successfull = {
  render: () => <TransactionDetails tx={txSuccess} />,
};

const txSuccess = {
  type: 'settings',
  address: 'rBithomp4vj5E2kUebx7tVwipBueg55XxS',
  sequence: 15,
  id: 'EF79C5417863053D983CFE56CAB3ED00EF472134F359D597CA5B03EA65F102EE',
  specification: { regularKey: 'rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z' },
  outcome: {
    result: 'tesSUCCESS',
    timestamp: '2023-12-13T13:42:21.000Z',
    fee: '0.000012',
    balanceChanges: { rBithomp4vj5E2kUebx7tVwipBueg55XxS: [Array] },
    ledgerVersion: 84563384,
    indexInLedger: 16
  },
  rawTransaction: {
    Account: 'rBithomp4vj5E2kUebx7tVwipBueg55XxS',
    Fee: '12',
    LastLedgerSequence: 84563391,
    OperationLimit: 21337,
    RegularKey: 'rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z',
    Sequence: 15,
    SigningPubKey: '036C288D95A4268D268F8CAFC262FC77EB7265535805B760BD8A0E544C1C5740A7',
    TransactionType: 'SetRegularKey',
    TxnSignature: '304402203EB3B905FCE5DE813F35173EFA182E86DC40076C8999E2F6FE00624343A3B74B022014987F139ED35FDBF85C52FF922F06E813D375C5255EB43AE74CDF34269CD276',
    ctid: 'C50A55B800100000',
    date: 755790141,
    hash: 'EF79C5417863053D983CFE56CAB3ED00EF472134F359D597CA5B03EA65F102EE',
    inLedger: 84563384,
    ledger_index: 84563384,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 16,
      TransactionResult: 'tesSUCCESS'
    },
    validated: true
  }
};
