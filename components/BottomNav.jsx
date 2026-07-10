"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Flame, Coins, Newspaper } from "lucide-react";

const ITEMS = [
  { href: "/career", label: "HOME", Icon: Home },
  { href: "/elenco", label: "ELENCO", Icon: Users },
  { href: "/treino", label: "TREINO", Icon: Flame },
  { href: "/mercado", label: "MERCADO", Icon: Coins },
  { href: "/noticias", label: "NOTÍCIAS", Icon: Newspaper },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bottom-nav z-20">
      <div className="max-w-md mx-auto grid grid-cols-5 py-2.5">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
