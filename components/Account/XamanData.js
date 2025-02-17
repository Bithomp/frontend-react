export default function XamanData({ data }) {
  if (!(data?.xamanMeta?.xummPro || data.xamanMeta?.kycApproved || data.xamanMeta?.globalid?.profileUrl)) return ''

  const proStatusNode = (
    <>
      {data?.xamanMeta?.xummProfile?.slug ? (
        <a href={data.xamanMeta.xummProfile.profileUrl} className="green">
          {data.xamanMeta.xummProfile.slug}
        </a>
      ) : (
        <span className="bold">activated</span>
      )}
      {/* need to hide the add for 2 hours after click (1hour our cache + 1 hour xppl-labs cache) */}
      {data.xamanMeta?.monetisation?.status === 'PAYMENT_REQUIRED' && (
        <span className="orange">
          <br />
          Limited 😔
        </span>
      )}
      {data.xamanMeta?.monetisation?.status === 'COMING_UP' && (
        <span className="orange">
          <br />
          Soon limited 😔
        </span>
      )}
      {(data.xamanMeta?.monetisation?.status === 'COMING_UP' ||
        data.xamanMeta?.monetisation?.status === 'PAYMENT_REQUIRED') && (
        <>
          <br />
          <a href="https://xrpl-labs.com/pro/get?v=BITHOMP" target="_blank" rel="noopener nofollow">
            Purchase Xaman Pro
          </a>{' '}
          ❤️
        </>
      )}
    </>
  )

  const globalidNode = data.xamanMeta?.globalid?.profileUrl ? (
    <>
      <a href={data.xamanMeta.globalid.profileUrl}>
        <u className="bold green">{data.xamanMeta.globalid.profileUrl.replace('https://app.global.id/u/', '')}</u>
      </a>{' '}
      <a href={data.xamanMeta.globalid.profileUrl}>
        <span className="bold green">
          <i className="fa fa-globe"></i>
        </span>
      </a>
    </>
  ) : (
    ''
  )

  return (
    <>
      <table className="table-details hide-on-small-w800">
        <thead>
          <tr>
            <th colSpan="100">Xaman data</th>
          </tr>
        </thead>
        <tbody>
          {data.xamanMeta?.xummPro && (
            <>
              <tr>
                <td>Pro</td>
                <td>{proStatusNode}</td>
              </tr>
              {data.xamanMeta?.xummProfile?.ownerAlias && (
                <tr>
                  <td>Owner alias</td>
                  <td>{data.xamanMeta?.xummProfile?.ownerAlias}</td>
                </tr>
              )}
              {data.xamanMeta?.xummProfile?.accountAlias && (
                <tr>
                  <td>Account alias</td>
                  <td>{data.xamanMeta?.xummProfile?.accountAlias}</td>
                </tr>
              )}
            </>
          )}

          {data.xamanMeta?.kycApproved && (
            <tr>
              <td>KYC</td>
              <td className="green">verified</td>
            </tr>
          )}

          {data.xamanMeta?.globalid?.profileUrl && (
            <tr>
              <td>GlobaliD</td>
              <td>{globalidNode}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="show-on-small-w800">
        <br />
        <center>{'Xaman data'.toUpperCase()}</center>
        {data.xamanMeta?.xummPro && (
          <>
            <p>
              <span className="grey">Pro</span> {proStatusNode}
            </p>
            {data.xamanMeta?.xummProfile?.ownerAlias && (
              <p>
                <span className="grey">Owner alias</span> {data.xamanMeta?.xummProfile?.ownerAlias}
              </p>
            )}
            {data.xamanMeta?.xummProfile?.accountAlias && (
              <p>
                <span className="grey">Account alias</span> {data.xamanMeta?.xummProfile?.accountAlias}
              </p>
            )}
          </>
        )}
        {data.xamanMeta?.kycApproved && (
          <p>
            <span className="grey">KYC</span> <span className="green">verified</span>
          </p>
        )}
        {data.xamanMeta?.globalid?.profileUrl && (
          <p>
            <span className="grey">GlobaliD</span> {globalidNode}
          </p>
        )}
      </div>
    </>
  )
}
