import { TransactionEscrow } from "./TransactionEscrow";

export default {
  component: TransactionEscrow,
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: "760px" }}>
        <Story />
      </div>
    ),
  ],
};

export const EscrowCreation = {
  render: () => <TransactionEscrow tx={txEscrowCreation} />,
};

export const EscrowExecution = {
  render: () => <TransactionEscrow tx={txEscrowExecution} />,
};

export const EscrowCancelation = {
  render: () => <TransactionEscrow tx={txEscrowCancelation} />,
};

const txEscrowCreation = {
  type: "escrowCreation",
  address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
  sequence: 366,
  id: "C44F2EB84196B9AD820313DBEBA6316A15C9A2D35787579ED172B87A30131DA7",
  specification: {
    amount: "10000",
    source: { address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn", tag: 11747 },
    destination: { address: "ra5nK24KXen9AHvsdFTKHSANinZseWnPcX", tag: 23480 },
    condition:
      "A0258020A82A88B2DF843A54F58772E4A3861866ECDB4157645DD9AE528C1D3AEEDABAB6810120",
    allowCancelAfter: "2017-04-13T23:10:32.000Z",
    allowExecuteAfter: "2017-04-12T23:15:32.000Z",
  },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2017-04-12T23:12:20.000Z",
    fee: "0.00001",
    balanceChanges: { rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn: [Array] },
    escrowChanges: {
      status: "created",
      escrowIndex:
        "DC5F3851D8A1AB622F957761E5963BC5BD439D5C24AC6AD7AC4523F0640244AC",
      escrowSequence: 366,
      amount: "10000",
      condition:
        "A0258020A82A88B2DF843A54F58772E4A3861866ECDB4157645DD9AE528C1D3AEEDABAB6810120",
      source: [Object],
      destination: [Object],
      allowCancelAfter: "2017-04-13T23:10:32.000Z",
      allowExecuteAfter: "2017-04-12T23:15:32.000Z",
      previousTxnID:
        "C44F2EB84196B9AD820313DBEBA6316A15C9A2D35787579ED172B87A30131DA7",
      previousTxnLgrSeq: 28991004,
    },
    ledgerVersion: 28991004,
    indexInLedger: 8,
  },
  rawTransaction: {
    Account: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    Amount: "10000",
    CancelAfter: 545440232,
    Condition:
      "A0258020A82A88B2DF843A54F58772E4A3861866ECDB4157645DD9AE528C1D3AEEDABAB6810120",
    Destination: "ra5nK24KXen9AHvsdFTKHSANinZseWnPcX",
    DestinationTag: 23480,
    Fee: "10",
    FinishAfter: 545354132,
    Flags: 2147483648,
    Sequence: 366,
    SigningPubKey:
      "03AB40A0490F9B7ED8DF29D246BF2D6269820A0EE7742ACDD457BEA7C7D0931EDB",
    SourceTag: 11747,
    TransactionType: "EscrowCreate",
    TxnSignature:
      "3044022073AE316EC2538F605D13FA13676F34EF6540095A3ECFB16370950F761C0B63060220435F5C7A3B80AE012208062160EFA5D713B53A67B15B7B9A61627388C08047FD",
    ctid: "C1BA5E1C00080000",
    date: 545353940,
    hash: "C44F2EB84196B9AD820313DBEBA6316A15C9A2D35787579ED172B87A30131DA7",
    inLedger: 28991004,
    ledger_index: 28991004,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 8,
      TransactionResult: "tesSUCCESS",
    },
    validated: true,
  },
};

