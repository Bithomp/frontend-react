import { useLocation } from "react-router-dom";

export default function Redirect() {
  const { pathname } = useLocation();

  if (/^\/[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i.test(pathname)) {
    window.location = "/explorer" + encodeURI(pathname);
    return;
  }

  return (
    <div className="content-text center">
      <h1>The requested page wasn't found.</h1>
      <p>
        Click <a href="/"><b>here</b></a> to check our landing page.
      </p>
    </div>
  );
};
