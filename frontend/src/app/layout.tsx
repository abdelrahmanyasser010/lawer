import type { Metadata } from "next";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "./globals.css";
import FloatingSupportButton from "@/components/support/FloatingSupportButton";

export const metadata: Metadata = {
  title: "Z draft – إعداد العقود والخدمات القانونية",
  description:
    "أنشئ عقدك بنفسك أو اطلب استشارة قانونية من المكتب وارفق المستندات المرتبطة بها.",
  keywords: ["عقود قانونية", "عقد إيجار", "عقد بيع شقة", "استشارة قانونية", "Z draft", "عقد عمل حر"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#ffffff] text-[#00102e] antialiased selection:bg-[#986410]/20 selection:text-[#00102e]" style={{ fontFamily: "Cairo, sans-serif" }}>
        {children}
        <FloatingSupportButton />
      </body>
    </html>
  );
}
