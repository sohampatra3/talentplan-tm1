import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'TalentPlan · Finance, in focus',
  description:
    'TM1-ready financial planning and workforce analytics. An independent interview proof of concept with clearly labelled synthetic data.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
