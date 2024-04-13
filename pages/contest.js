import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import SEO from '../components/SEO'

import {
  FaXTwitter,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaTiktok
} from "react-icons/fa6"

import { useWidth } from '../utils'
import { useEffect } from 'react'

export async function getServerSideProps(context) {
  const { locale } = context
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    }
  }
}

export default function Contest() {

  const width = useWidth()

  const iconStyle = { marginBottom: "-2px" }

  const reloadSource = () => {
    //Function to reload the video element with a new source
    if (videoRef) {
      videoRef.load()
    }
  }

  useEffect(() => {
    //Reload the video when the source changes
    reloadSource()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  let videoRef

  return (
    <>
      <SEO
        title="Bithomp contest"
        description="Win 200 XRP by participating in the Bithomp contest."
      />
      <div className="content-text content-center">
        <h1 className='center'>Win 100, 200, or 300 XRP from Bithomp</h1>
        <center>
          <video
            width={width < 760 ? "100%" : "760"}
            height={width < 400 ? width * 1.6 : (width < 760 ? width * 0.5625 : "427,5")}
            controls
            ref={node => { videoRef = node }}
          >
            <source
              src={'/videos/pages/contest/' + (width < 400 ? 'mobile.mp4' : 'desktop.mp4')}
              type="video/mp4"
              preload="none"
            />
          </video>
        </center>
        <p>
          Hi, Friends!
          <br />
          Do you use Bithomp? Do you like contests? Do you want to <b>WIN 100, 200, or 300 XRP</b>?
          <br />
          Let’s do it!
        </p>
        <p>Just three steps:</p>
        <h3>1. Follow us on any of the social networks mentioned below:</h3>
        <p>
          <a href='https://twitter.com/bithomp' target="_blank" rel="noreferrer">
            <FaXTwitter style={iconStyle} /> Twitter
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
        <p>Just share your experience, thoughts and insights from using our services. Tell everyone what you like and which features you use more often. You are welcome to suggest ways we can improve our project and identify any areas you think are missing.</p>
        <h3>3. Tag your post with #BithompContest.</h3>
        <p><b>Deadline is May 10, 2024, 9 GMT.</b></p>
        <p>Please note that your post can be in any format you prefer! Use text, video, image, GIF, or anything else you wish. Feel free to make it funny, serious, thought-provoking, tearful or whatever you wish it to be. However, it must not contain any violations or insults.</p>
        <p>The winners will be chosen by the Bithomp team on <b>May 12, 2024</b> and announced on all the aforementioned social networks at 3 GMT.</p>
        <p>
          We'll pick up <b>THREE winners</b> and they'll get:<br />
          The first place - <b>300 XRP</b><br />
          The second place - <b>200 XRP</b><br />
          The third place - <b>100 XRP</b><br />
        </p>
        <p>We will choose three most interesting and useful posts, also considering the number of likes and reposts they receive during the competition.</p>
        <p>Don't forget to follow and put the <b>#BithompContest</b> tag!</p>
        Let the contest begin! Good luck!
      </div>
    </>
  )
}
