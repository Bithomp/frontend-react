import { TransactionCard } from "./TransactionCard";

export default {
  component: TransactionCard,
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: "760px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Successfull = {
  render: () => <TransactionCard tx={txSuccess} />,
};

export const Failed = {
  render: () => <TransactionCard tx={txFailed} />,
};

const txSuccess = {
  type: "settings",
  address: "rBithomp4vj5E2kUebx7tVwipBueg55XxS",
  sequence: 15,
  id: "EF79C5417863053D983CFE56CAB3ED00EF472134F359D597CA5B03EA65F102EE",
  specification: { regularKey: "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z" },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2023-12-13T13:42:21.000Z",
    fee: "0.000012",
    balanceChanges: { rBithomp4vj5E2kUebx7tVwipBueg55XxS: [Array] },
    ledgerVersion: 84563384,
    indexInLedger: 16,
  },
  rawTransaction: {
    Account: "rBithomp4vj5E2kUebx7tVwipBueg55XxS",
    Fee: "12",
    LastLedgerSequence: 84563391,
    OperationLimit: 21337,
    RegularKey: "rsuUjfWxrACCAwGQDsNeZUhpzXf1n1NK5Z",
    Sequence: 15,
    SigningPubKey:
      "036C288D95A4268D268F8CAFC262FC77EB7265535805B760BD8A0E544C1C5740A7",
    TransactionType: "SetRegularKey",
    TxnSignature:
      "304402203EB3B905FCE5DE813F35173EFA182E86DC40076C8999E2F6FE00624343A3B74B022014987F139ED35FDBF85C52FF922F06E813D375C5255EB43AE74CDF34269CD276",
    ctid: "C50A55B800100000",
    date: 755790141,
    hash: "EF79C5417863053D983CFE56CAB3ED00EF472134F359D597CA5B03EA65F102EE",
    inLedger: 84563384,
    ledger_index: 84563384,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 16,
      TransactionResult: "tesSUCCESS",
    },
    validated: true,
  },
};

const txFailed = {
  type: 'payment',
  address: 'rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X',
  sequence: 84850253,
  id: 'A12241DC9DC3F6129B41C8E5565B0AE4067BE3E7A2985F511A767D55E4DBFBC6',
  specification: {
    source: {
      address: 'rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X',
      maxAmount: [Object]
    },
    destination: { address: 'rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw' },
    memos: [ [Object] ]
  },
  outcome: {
    result: 'tecUNFUNDED_PAYMENT',
    timestamp: '2024-01-20T07:37:40.000Z',
    fee: '0.00001',
    balanceChanges: { rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X: [Array] },
    ledgerVersion: 85400849,
    indexInLedger: 168
  },
  rawTransaction: {
    Account: 'rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X',
    Amount: '1',
    Destination: 'rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw',
    Fee: '10',
    Flags: 0,
    LastLedgerSequence: 85400867,
    Memos: [ [Object] ],
    Sequence: 84850253,
    SigningPubKey: 'EDE71AB0976D4C12C3BAFAFD79D47593BF760A17191638194E9BA94A7547D27A30',
    TransactionType: 'Payment',
    TxnSignature: '3C45D0F9903EED4B5D4FAB725116EBCD51BA4401616437FFF7A8A7F8FE973C1DDA90F4940464DFE936FB85068396C67C9A9B4419819FC03A331E7C0FAB7D6E0D',
    ctid: 'C5171D1100A80000',
    date: 759051460,
    hash: 'A12241DC9DC3F6129B41C8E5565B0AE4067BE3E7A2985F511A767D55E4DBFBC6',
    inLedger: 85400849,
    ledger_index: 85400849,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 168,
      TransactionResult: 'tecUNFUNDED_PAYMENT'
    },
    validated: true
  }
}
