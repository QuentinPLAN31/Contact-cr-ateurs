'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const LINKS = [['/', 'Pipeline'], ['/creators', 'Créateurs'], ['/sequence', 'Séquence'], ['/scraper', 'Collecte'], ['/settings', 'Réglages']];
const THEMES = { lime: '#d7f22c', violet: '#8b6cff', orange: '#ff7a1a', light: '#2f5bff' };

export default function Nav() {
  const path = usePathname();
  const [theme, setTheme] = useState('lime');
  useEffect(() => {
    const t = localStorage.getItem('cf-theme') || 'lime';
    setTheme(t); document.documentElement.dataset.theme = t;
  }, []);
  const pick = t => { setTheme(t); localStorage.setItem('cf-theme', t); document.documentElement.dataset.theme = t; };
  const logout = async () => { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/login'; };
  if (path === '/login') return null;
  return (
    <header className="top">
      <Link href="/" className="logo">Creator<span>Flow</span></Link>
      <nav>{LINKS.map(([h, l]) => <Link key={h} href={h} className={path === h ? 'on' : ''}>{l}</Link>)}</nav>
      <div className="themes">
        {Object.entries(THEMES).map(([t, c]) => <button key={t} className={'dot' + (theme === t ? ' on' : '')} style={{ background: c }} onClick={() => pick(t)} aria-label={t} />)}
        <button className="btn ghost sm" onClick={logout}>Quitter</button>
      </div>
    </header>
  );
}
