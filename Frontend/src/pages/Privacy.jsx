import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { CONTACT_EMAIL } from '../config/site'

const SECTIONS = [
  {
    id: 'collect',
    title: 'What we collect',
    body: (
      <>
        <h3>Your account</h3>
        <p>
          When you sign up, we ask for your name, your email address and a password. Your password
          is stored in a form that can’t be turned back into the original, so we never know what it
          is. We use your email address to sign you in and to send you a link if you forget your
          password.
        </p>
        <h3>Games you upload</h3>
        <p>
          When you upload a game, we keep the game file, the title and description you give it, and
          the cover image if you add one. Cover images are resaved when you upload them, which
          removes extra details such as where a photo was taken.
        </p>
        <h3>Your saves</h3>
        <p>
          When you play while signed in, your progress in each game is saved to your account, so you
          can carry on from any device.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <p>
        We use a single cookie, to keep you signed in. It’s removed when you sign out. We don’t use
        cookies for advertising or to follow you around the web.
      </p>
    ),
  },
  {
    id: 'browser',
    title: 'What’s saved in your browser',
    body: (
      <>
        <p>
          Your settings, such as light or dark mode, sound, screen colours and the on-screen
          buttons, are saved in your browser and never sent to us.
        </p>
        <p>
          If you play without an account, your progress is saved in your browser too. It stays on
          that device only, and clearing your browser data deletes it.
        </p>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How we use your information',
    body: (
      <>
        <p>
          We only use your information to run PixelPocket: to sign you in, show you your games and
          keep your progress.
        </p>
        <p>
          To protect the site from abuse, such as someone trying to guess a password, we keep a
          short-term count of requests from each internet address. It isn’t linked to your account
          and is cleared after a short time.
        </p>
        <p>
          We don’t show ads, we don’t use analytics or tracking tools, and we never sell your
          information.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who can see it',
    body: (
      <>
        <p>
          The games you upload and your saves are private. Other players can’t see them, and neither
          can PixelPocket’s admins.
        </p>
        <p>
          Games in the library are added by our team, and anyone can play them. Your name is never
          shown to other players.
        </p>
        <p>
          We use an email service to send password reset emails. It receives your email address for
          that purpose only.
        </p>
      </>
    ),
  },
  {
    id: 'keeping',
    title: 'How long we keep it',
    body: (
      <>
        <p>We keep your information for as long as you have an account.</p>
        <ul>
          <li>When you delete a game, the game and its saves are deleted.</li>
          <li>
            When you delete your account, your account, your uploaded games and all of your saves
            are permanently deleted.
          </li>
          <li>Password reset links stop working after 10 minutes.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'choices',
    title: 'Your choices',
    body: (
      <>
        <p>
          On your <Link to="/account">account page</Link> you can change your name and password, or
          delete your account. You can delete any game you uploaded from{' '}
          <Link to="/my-games">My games</Link>.
        </p>
        <p>
          If you’d like to know what information we hold about you, or want us to delete something,{' '}
          <a href="#contact">contact us</a>.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about your privacy or this policy? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we’ll get back to you.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we change this policy, we’ll update this page and the date at the top.</p>,
  },
]

function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="10 October 2026"
      lead={
        <>
          This policy explains what PixelPocket collects when you use it, why we need it, and what
          you can do about it. If anything is unclear, <a href="#contact">get in touch</a>.
        </>
      }
      sections={SECTIONS}
    />
  )
}

export default Privacy
