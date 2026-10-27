# Prémium tartalom

Ebben a mappában van a **teljes prémium kérdésbank**. Ez a mappa szándékosan nincs a
`public/` alatt: ami a `public/`-ban van, azt bárki letöltheti a böngészőből.

| Fájl | Tartalom |
|---|---|
| `nyelv.js` | Magyar nyelv és szólások (5 alkategória × 10 szint × 5 kérdés) |
| `retro.js` | Retró és nosztalgia (5 alkategória × 10 szint × 5 kérdés) |
| `mitologia.js` | Mitológia és vallás (5 alkategória × 10 szint × 5 kérdés) |
| `muveszet.js` | Művészet és építészet (5 alkategória × 10 szint × 5 kérdés) |
| `extra.js` | 20 extra prémium alkategória a meglévő kategóriákban (pl. Zászlók és címerek, Dinoszauruszok, Forma-1) |

## Hogyan működik

- **1. szint = ingyenes kóstoló.** Ezt a `scripts/build-premium-preview.mjs` kimásolja a
  nyilvános `public/data/questions/premium-preview.js` fájlba.
- **2. szinttől** a kérdéseket az `api/premium-questions.js` adja ki, de csak akkor, ha
  a bejelentkezett felhasználó prémium (vagy admin). Vendég: 401, ingyenes fiók: 403.
- A prémium alkategóriák **nincsenek a feloldási láncban**: mindegyik azonnal elérhető.
- A jelzés **korona + „Prémium”** felirat, nem lakat (a lakat a haladással feloldható tartalomé).
- Amikor valaki teljesít egy ingyenes alkategóriát, a kvíz végén **ajánlatot** kap egy hozzá
  illő prémium alkategóriára (`QH_UPSELL` a `public/data/catalog.js`-ben).

## Élesítés

A kapcsoló a `public/data/catalog.js` fájlban van:

```js
window.QH_PREMIUM_ENABLED = false;   // false = „Hamarosan” jelzés, true = megvásárolható
```

Amíg `false`, a prémium tartalom „hamarosan” jelzéssel látszik, és az 1. szintek játszhatók.
A már prémium (pl. meghívásért kapott) és az admin fiókok közben is mindent elérnek, így tesztelhetsz.

## Új prémium alkategória hozzáadása (havi bővítés)

1. Írd be a kérdéseket a megfelelő fájlba (`extra.js` vagy egy új fő kategória fájlja), ugyanabban a
   formátumban: `{q:'Kérdés?', o:['helyes','rossz','rossz'], a:0}`. Szintenként pontosan 5 kérdés.
2. Vedd fel a `public/data/catalog.js`-ben: `QH_PREMIUM_EXTRA_SUBS` (meglévő fő kategóriába)
   vagy `QH_PREMIUM_CATALOG` (új fő kategória), `premium:true`-val.
3. Tegyél neki egy `sub-card`-ot a megfelelő `kategoria-*.html` oldalra (a meglévők mintájára).
4. Új fájl esetén importáld az `api/premium-questions.js`-ben.
5. Futtasd: `node scripts/build-premium-preview.mjs` — ez frissíti az előnézetet és a szintszámokat.
