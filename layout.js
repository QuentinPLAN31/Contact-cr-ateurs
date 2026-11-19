import './globals.css';
import Nav from '@/components/Nav';

export const metadata = { title: 'CreatorFlow', description: 'Trouve et contacte des créateurs pour ton SaaS' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="lime">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Unbounded:wght@700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
