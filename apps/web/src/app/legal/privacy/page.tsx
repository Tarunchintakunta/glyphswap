import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy · Glyphswap" }

export default function Privacy() {
  return (
    <>
      <h1>Privacy policy</h1>
      <p>Last updated 10 November 2026.</p>
      <h2>What we store</h2>
      <ul>
        <li>
          Your account: email, name and a hashed password, or your Google profile if you sign in
          with Google.
        </li>
        <li>Your images and results, deleted automatically 72 hours after upload.</li>
        <li>
          Edit metadata: the text you replaced, boxes and style settings, kept so you can see your
          history.
        </li>
        <li>Your credit ledger and API key usage.</li>
      </ul>
      <h2>What we do not do</h2>
      <p>We do not sell your data, show ads or use your images to train models.</p>
      <h2>Cookies</h2>
      <p>
        We use one session cookie to keep you signed in and local storage to remember your theme.
      </p>
      <h2>Your rights</h2>
      <p>
        You can delete your account at any time, which removes your images, history and credits.
      </p>
    </>
  )
}
