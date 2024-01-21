import { TransactionEscrowCreation } from "./TransactionEscrowCreation";

export default {
  component: TransactionEscrowCreation,
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: "760px" }}>
        <Story />
      </div>
    ),
  ],
};

export const EscrowCreation = {
  render: () => <TransactionEscrowCreation tx={txOrder} />,
};

const txOrder = {
  type: "order",
  address: "rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz",
  sequence: 222,
  id: "0CD69FD1F0A890CC57CDA430213FD294F7D65FF4A0F379A0D09D07A222D324E6",
  specification: {
    memos: [[Object]],
    direction: "sell",
    quantity: {
      currency: "USD",
      value: "9878656453",
      counterparty: "rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz",
    },
    totalPrice: {
      currency: "USD",
      value: "9878656453",
      counterparty: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    },
  },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2017-01-25T23:38:00.000Z",
    fee: "0.000012",
    balanceChanges: { rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz: [Array] },
    orderbookChanges: { rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz: [Array] },
    ledgerVersion: 27237903,
    indexInLedger: 17,
  },
  rawTransaction: {
    Account: "rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz",
    Fee: "12",
    Flags: 2148007936,
    LastLedgerSequence: 27237910,
    Memos: [[Object]],
    Sequence: 222,
    SigningPubKey:
      "03166ACDA4B06EAF798A2789BB58FC0047976A7AA244ABBB0CAA5305FC9523609C",
    TakerGets: {
      currency: "USD",
      issuer: "rJkg989h7fPaJLm9CEyAsdvwgZYtKs2zzz",
      value: "9878656453",
    },
    TakerPays: {
      currency: "USD",
      issuer: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
      value: "9878656453",
    },
    TransactionType: "OfferCreate",
    TxnSignature:
      "304402202BE2CA2E0BD940FB63453B7E78240FDECAA0A9ECFD181080D8FE846760702C2902200FAD663934F55B61BD2D18DA9347D16DE75344C9CFCDF78C43CFFD043843C43C",
    ctid: "C19F9E0F00110000",
    date: 538702680,
    hash: "0CD69FD1F0A890CC57CDA430213FD294F7D65FF4A0F379A0D09D07A222D324E6",
    inLedger: 27237903,
    ledger_index: 27237903,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 17,
      TransactionResult: "tesSUCCESS",
    },
    validated: true,
  },
};
