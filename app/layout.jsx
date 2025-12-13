import { Figtree, Merriweather_Sans, Red_Hat_Mono } from "next/font/google";
import "./globals.css";
import { configure } from '@airstate/client';

export const metadata = {
  title: "Quicc Notes",
  description: "A simple note-taking and drawing app that shares your content with your local network",
};

const font = Red_Hat_Mono({ subsets: ["latin"] });

configure({
    appKey: 'pk_airstate_cXAnMcBjlurI5204rOZUc',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={font.className + ` bg-gradient-to-br from-teal-100/50 via-lime-100/50 to-emerald-100/50`}>
        {children}
      </body>
    </html>
  );
}
