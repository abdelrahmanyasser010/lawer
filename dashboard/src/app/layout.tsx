import type { Metadata } from "next";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Z draft — لوحة الإدارة",
  description: "لوحة إدارة العقود ومراجعات العقود والمدفوعات في Z draft",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full bg-[#f8fafc] text-[#00102e] antialiased">
        {children}
      </body>
    </html>
  );
}
