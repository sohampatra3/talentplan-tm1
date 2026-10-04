import type { Metadata } from 'next';
import './globals.css';
import { appearanceInitScript } from '@/lib/appearance';
export const metadata: Metadata = {
  title: 'TalentPlan · Finance, in focus',
  description:
    'Financial planning, workforce analytics and AI-assisted visual analysis with configurable IBM Planning Analytics REST and MCP connections.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-palette="sage"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
