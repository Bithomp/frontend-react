import twitter from "../assets/images/twitter.svg";
import youtube from "../assets/images/youtube.svg";
import instagram from "../assets/images/instagram.svg";
import reddit from "../assets/images/reddit.svg";
import github from "../assets/images/github.svg";

export default function SocialIcons() {
  return (
    <>
      <a href="https://twitter.com/bithomp"><img src={twitter} className="footer-social-icon" alt="twitter" /></a>
      <a href="https://www.youtube.com/channel/UCTvrMnG-Tpqi5FN9zO7GcWw"><img src={youtube} className="footer-social-icon" alt="youtube" /></a>
      <a href="https://www.instagram.com/bithomp/"><img src={instagram} className="footer-social-icon" alt="instagram" /></a>
      <a href="https://www.reddit.com/user/bithomp/"><img src={reddit} className="footer-social-icon" alt="reddit" /></a>
      <a href="https://github.com/Bithomp"><img src={github} className="footer-social-icon" alt="github" /></a>
    </>
  );
};
