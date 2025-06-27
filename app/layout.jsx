import { Figtree, Merriweather_Sans } from "next/font/google";
import "./globals.css";

export const metadata = {
  title: "Quicc Notes",
  description: "A simple note-taking and drawing app that shares your content with your local network",
};

const font = Merriweather_Sans({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={font.className + ` bg-gradient-to-br from-teal-100/50 via-lime-100/50 to-emerald-100/50`}>
        {children}
      </body>
    </html>
  );
}