const txEscrowExecution = {
  type: "escrowExecution",
  address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
  sequence: 373,
  id: "317081AF188CDD4DBE55C418F41A90EC3B959CDB3B76105E0CBE6B7A0F56C5F7",
  specification: {
    source: { address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn" },
    owner: "rKDvgGUsNPZxsgmoemfrgXPS2Not4co2op",
    escrowSequence: 7,
  },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2017-12-12T00:59:52.000Z",
    fee: "0.005",
    balanceChanges: {
      rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn: [
        {
          currency: "XRP",
          value: "-0.005",
        },
      ],
      rKDvgGUsNPZxsgmoemfrgXPS2Not4co2op: [
        {
          currency: "XRP",
          value: "1000000000",
        },
      ],
    },
    escrowChanges: {
      status: "executed",
      escrowIndex:
        "AC07C32AD0908E2C65343184E57FA4DEC55E629F7D43ED52751DA1C0D4E58245",
      escrowSequence: 7,
      amount: "1000000000000000",
      source: [Object],
      destination: [Object],
      allowCancelAfter: "2019-11-01T00:00:00.000Z",
      previousTxnID:
        "C381E33F9659F22F17DAE537F490F2FABB62C33D4569C5620845572E5F5FEDC5",
      previousTxnLgrSeq: 34854213,
    },
    ledgerVersion: 34957750,
    indexInLedger: 36,
  },
  rawTransaction: {
    Account: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    Fee: "5000",
    Flags: 2147483648,
    OfferSequence: 7,
    Owner: "rKDvgGUsNPZxsgmoemfrgXPS2Not4co2op",
    Sequence: 373,
    SigningPubKey:
      "03AB40A0490F9B7ED8DF29D246BF2D6269820A0EE7742ACDD457BEA7C7D0931EDB",
    TransactionType: "EscrowFinish",
    TxnSignature:
      "3045022100A300444B7004705CC1C0F90FD19265A9E8B2B57B1679985686711CC3DC9DFFBF02205EDA9821583CF0B0E37AB5509D7F9B0048E7A5628C109B211CBD405925A39D8D",
    ctid: "C21569B600240000",
    date: 566355592,
    hash: "317081AF188CDD4DBE55C418F41A90EC3B959CDB3B76105E0CBE6B7A0F56C5F7",
    inLedger: 34957750,
    ledger_index: 34957750,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 36,
      TransactionResult: "tesSUCCESS",
    },
    validated: true,
  },
};

const txEscrowCancelation = {
  type: "escrowCancellation",
  address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
  sequence: 368,
  id: "B24B9D7843F99AED7FB8A3929151D0CCF656459AE40178B77C9D44CED64E839B",
  specification: {
    source: { address: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn" },
    owner: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    escrowSequence: 366,
  },
  outcome: {
    result: "tesSUCCESS",
    timestamp: "2017-04-21T02:11:30.000Z",
    fee: "0.000012",
    balanceChanges: {
      rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn: [
        {
          currency: "XRP",
          value: "0.009988",
        },
      ],
    },
    escrowChanges: {
      status: "cancelled",
      escrowIndex:
        "DC5F3851D8A1AB622F957761E5963BC5BD439D5C24AC6AD7AC4523F0640244AC",
      escrowSequence: 366,
      amount: "10000",
      condition:
        "A0258020A82A88B2DF843A54F58772E4A3861866ECDB4157645DD9AE528C1D3AEEDABAB6810120",
      source: [Object],
      destination: [Object],
      allowCancelAfter: "2017-04-13T23:10:32.000Z",
      allowExecuteAfter: "2017-04-12T23:15:32.000Z",
      previousTxnID:
        "C44F2EB84196B9AD820313DBEBA6316A15C9A2D35787579ED172B87A30131DA7",
      previousTxnLgrSeq: 28991004,
    },
    ledgerVersion: 29187944,
    indexInLedger: 0,
  },
  rawTransaction: {
    Account: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    Fee: "12",
    Flags: 2147483648,
    LastLedgerSequence: 29187947,
    OfferSequence: 366,
    Owner: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    Sequence: 368,
    SigningPubKey:
      "03AB40A0490F9B7ED8DF29D246BF2D6269820A0EE7742ACDD457BEA7C7D0931EDB",
    TransactionType: "EscrowCancel",
    TxnSignature:
      "30450221008B0C54DDE49AD439C1E044201B18C8EEE16A4D968F1CF3EF57221570AE6E12C302205C252C51FC1AB8B0CD787C3AAD9ADA32E903E37EE7DFA6D99CB21A64DA7E1DEB",
    ctid: "C1BD5F6800000000",
    date: 546055890,
    hash: "B24B9D7843F99AED7FB8A3929151D0CCF656459AE40178B77C9D44CED64E839B",
    inLedger: 29187944,
    ledger_index: 29187944,
    meta: {
      AffectedNodes: [Array],
      TransactionIndex: 0,
      TransactionResult: "tesSUCCESS",
    },
    validated: true,
  },
};
