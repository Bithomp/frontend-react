import Mailto from 'react-protected-mailto';

function TermsOfService() {
  return (
    <div className="content-text">
      <h1>Terms of service</h1>
      <p>Last updated: May 10, 2022</p>
      <p><strong>Email:</strong> <Mailto email='privacy@bithomp.com' headers={{ subject: 'Privacy' }} /></p>
    </div >
  );
}

export default TermsOfService;
