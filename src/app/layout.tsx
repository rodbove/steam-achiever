import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Achiever — Steam achievement hunting log',
  description: 'Find the easiest achievements in your Steam library.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
