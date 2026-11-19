// Ouvre un Chrome NORMAL (non piloté) avec le profil du worker, pour te connecter à TikTok tranquillement.
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const profile = path.join(dir, 'browser-profile-chrome');
const candidates = [
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chrome = candidates.find(p => fs.existsSync(p));
if (!chrome) { console.log('Chrome introuvable. Installe Google Chrome puis relance.'); process.exit(1); }

console.log('Chrome s\'ouvre. Connecte-toi à TikTok (code QR conseillé), puis FERME la fenêtre Chrome.');
console.log('Ensuite lance : npm start');
const p = spawn(chrome, [`--user-data-dir=${profile}`, '--no-first-run', 'https://www.tiktok.com/login'], { stdio: 'ignore' });
p.on('exit', () => { console.log('Chrome fermé. Tu peux lancer : npm start'); process.exit(0); });
