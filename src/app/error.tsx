'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fatal">
      <h1>Let’s reconnect.</h1>
      <p>The dashboard could not load. Please try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
