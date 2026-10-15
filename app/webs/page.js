import "./globals.css";
import Nav from "./nav";

export const metadata = { title: "Negocios de Monclova" };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
