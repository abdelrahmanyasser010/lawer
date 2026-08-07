import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Z draft — لوحة الإدارة",
  description: "لوحة إدارة العقود والمدفوعات والاستشارات في Z draft",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${cairo.className} h-full antialiased`}>
      <body className={`${cairo.className} min-h-full bg-[#f8fafc] text-[#00102e] antialiased`}>
        {children}
      </body>
    </html>
  );
}
