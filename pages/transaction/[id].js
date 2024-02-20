import axios from "axios";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useEffect, useState } from "react";

import SearchBlock from "../../components/Layout/SearchBlock";
import SEO from "../../components/SEO";
import { server } from "../../utils";
import { getIsSsrMobile } from "../../utils/mobile";

import {
  TransactionDetails,
  TransactionEscrow,
  TransactionOrder,
  TransactionPayment,
} from "../../components/Transaction";

export async function getServerSideProps(context) {
  const { locale, query, req } = context;
  let txData = null;
  const { id } = query;

  let headers = {};
  if (req.headers["x-real-ip"]) {
    headers["x-real-ip"] = req.headers["x-real-ip"];
  }
  if (req.headers["x-forwarded-for"]) {
    headers["x-forwarded-for"] = req.headers["x-forwarded-for"];
  }
  try {
    const res = await axios({
      method: "get",
      url: server + "/api/cors/v2/transaction/" + id,
      headers,
    });
    txData = res?.data;
    txData.rawTransaction = JSON.parse(txData.rawTransaction);
  } catch (error) {
    console.error(error);
  }

  return {
    props: {
      id,
      isSsrMobile: getIsSsrMobile(context),
      txData,
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
}

const Container = ({ children }) => {
  return (
    <div className="content-center short-top">
      {children}
    </div>
  );
};

export default function Transaction(
  { id, txData },
) {
  const { t } = useTranslation();
  console.log(txData);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  let TransactionComponent = null;
  switch (txData?.type) {
    case "escrowCreation" || "escrowExecution" || "escrowCancelation":
      TransactionComponent = TransactionEscrow;
      break;
    case "order":
      TransactionComponent = TransactionOrder;
      break;
    case "payment":
      TransactionComponent = TransactionPayment;
      break;
    default:
      TransactionComponent = TransactionDetails;
  }

  return (
    <>
      <SEO
        page="Transaction"
        title={t("explorer.header.transaction") + " " +
          (txData?.service?.name || txData?.username || txData?.address || id)}
        description={"Transaction details, transactions, NFTs, Tokens for " +
          (txData?.service?.name || txData?.username) + " " +
          (txData?.address || id)}
      />
      <SearchBlock tab="transaction" />
      {isClient &&
        (
          <Container>
            <TransactionComponent tx={txData} />
          </Container>
        )}
    </>
  );
}
