import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'x402-qai - Test x402 Endpoints',
  description:
    'Scan x402 payment endpoints for compliance, discover issues, and verify payment flows before your users do.',
  openGraph: {
    title: 'x402-qai',
    description: 'Test x402 endpoints before your users do.',
    url: 'https://qai.0x402.sh',
    siteName: 'x402-qai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'x402-qai',
    description: 'Test x402 endpoints before your users do.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} font-mono antialiased`}>
        {children}
      </body>
    </html>
  );
}
