import type { Metadata } from "next";
import { Inter, Noto_Sans_Arabic } from "next/font/google";
import { GovernorateOnboarding } from "@/components/profile/governorate-onboarding";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "دليل التوجيه الجامعي",
  description: "استشارة معدلات التوجيه الجامعي في تونس",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${inter.variable} ${notoArabic.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        {children}
        <GovernorateOnboarding />
      </body>
    </html>
  );
}
