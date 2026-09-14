import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Dublajer.ioi",
  description: "Arkadaşlarınla efsane sahneleri yeniden seslendir!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Adsterra Social Bar */}
        <script src="https://pl31327206.profitableratecpmnetwork.com/a9/f1/d0/a9f1d0e61194d37f439a2fe68b8b9f6c.js" async></script>
      </body>
    </html>
  );
}
