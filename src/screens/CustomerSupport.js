import Mailto from 'react-protected-mailto';

import SocialIcons from '../components/SocialIcons';

export default function Contact() {
  return (
    <div className="content-text">
      <h1>Customer support</h1>
      <p>Bithomp is an explorer of the <u>public</u> XRP Ledger.</p>
      <p>
        We can not freeze accounts, make refunds, cancel transactions or change/add destination tags.
        We do not do investigations and we can not help you to recover your lost or stolen funds.
      </p>
      <ol>
        <li>If you funds were stolen or if you became a victim of fraud/scam you can report it <a href="https://xrplorer.com/forensics/help">here</a>.</li>
        <li>If your transactions has a status "failed" but your funds were taking from your balance then contact the service / wallet / exchange which you used to make this transaction.</li>
        <li>If your transaction has a status "success" but it wasn't received then contact the receipient's wallet / service / exchange support.</li>
        <li>If you sent a transaction without a destination tag or with a wrong destination tag then read (2) and (3) above.</li>
        <li>If you're missing 10 XRP in your wallet, please read about the <a href="https://xrpl.org/reserves.html">"base reserve"</a>.</li>
        <li>If you want to send XRP from a paper wallet, you need to import it to a software wallet first, you can use XUMM mobile app for that (import secret as a "family seed").</li>
        <li>If you have a question about "Flare" you need to address it to the Flare community.</li>
        <li>If you have a <b>partnership or marketing</b> proposals then you can contact us by email: <Mailto email='support@bithomp.com' headers={{ subject: 'Bithomp contact page' }} />. You can also contact us with questions about the bithomp username registration or bithomp transaction explorer.</li>
      </ol>
      <p>Due to our limited time we do not answer to emails related to 1-7.</p>
      <h2>Submit information about your XRPL service</h2>
      <p>If you have a public XRPL service and you want your XRP addresses to be recognised on Bithomp submit your information <a href="https://bithomp.com/explorer/submit.html">here</a>.</p>

      <h2>Follow us on social media</h2>
      <SocialIcons />
    </div>
  );
};
