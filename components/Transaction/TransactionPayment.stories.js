import { TransactionPayment } from "./TransactionPayment";

export default {
  component: TransactionPayment,
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: "760px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Successfull = {
  render: () => <TransactionPayment tx={txSuccess} />,
};

export const Failed = {
  render: () => <TransactionPayment tx={txFailed} />,
};

const txSuccess = {
  type: "payment",
  address: "rhoKLikhHu1hF5rvaQwt6EkGL6XaLUo6nu",
  sequence: 84942576,
  id: "B6BD932D3569BE4536763FF80DE9C56897413A2C870EE88F8B6C30D548204277",
  specification: {
    source: {
      address: "rhoKLikhHu1hF5rvaQwt6EkGL6XaLUo6nu",
      maxAmount: [Object],
    },
    destination: { address: "rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw" },
    memos: [[Object]],
  },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2024-01-20T07:37:40.000Z",
    fee: "0.000012",
    balanceChanges: {
      rhoKLikhHu1hF5rvaQwt6EkGL6XaLUo6nu: [Array],
      rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw: [Array],
    },
    ledgerVersion: 85400849,
    indexInLedger: 154,
    deliveredAmount: { currency: "XRP", value: "0.000001" },
  },
  rawTransaction: {
    Account: "rhoKLikhHu1hF5rvaQwt6EkGL6XaLUo6nu",
    Amount: "1",
    Destination: "rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw",
    Fee: "12",
    Flags: 0,
    LastLedgerSequence: 85400867,
    Memos: [[Object]],
    Sequence: 84942576,
    SigningPubKey:
      "EDDAD745533ADB3075A49614568C247D4109EEB64D8DE4CA02BC8D1CBD4F229DD0",
    TransactionType: "Payment",
    TxnSignature:
      "82E0464D3E3AA360754607066795C8BB5300416E554006803F344EBE76C52B4CBF69B943FDE831757E4E32FABFB0B95AAFE986066E0C4985AB8E6C920159CA0A",
    ctid: "C5171D11009A0000",
    date: 759051460,
    hash: "B6BD932D3569BE4536763FF80DE9C56897413A2C870EE88F8B6C30D548204277",
    inLedger: 85400849,
    ledger_index: 85400849,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 154,
      TransactionResult: "tesSUCCESS",
      delivered_amount: "1",
    },
    validated: true,
  },
};

const txFailed = {
  type: "payment",
  address: "rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X",
  sequence: 84850253,
  id: "A12241DC9DC3F6129B41C8E5565B0AE4067BE3E7A2985F511A767D55E4DBFBC6",
  specification: {
    source: {
      address: "rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X",
      maxAmount: [Object],
    },
    destination: { address: "rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw" },
    memos: [[Object]],
  },
  outcome: {
    result: "tecUNFUNDED_PAYMENT",
    timestamp: "2024-01-20T07:37:40.000Z",
    fee: "0.00001",
    balanceChanges: { rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X: [Array] },
    ledgerVersion: 85400849,
    indexInLedger: 168,
  },
  rawTransaction: {
    Account: "rMt41ydWrJizUUjDiwoFR1uarsfySGXW8X",
    Amount: "1",
    Destination: "rxRpSNb1VktvzBz8JF2oJC6qaww6RZ7Lw",
    Fee: "10",
    Flags: 0,
    LastLedgerSequence: 85400867,
    Memos: [[Object]],
    Sequence: 84850253,
    SigningPubKey:
      "EDE71AB0976D4C12C3BAFAFD79D47593BF760A17191638194E9BA94A7547D27A30",
    TransactionType: "Payment",
    TxnSignature:
      "3C45D0F9903EED4B5D4FAB725116EBCD51BA4401616437FFF7A8A7F8FE973C1DDA90F4940464DFE936FB85068396C67C9A9B4419819FC03A331E7C0FAB7D6E0D",
    ctid: "C5171D1100A80000",
    date: 759051460,
    hash: "A12241DC9DC3F6129B41C8E5565B0AE4067BE3E7A2985F511A767D55E4DBFBC6",
    inLedger: 85400849,
    ledger_index: 85400849,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 168,
      TransactionResult: "tecUNFUNDED_PAYMENT",
    },
    validated: true,
  },
};
