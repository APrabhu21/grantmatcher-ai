import type { Metadata } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/SessionProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrantMatcherAI - Find Grants That Match Your Mission",
  description: "AI-powered grant matching for nonprofits, researchers, and startups. Get personalized grant recommendations based on your mission and focus areas.",
  keywords: "grants, nonprofit, funding, AI, matching, federal grants, research grants",
  authors: [{ name: "GrantMatcherAI" }],
  openGraph: {
    title: "GrantMatcherAI - Find Grants That Match Your Mission",
    description: "AI-powered grant matching for nonprofits, researchers, and startups.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
