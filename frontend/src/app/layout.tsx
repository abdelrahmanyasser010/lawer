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
  title: "Z draft – إعداد العقود والخدمات القانونية",
  description:
    "أنشئ عقدك بنفسك أو اطلب من مكتب المحاماة إعداد عقد أو مراجعة مستند أو تقديم استشارة قانونية.",
  keywords: ["عقود قانونية", "عقد إيجار", "عقد بيع شقة", "استشارة قانونية", "Z draft", "عقد عمل حر"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${cairo.className} h-full antialiased`}>
      <body className={`${cairo.className} min-h-full flex flex-col bg-[#ffffff] text-[#00102e] antialiased selection:bg-[#986410]/20 selection:text-[#00102e]`} style={{ fontFamily: "Cairo, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
