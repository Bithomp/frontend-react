import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";

export default function Redirect() {
  const { pathname } = useLocation();

  if (/^\/[~]{0,1}[a-zA-Z0-9-_.]*[+]{0,1}[a-zA-Z0-9-_.]*[$]{0,1}[a-zA-Z0-9-.]*[a-zA-Z0-9]*$/i.test(pathname)) {
    window.location = "/explorer" + encodeURI(pathname);
    return;
  } else {
    return <Navigate to="/error" />
  }

};
