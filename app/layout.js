import { Bebas_Neue, Barlow, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Carreira Brasileirão",
  description: "Modo carreira 2D — crie seu jogador e viva o Brasileirão.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} font-body bg-pitch-950 text-chalk antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
