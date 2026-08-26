import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "REVIVE — Revenue Intelligence & Verification Engine",
  description: "Autonomous revenue recovery control plane. Detect revenue at risk, investigate with AI, simulate interventions, and prove actual money recovered.",
};

/**
 * Root layout — conditionally wraps children with ClerkProvider
 * only when Clerk credentials are available.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isClerkConfigured = !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );

  let content = children;

  if (isClerkConfigured) {
    const { ClerkProvider } = await import('@clerk/nextjs');
    content = <ClerkProvider>{children}</ClerkProvider>;
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {content}
      </body>
    </html>
  );
}
