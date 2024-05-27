import { serverSideTranslations } from "next-i18next/serverSideTranslations"

import SearchBlock from "../../components/Layout/SearchBlock"
import SEO from "../../components/SEO"
import { useWidth } from "../../utils"
import { getIsSsrMobile } from "../../utils/mobile"

export async function getServerSideProps(context) {
  return {
    props: {
      isSsrMobile: getIsSsrMobile(context),
      ...(await serverSideTranslations(context.locale, ["common"])),
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

const AmmSearch = () => {
  const width = useWidth()
  return (
    <>
      <SEO
        page="AMM pool details"
        title="AMM pool details"
        description="Automated market maker pool information search"
      />
      <SearchBlock
        tab="amm"
        searchPlaceholderText={width > 600 ?
          "Search by AMM ID, Liquidity Pool (LP) token, AMM owner address"
          :
          "AMM ID, LP token or AMM address"
        }
      />
      <Container>
        <h1 className='center'>Automated market maker pool information search</h1>
        <p className='center'>Dive into the world of Autmated Market Maker (AMM) pools. Get access to up-to-date AMM pool information. Search by AMM ID, Liquidity Pool (LP) token, AMM owner address.</p>
      </Container>
    </>
  );
};

export default AmmSearch
