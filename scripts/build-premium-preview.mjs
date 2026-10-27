// Prémium előnézet + szintszámok frissítése.
//
// Futtatás a repó gyökeréből:   node scripts/build-premium-preview.mjs
//
// Mit csinál?
//  1. Beolvassa a data/premium/*.js fájlokat (a teljes prémium kérdésbankot — NEM nyilvános).
//  2. Minden prémium alkategória 1. szintjét kiírja a public/data/questions/premium-preview.js-be
//     (ez az ingyenes kóstoló, ezt a böngésző tölti be).
//  3. Frissíti a QH_PREMIUM_LEVELS szintszámokat a public/data/catalog.js-ben.
//
// Új prémium alkategóriánál: írd be a kérdéseit a megfelelő data/premium fájlba, vedd fel a
// catalog.js-ben (QH_PREMIUM_CATALOG vagy QH_PREMIUM_EXTRA_SUBS), aztán futtasd ezt a szkriptet.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const dir = path.join(root, 'data', 'premium');

const bank = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  const body = src.replace(/^\s*export\s+default\s+/m, 'return ');
  const obj = new Function(body)();
  for (const [sub, levels] of Object.entries(obj)) {
    if (bank[sub]) throw new Error('Duplikált alkategória: ' + sub);
    levels.forEach((lv, i) => {
      if (!Array.isArray(lv) || lv.length !== 5) throw new Error(`${sub} ${i + 1}. szint: nem 5 kérdés`);
      lv.forEach((q, j) => {
        if (typeof q.q !== 'string' || !Array.isArray(q.o) || q.o.length !== 3 || ![0, 1, 2].includes(q.a))
          throw new Error(`${sub} ${i + 1}/${j + 1}: hibás kérdés`);
      });
    });
    bank[sub] = levels;
  }
}

let out = '// QuizHungary — PRÉMIUM ELŐNÉZET (generált fájl, kézzel ne szerkeszd!)\n' +
  '// Minden prémium alkategória 1. szintje — ingyenes kóstoló. A többi szintet a\n' +
  '// /api/premium-questions adja ki, csak prémium felhasználónak.\n' +
  '// Forrás: data/premium/*.js  ·  Generálás: node scripts/build-premium-preview.mjs\n' +
  'window.QH_QUESTIONS = window.QH_QUESTIONS || {};\n';
for (const [sub, levels] of Object.entries(bank)) {
  out += `\nQH_QUESTIONS['${sub}'] = [\n[ // 1\n` +
    levels[0].map(q => JSON.stringify({ q: q.q, o: q.o, a: q.a })).join(',\n') + ',\n]\n];\n';
}
fs.writeFileSync(path.join(root, 'public', 'data', 'questions', 'premium-preview.js'), out);

const catPath = path.join(root, 'public', 'data', 'catalog.js');
let cat = fs.readFileSync(catPath, 'utf8');
const levelsSrc = 'window.QH_PREMIUM_LEVELS = {\n' +
  Object.entries(bank).map(([s, l]) => `  '${s}': ${l.length}`).join(',\n') + '\n};';
cat = cat.replace(/window\.QH_PREMIUM_LEVELS = \{[\s\S]*?\n\};/, levelsSrc);
fs.writeFileSync(catPath, cat);

const total = Object.values(bank).reduce((n, l) => n + l.length * 5, 0);
console.log(`Kész: ${Object.keys(bank).length} prémium alkategória, ${total} kérdés.`);
