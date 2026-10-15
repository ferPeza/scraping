import "./globals.css";

export const metadata = { title: "Negocios de Monclova" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <nav className="tabs">
          <a href="/" className="tab">Negocios</a>
          <a href="/webs" className="tab">Webs</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
