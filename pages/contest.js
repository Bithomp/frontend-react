import SEO from '../components/SEO'
import Image from 'next/image'
import {
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaTiktok
} from "react-icons/fa6"

export default function Contest() {

  const iconStyle = { marginBottom: "-2px" }

  return (
    <>
      <SEO
        title="Bithomp contest"
        description="Win 200 XRP by participating in the Bithomp contest."
      />
      <div className="content-text content-center">
        <h1 className='center'>Win 200 XRP from Bithomp</h1>
        <center>
          <Image src="/images/pages/contest/contest.png" alt="Bithomp contest" width={400} height={225} />
        </center>
        <p>
          <center>Hi, Friends!</center>
          <br />
          Do you use Bithomp? Do you like contests? Do you want to <b>WIN 200 XRP?</b>
          <br />
          Let’s do it!
        </p>
        <p>Just three steps:</p>
        <h3>1. Follow us and tag us on any of the social networks mentioned below:</h3>
        <p>
          <a href='https://twitter.com/bithomp' target="_blank" rel="noreferrer">
            <FaTwitter style={iconStyle} /> Twitter
          </a>
        </p>
        <p>
          <a href='https://www.instagram.com/bithomp/' target="_blank" rel="noreferrer">
            <FaInstagram style={iconStyle} /> Instagram
          </a>
        </p>
        <p>
          <a href='https://www.tiktok.com/@bithomp' target="_blank" rel="noreferrer">
            <FaTiktok style={iconStyle} /> TikTok
          </a>
        </p>
        <p>
          <a href='https://www.linkedin.com/company/bithomp' target="_blank" rel="noreferrer">
            <FaLinkedinIn style={iconStyle} /> LinkedIn
          </a>
        </p>
        <p>
          <a href='https://www.youtube.com/@bithomp' target="_blank" rel="noreferrer">
            <FaYoutube style={iconStyle} /> YouTube
          </a>
        </p>
        <h3>2. Create the post “How I use Bithomp”.</h3>
        Just share your experience, thoughts and insights from using our services. Tell everyone what you like and which features you use more often.
        <p>You are welcome to suggest ways we can improve our project and identify any areas you think are missing.</p>
        <h3>3. Tag your post with #BithompContest.</h3>
        <p><b>Deadline is May 10, 2024, 9 GMT.</b></p>
        <p>Please note, your post can be in any format you prefer, such as text, video, image, GIF, or any other.
          Feel free to make it funny, serious, thought-provoking, tearful or whatever you wish it to be. However, it must not contain any violations or insults.</p>
        <p><b>The winner will be chosen by the Bithomp team on May 12, 2024 and announced on all the aforementioned social networks at 3 GMT.</b></p>
        <p>We will choose the most interesting and useful post, also considering the number of likes and reposts it receives during the competition.</p>
        <p>Don't forget to follow, tag us and put the <b>#BithompContest</b> tag!</p>
        Let the contest begin! Good luck!
      </div>
    </>
  )
}
