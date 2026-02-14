import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google"; // Import fonts
import "./globals.css";
import { TimerOverlay } from "@/components/Timer";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "JustTheFood",
  description: "Recipe manager with cooking timers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${roboto.variable} font-sans antialiased`}>
        {children}
        <TimerOverlay />
      </body>
    </html>
  );
}
