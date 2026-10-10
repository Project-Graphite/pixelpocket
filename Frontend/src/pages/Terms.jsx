import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage'
import { CONTACT_EMAIL } from '../config/site'

const SECTIONS = [
  {
    id: 'using',
    title: 'Using PixelPocket',
    body: (
      <p>
        PixelPocket lets you play Game Boy games in your browser, from our library or from game
        files you upload yourself. You can play library games without an account. To upload games or
        keep your progress across devices, you need an account.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account',
    body: (
      <ul>
        <li>Use your own name and an email address you can access.</li>
        <li>
          Keep your password to yourself. You’re responsible for what happens on your account.
        </li>
        <li>Don’t sign in to anyone else’s account.</li>
      </ul>
    ),
  },
  {
    id: 'uploads',
    title: 'Games you upload',
    body: (
      <>
        <p>
          Only upload games you own or have the right to use, such as a copy of a cartridge you own
          or a homebrew game whose creator lets you share it. Don’t upload games you got from
          sources you don’t have permission to use.
        </p>
        <p>
          The same goes for cover images: use pictures you’re allowed to use, and nothing offensive.
        </p>
        <p>
          Your uploads stay yours. By uploading them, you let us store them and show them to you so
          you can play them on PixelPocket. Nobody else can see or play them, and you can delete
          them at any time from <Link to="/my-games">My games</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'library',
    title: 'Games in the library',
    body: (
      <p>
        Library games belong to their creators. You’re welcome to play them here, but that doesn’t
        give you any other rights to them, such as copying them or sharing them elsewhere.
      </p>
    ),
  },
  {
    id: 'rules',
    title: 'Ground rules',
    body: (
      <>
        <p>When you use PixelPocket, please don’t:</p>
        <ul>
          <li>upload anything harmful, such as files designed to damage devices or the site;</li>
          <li>try to get into other people’s accounts, games or saves;</li>
          <li>try to get around our limits or security, or overload the site;</li>
          <li>use automated tools to copy the library or flood the site with requests.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'saves',
    title: 'Your saves',
    body: (
      <p>
        We do our best to keep your saves safe, but we can’t promise they’ll never be lost. If you
        play without an account, your progress lives only in your browser, so clearing your browser
        data deletes it.
      </p>
    ),
  },
  {
    id: 'removal',
    title: 'Removing content and accounts',
    body: (
      <>
        <p>
          We may remove games or covers, or close accounts, that break these terms. If you think a
          game on PixelPocket uses your work without permission, <a href="#contact">tell us</a> and
          we’ll look into it and take it down if it shouldn’t be there.
        </p>
        <p>
          You can delete your account at any time from your <Link to="/account">account page</Link>.
          This permanently deletes your account, your uploaded games and your saves.
        </p>
      </>
    ),
  },
  {
    id: 'as-is',
    title: 'No guarantees',
    body: (
      <p>
        We work hard to keep PixelPocket running smoothly, but we can’t promise it will always be
        available or free of bugs. We may change features, or stop offering the service, at any
        time. As far as the law allows, we aren’t responsible for losses caused by using PixelPocket
        or by not being able to use it.
      </p>
    ),
  },
  {
    id: 'nintendo',
    title: 'Nintendo',
    body: (
      <p>
        Game Boy is a trademark of Nintendo. PixelPocket isn’t made by, affiliated with or endorsed
        by Nintendo.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        If we change these terms, we’ll update this page and the date at the top. If you keep using
        PixelPocket after that, the new terms apply.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p>
        Questions about these terms? Email us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
]

function Terms() {
  return (
    <LegalPage
      title="Terms of service"
      updated="10 October 2026"
      lead={
        <>
          These terms explain the rules for using PixelPocket. By using the site, you agree to them.
          How we handle your information is covered in our <Link to="/privacy">privacy policy</Link>
          .
        </>
      }
      sections={SECTIONS}
    />
  )
}

export default Terms
