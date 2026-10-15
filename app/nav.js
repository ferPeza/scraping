"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", texto: "Negocios" },
  { href: "/webs", texto: "Webs" },
];

export default function Nav() {
  const ruta = usePathname();
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={ruta === t.href ? "tab activa" : "tab"}>
          {t.texto}
        </Link>
      ))}
    </nav>
  );
}
