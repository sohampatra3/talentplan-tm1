'use client';
import { useEffect, useState } from 'react';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const [de, setDe] = useState(false);
  useEffect(() => {
    try {
      setDe(localStorage.getItem('talentplan-language') === 'de');
    } catch {}
  }, []);
  return (
    <main className="fatal">
      <h1>{de ? 'Erneut verbinden.' : 'Let’s reconnect.'}</h1>
      <p>
        {de
          ? 'Das Dashboard konnte nicht geladen werden. Bitte erneut versuchen.'
          : 'The dashboard could not load. Please try again.'}
      </p>
      <button className="primary" onClick={reset}>
        {de ? 'Erneut versuchen' : 'Try again'}
      </button>
    </main>
  );
}
