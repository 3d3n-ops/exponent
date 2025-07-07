import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import ErrorBoundary from '../components/ErrorBoundary';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exponent - ML Platform",
  description: "No setup. No notebooks. Just prompt AI, run it in the cloud, and deploy it anywhere.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_API_URL || 'https://exponent-backend.onrender.com'),
  openGraph: {
    title: "Exponent - ML Platform",
    description: "No setup. No notebooks. Just prompt AI, run it in the cloud, and deploy it anywhere.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
