// QuizHungary — kategóriafa (10 fő kategória × 5 alkategória)
// Az alkategóriák sorrendje = feloldási sorrend: a következő akkor nyílik,
// ha az előzőben elérted az UNLOCK_AT_LEVEL szintet.
window.QH_RULES = {
  TARGET_LEVELS: 100,   // cél szintszám alkategóriánként (a bővítés végcélja)
  Q_PER_LEVEL: 5,       // kérdés / szint
  PASS_MIN: 4,          // ennyi jó válasz kell a szint teljesítéséhez
  UNLOCK_AT_LEVEL: 5    // előző alkategóriában elérendő szint a következő feloldásához
};

// A kérdésbank verziója — cache-busting a kérdésfájlokhoz.
// (A sync-levels szkript frissíti; ettől biztosan friss kérdések töltődnek be.)
window.QH_DATA_VERSION = '550-04ae4e79';

// Ténylegesen kész szintek alkategóriánként — a kérdésbankból generálva.
// (A sync-levels szkript írja felül bővítéskor; kézzel ne szerkeszd.)
window.QH_SUB_LEVELS = {
  'foldrajz-magyarorszag': 20,
  'foldrajz-europa': 20,
  'foldrajz-fovarosok': 20,
  'foldrajz-oceanok': 20,
  'foldrajz-vilag': 20,
  'tortenelem-magyar': 10,
  'tortenelem-okor': 10,
  'tortenelem-kozepkor': 10,
  'tortenelem-ujkor': 10,
  'tortenelem-20szazad': 10,
  'tudomany-emberitest': 10,
  'tudomany-biologia': 10,
  'tudomany-kemia': 10,
  'tudomany-fizika': 10,
  'tudomany-csillagaszat': 10,
  'sport-labdarugas': 10,
  'sport-olimpia': 10,
  'sport-magyar': 10,
  'sport-csapat': 10,
  'sport-egyeni': 10,
  'film-klasszikus': 10,
  'film-modern': 10,
  'film-animacios': 10,
  'film-sorozatok': 10,
  'film-magyar': 10,
  'zene-pop': 10,
  'zene-rock': 10,
  'zene-magyar': 10,
  'zene-klasszikus': 10,
  'zene-hangszerek': 10,
  'irodalom-magyar': 10,
  'irodalom-vilag': 10,
  'irodalom-kolteszet': 10,
  'irodalom-ifjusagi': 10,
  'irodalom-drama': 10,
  'gasztro-magyar': 10,
  'gasztro-vilag': 10,
  'gasztro-edessegek': 10,
  'gasztro-italok': 10,
  'gasztro-alapanyagok': 10,
  'termeszet-emlosok': 10,
  'termeszet-madarak': 10,
  'termeszet-tenger': 10,
  'termeszet-hullok': 10,
  'termeszet-novenyek': 10,
  'technika-szamitastechnika': 10,
  'technika-talalmanyok': 10,
  'technika-autok': 10,
  'technika-urkutatas': 10,
  'technika-jatekok': 10
};

// Prémium alkategóriák szintszáma. Külön objektum, hogy a sync-levels szkript
// (ami a QH_SUB_LEVELS-t a nyilvános kérdésfájlokból írja) ne írja felül:
// a prémium kérdések 2. szinttől nem nyilvánosak, a szerver adja őket (api/premium-questions).
window.QH_PREMIUM_LEVELS = {
  'foldrajz-zaszlok': 10,
  'tudomany-matematika': 10,
  'tudomany-foldtudomany': 10,
  'termeszet-dinoszauruszok': 10,
  'termeszet-veszelyes': 10,
  'tortenelem-hadtortenet': 10,
  'tortenelem-uralkodok': 10,
  'sport-forma1': 10,
  'sport-vilagbajnoksagok': 10,
  'film-szuperhosok': 10,
  'film-szineszek': 10,
  'zene-filmzenek': 10,
  'zene-eurovizio': 10,
  'irodalom-krimi': 10,
  'irodalom-mesek': 10,
  'technika-ai': 10,
  'technika-repules': 10,
  'foldrajz-telepulesek': 10,
  'gasztro-fuszerek': 10,
  'gasztro-utcai': 10,
  'mitologia-gorog': 10,
  'mitologia-romai': 10,
  'mitologia-skandinav': 10,
  'mitologia-egyiptomi': 10,
  'mitologia-magyar': 10,
  'muveszet-festeszet': 10,
  'muveszet-epiteszet': 10,
  'muveszet-szobraszat': 10,
  'muveszet-divat': 10,
  'muveszet-muzeumok': 10,
  'nyelv-szolasok': 10,
  'nyelv-eredet': 10,
  'nyelv-helyesiras': 10,
  'nyelv-idegen': 10,
  'nyelv-tajszavak': 10,
  'retro-80as': 10,
  'retro-90es': 10,
  'retro-teve': 10,
  'retro-mesek': 10,
  'retro-jatekok': 10
};

// Egy alkategória tényleges szintszáma (ennyi van kész kérdésekkel).
window.qhLevels = function(subId){ return window.QH_PREMIUM_LEVELS[subId] || window.QH_SUB_LEVELS[subId] || 0; };

window.QH_CATALOG = [
  {id:'foldrajz', name:'Földrajz', icon:'🌍', desc:'Országok, óceánok, hegyek és városok a nagyvilágból.', subs:[
    {id:'foldrajz-magyarorszag', name:'Magyarország', icon:'🇭🇺', desc:'Hazai tájak, folyók, városok.'},
    {id:'foldrajz-europa', name:'Európa', icon:'🏰', desc:'Kontinensünk országai és tájai.'},
    {id:'foldrajz-fovarosok', name:'Fővárosok', icon:'🏙️', desc:'A világ fővárosai.'},
    {id:'foldrajz-oceanok', name:'Óceánok és tengerek', icon:'🌊', desc:'Vizek, szigetek, tengerpartok.'},
    {id:'foldrajz-vilag', name:'Világ csodái', icon:'🗻', desc:'Extrém helyek és természeti csodák.'}
  ]},
  {id:'tortenelem', name:'Történelem', icon:'🏛️', desc:'Az ókortól a 20. századig — és a magyar história.', subs:[
    {id:'tortenelem-magyar', name:'Magyar történelem', icon:'👑', desc:'A honfoglalástól napjainkig.'},
    {id:'tortenelem-okor', name:'Ókor', icon:'🏺', desc:'Egyiptom, Görögország, Róma.'},
    {id:'tortenelem-kozepkor', name:'Középkor', icon:'⚔️', desc:'Lovagok, várak, királyok.'},
    {id:'tortenelem-ujkor', name:'Újkor', icon:'⛵', desc:'Felfedezések, forradalmak.'},
    {id:'tortenelem-20szazad', name:'20. század', icon:'📻', desc:'Világháborúk és hidegháború.'}
  ]},
  {id:'tudomany', name:'Tudomány', icon:'🔬', desc:'Biológia, kémia, fizika és a világegyetem titkai.', subs:[
    {id:'tudomany-emberitest', name:'Emberi test', icon:'🫀', desc:'Szervek, csontok, egészség.'},
    {id:'tudomany-biologia', name:'Biológia', icon:'🧬', desc:'Az élet tudománya.'},
    {id:'tudomany-kemia', name:'Kémia', icon:'🧪', desc:'Elemek és reakciók.'},
    {id:'tudomany-fizika', name:'Fizika', icon:'⚛️', desc:'Erők, energia, mozgás.'},
    {id:'tudomany-csillagaszat', name:'Csillagászat', icon:'🔭', desc:'Bolygók, csillagok, galaxisok.'}
  ]},
  {id:'sport', name:'Sport', icon:'⚽', desc:'Foci, olimpia, magyar sportsikerek és rekordok.', subs:[
    {id:'sport-labdarugas', name:'Labdarúgás', icon:'⚽', desc:'A világ legnépszerűbb sportja.'},
    {id:'sport-olimpia', name:'Olimpia', icon:'🥇', desc:'Az ötkarikás játékok.'},
    {id:'sport-magyar', name:'Magyar sport', icon:'🇭🇺', desc:'Hazai bajnokok és legendák.'},
    {id:'sport-csapat', name:'Csapatsportok', icon:'🏀', desc:'Kosár, kézi, röplabda és társai.'},
    {id:'sport-egyeni', name:'Egyéni sportok', icon:'🎾', desc:'Tenisz, atlétika, úszás, F1.'}
  ]},
  {id:'film', name:'Film és TV', icon:'🎬', desc:'Mozifilmek, sorozatok, rajzfilmek és sztárok.', subs:[
    {id:'film-klasszikus', name:'Klasszikus filmek', icon:'🎞️', desc:'Örökzöld mozifilmek.'},
    {id:'film-modern', name:'Modern filmek', icon:'🍿', desc:'A 2000-es évek mozija.'},
    {id:'film-animacios', name:'Animációs filmek', icon:'🧞', desc:'Disney, Pixar és társaik.'},
    {id:'film-sorozatok', name:'Sorozatok', icon:'📺', desc:'A képernyők világa.'},
    {id:'film-magyar', name:'Magyar film', icon:'🎥', desc:'Hazai mozi és tévé.'}
  ]},
  {id:'zene', name:'Zene', icon:'🎵', desc:'Poptól a klasszikusig, hangszerektől az előadókig.', subs:[
    {id:'zene-pop', name:'Popzene', icon:'🎤', desc:'Slágerek és sztárok.'},
    {id:'zene-rock', name:'Rock', icon:'🎸', desc:'Gitárok és legendák.'},
    {id:'zene-magyar', name:'Magyar zene', icon:'🇭🇺', desc:'Hazai előadók és dalok.'},
    {id:'zene-klasszikus', name:'Klasszikus zene', icon:'🎻', desc:'Zeneszerzők és művek.'},
    {id:'zene-hangszerek', name:'Hangszerek', icon:'🥁', desc:'A zene eszközei.'}
  ]},
  {id:'irodalom', name:'Irodalom', icon:'📚', desc:'Magyar és világirodalom, költők és regények.', subs:[
    {id:'irodalom-magyar', name:'Magyar irodalom', icon:'✒️', desc:'Petőfitől Máraiig.'},
    {id:'irodalom-vilag', name:'Világirodalom', icon:'🌐', desc:'A világ nagy regényei.'},
    {id:'irodalom-kolteszet', name:'Költészet', icon:'🪶', desc:'Versek és költők.'},
    {id:'irodalom-ifjusagi', name:'Ifjúsági és fantasy', icon:'🐉', desc:'Harry Pottertől a Gyűrűk Uráig.'},
    {id:'irodalom-drama', name:'Dráma és színház', icon:'🎭', desc:'Színpadi művek.'}
  ]},
  {id:'gasztro', name:'Gasztronómia', icon:'🍽️', desc:'Magyar konyha, világkonyhák, italok és édességek.', subs:[
    {id:'gasztro-magyar', name:'Magyar konyha', icon:'🥘', desc:'Gulyástól a lángosig.'},
    {id:'gasztro-vilag', name:'Világkonyhák', icon:'🍜', desc:'Ízek a nagyvilágból.'},
    {id:'gasztro-edessegek', name:'Édességek', icon:'🍰', desc:'Sütik, torták, desszertek.'},
    {id:'gasztro-italok', name:'Italok', icon:'🍷', desc:'Kávé, tea, borok és társaik.'},
    {id:'gasztro-alapanyagok', name:'Alapanyagok', icon:'🥕', desc:'Amiből az étel készül.'}
  ]},
  {id:'termeszet', name:'Természet és állatok', icon:'🦁', desc:'Emlősök, madarak, tengerek élővilága és növények.', subs:[
    {id:'termeszet-emlosok', name:'Emlősök', icon:'🐘', desc:'A szárazföld urai.'},
    {id:'termeszet-madarak', name:'Madarak', icon:'🦅', desc:'Az ég vándorai.'},
    {id:'termeszet-tenger', name:'Tengeri élővilág', icon:'🐋', desc:'Az óceánok lakói.'},
    {id:'termeszet-hullok', name:'Hüllők és rovarok', icon:'🦎', desc:'A kicsik és a hidegvérűek.'},
    {id:'termeszet-novenyek', name:'Növényvilág', icon:'🌳', desc:'Fák, virágok, erdők.'}
  ]},
  {id:'technika', name:'Technika', icon:'💡', desc:'Számítógépek, találmányok, autók és űrkutatás.', subs:[
    {id:'technika-szamitastechnika', name:'Számítástechnika', icon:'💻', desc:'Gépek, netes világ, cégek.'},
    {id:'technika-talalmanyok', name:'Találmányok', icon:'⚙️', desc:'Feltalálók és ötleteik.'},
    {id:'technika-autok', name:'Autók és közlekedés', icon:'🚗', desc:'Négy keréken és azon túl.'},
    {id:'technika-urkutatas', name:'Űrkutatás', icon:'🚀', desc:'Rakéták és űrhajósok.'},
    {id:'technika-jatekok', name:'Videójátékok', icon:'🎮', desc:'A játékok világa.'}
  ]}
];

// ── PRÉMIUM ─────────────────────────────────────────────────────────────────
// ⚠️ PRÉMIUM KAPCSOLÓ: false = a prémium tartalom „Hamarosan” jelzéssel látszik,
// csak az 1. szintek játszhatók (a meglévő prémium/admin fiókok mindent elérnek).
// true = élesben megvásárolható. Ezt használja a főoldal is.
window.QH_PREMIUM_ENABLED = true;

// FONTOS: a QH_CATALOG szándékosan csak az ingyenes tartalmat tartalmazza —
// a napi kvíz, párbaj, ivós kvíz stb. innen húz kérdéseket, oda prémium nem kerülhet.
// Prémium fő kategóriák (saját kategóriaoldal, nincs feloldási lánc):
window.QH_PREMIUM_CATALOG = [
  {id:'nyelv', name:'Magyar nyelv és szólások', icon:'🗣️', premium:true, desc:'Szólások, szavak eredete, helyesírás és nyelvi érdekességek.', subs:[
    {id:'nyelv-szolasok', name:'Szólások és közmondások', icon:'💬', premium:true, desc:'Mit jelent, hogyan folytatódik?'},
    {id:'nyelv-eredet', name:'Szavak eredete', icon:'📜', premium:true, desc:'Honnan jöttek a szavaink?'},
    {id:'nyelv-helyesiras', name:'Helyesírás', icon:'✍️', premium:true, desc:'Egybe vagy külön, j vagy ly?'},
    {id:'nyelv-idegen', name:'Idegen szavak', icon:'🌐', premium:true, desc:'Mit jelent magyarul?'},
    {id:'nyelv-tajszavak', name:'Tájszavak és nyelvi érdekességek', icon:'🧺', premium:true, desc:'Krumpli vagy pityóka?'}
  ]},
  {id:'retro', name:'Retró és nosztalgia', icon:'📼', premium:true, desc:'A 80-as, 90-es évek, régi tévéműsorok, mesék és csemegék.', subs:[
    {id:'retro-80as', name:'80-as évek', icon:'🕹️', premium:true, desc:'Rubik-kocka, walkman, Commodore.'},
    {id:'retro-90es', name:'90-es évek', icon:'💾', premium:true, desc:'Tamagocsi, Nokia, Spice Girls.'},
    {id:'retro-teve', name:'Régi tévéműsorok és reklámok', icon:'📺', premium:true, desc:'A képernyő régi kedvencei.'},
    {id:'retro-mesek', name:'Gyerekkori mesék és rajzfilmek', icon:'🧸', premium:true, desc:'Esti mese és szombati rajzfilm.'},
    {id:'retro-jatekok', name:'Játékok és csemegék', icon:'🍬', premium:true, desc:'Ami a gyerekszobában és a zsebben volt.'}
  ]},
  {id:'mitologia', name:'Mitológia és vallás', icon:'⚡', premium:true, desc:'Görög, római, skandináv és egyiptomi istenek, magyar mondák.', subs:[
    {id:'mitologia-gorog', name:'Görög mitológia', icon:'🏛️', premium:true, desc:'Az Olümposz istenei és hősei.'},
    {id:'mitologia-romai', name:'Római mitológia', icon:'🦅', premium:true, desc:'Jupitertől Romulusig.'},
    {id:'mitologia-skandinav', name:'Skandináv mitológia', icon:'🔨', premium:true, desc:'Odin, Thor és Asgard.'},
    {id:'mitologia-egyiptomi', name:'Egyiptomi mitológia', icon:'☀️', premium:true, desc:'Ré, Ozirisz és a piramisok istenei.'},
    {id:'mitologia-magyar', name:'Magyar mondák és regék', icon:'🦌', premium:true, desc:'Csodaszarvas, turul és Csaba királyfi.'}
  ]},
  {id:'muveszet', name:'Művészet és építészet', icon:'🎨', premium:true, desc:'Festmények, épületek, szobrok, divat és a világ nagy múzeumai.', subs:[
    {id:'muveszet-festeszet', name:'Festészet', icon:'🖼️', premium:true, desc:'Mesterművek és festők.'},
    {id:'muveszet-epiteszet', name:'Építészet', icon:'🏰', premium:true, desc:'Stílusok és híres épületek.'},
    {id:'muveszet-szobraszat', name:'Szobrászat', icon:'🗿', premium:true, desc:'Márványtól a bronzig.'},
    {id:'muveszet-divat', name:'Divat és design', icon:'👗', premium:true, desc:'Divatházak, tervezők, ikonikus tárgyak.'},
    {id:'muveszet-muzeumok', name:'Múzeumok és híres művek', icon:'🏛️', premium:true, desc:'Hol látható a Mona Lisa?'}
  ]}
];
// Prémium alkategóriák a meglévő (ingyenes) fő kategóriákon belül — a lista végére kerülnek,
// és nem részei a feloldási láncnak.
window.QH_PREMIUM_EXTRA_SUBS = {
  foldrajz: [
    {id:'foldrajz-zaszlok', name:'Zászlók és címerek', icon:'🚩', premium:true, desc:'Országok zászlói és címerei.'},
    {id:'foldrajz-telepulesek', name:'Magyar települések', icon:'🏘️', premium:true, desc:'Városok, falvak és nevük titkai.'}
  ],
  tortenelem: [
    {id:'tortenelem-hadtortenet', name:'Hadtörténet', icon:'🛡️', premium:true, desc:'Csaták, hadvezérek, fegyverek.'},
    {id:'tortenelem-uralkodok', name:'Híres uralkodók és vezetők', icon:'👑', premium:true, desc:'Királyok, császárok, államférfiak.'}
  ],
  tudomany: [
    {id:'tudomany-matematika', name:'Matematika', icon:'📐', premium:true, desc:'Számok, alakzatok, matematikusok.'},
    {id:'tudomany-foldtudomany', name:'Földtudomány és időjárás', icon:'🌦️', premium:true, desc:'Vulkánok, kőzetek, felhők és viharok.'}
  ],
  sport: [
    {id:'sport-forma1', name:'Forma-1 és motorsport', icon:'🏎️', premium:true, desc:'Pilóták, csapatok, pályák.'},
    {id:'sport-vilagbajnoksagok', name:'Világbajnokságok', icon:'🏆', premium:true, desc:'A nagy tornák legendás pillanatai.'}
  ],
  film: [
    {id:'film-szuperhosok', name:'Szuperhősök és sci-fi', icon:'🦸', premium:true, desc:'Marvel, DC és a galaxis távoli vidékei.'},
    {id:'film-szineszek', name:'Híres színészek és rendezők', icon:'🎭', premium:true, desc:'Sztárok és alkotók.'}
  ],
  zene: [
    {id:'zene-filmzenek', name:'Filmzenék és musicalek', icon:'🎼', premium:true, desc:'A vászon és a színpad dallamai.'},
    {id:'zene-eurovizio', name:'Eurovízió', icon:'🎙️', premium:true, desc:'Győztesek, dalok és rekordok.'}
  ],
  irodalom: [
    {id:'irodalom-krimi', name:'Krimi', icon:'🔍', premium:true, desc:'Detektívek, rejtélyek, szerzők.'},
    {id:'irodalom-mesek', name:'Mesék', icon:'🧚', premium:true, desc:'Népmesék és klasszikus mesék.'}
  ],
  gasztro: [
    {id:'gasztro-fuszerek', name:'Fűszerek és hozzávalók', icon:'🌶️', premium:true, desc:'Ízek, illatok, eredetük.'},
    {id:'gasztro-utcai', name:'A világ utcai ételei', icon:'🌯', premium:true, desc:'Taco, kebab, lángos és társaik.'}
  ],
  termeszet: [
    {id:'termeszet-dinoszauruszok', name:'Dinoszauruszok', icon:'🦖', premium:true, desc:'Az őskor óriásai.'},
    {id:'termeszet-veszelyes', name:'Veszélyes állatok', icon:'🐍', premium:true, desc:'Mérgek, fogak, karmok.'}
  ],
  technika: [
    {id:'technika-ai', name:'Mesterséges intelligencia', icon:'🤖', premium:true, desc:'Gépi tanulástól a chatbotokig.'},
    {id:'technika-repules', name:'Repülés', icon:'✈️', premium:true, desc:'Repülőgépek, pilóták, rekordok.'}
  ]
};

// Teljes nézet (ingyenes + prémium): a kategóriaoldalak és a kvízoldal ezt használja.
window.QH_ALL_CATS = QH_CATALOG.map(c => Object.assign({}, c, {
  subs: c.subs.concat(QH_PREMIUM_EXTRA_SUBS[c.id] || [])
})).concat(QH_PREMIUM_CATALOG);
window.qhFindCat = function(catId){ return QH_ALL_CATS.find(c => c.id === catId) || null; };
window.qhIsPremiumSub = function(subId){ return Object.prototype.hasOwnProperty.call(QH_PREMIUM_LEVELS, subId); };

// Teljesítés utáni ajánlat: melyik ingyenes alkategória után melyik prémiumot kínáljuk.
window.QH_UPSELL_DEFAULT = 'nyelv-szolasok';
window.QH_UPSELL = {
  'foldrajz-magyarorszag':'foldrajz-telepulesek',
  'foldrajz-europa':'foldrajz-zaszlok',
  'foldrajz-fovarosok':'foldrajz-zaszlok',
  'foldrajz-oceanok':'tudomany-foldtudomany',
  'foldrajz-vilag':'tudomany-foldtudomany',
  'tortenelem-magyar':'tortenelem-uralkodok',
  'tortenelem-okor':'mitologia-gorog',
  'tortenelem-kozepkor':'tortenelem-hadtortenet',
  'tortenelem-ujkor':'tortenelem-uralkodok',
  'tortenelem-20szazad':'tortenelem-hadtortenet',
  'tudomany-emberitest':'termeszet-veszelyes',
  'tudomany-biologia':'termeszet-dinoszauruszok',
  'tudomany-kemia':'gasztro-fuszerek',
  'tudomany-fizika':'tudomany-matematika',
  'tudomany-csillagaszat':'tudomany-foldtudomany',
  'sport-labdarugas':'sport-vilagbajnoksagok',
  'sport-olimpia':'sport-vilagbajnoksagok',
  'sport-magyar':'sport-vilagbajnoksagok',
  'sport-csapat':'sport-vilagbajnoksagok',
  'sport-egyeni':'sport-forma1',
  'film-klasszikus':'film-szineszek',
  'film-modern':'film-szuperhosok',
  'film-animacios':'retro-mesek',
  'film-sorozatok':'retro-teve',
  'film-magyar':'film-szineszek',
  'zene-pop':'zene-eurovizio',
  'zene-rock':'retro-80as',
  'zene-magyar':'zene-eurovizio',
  'zene-klasszikus':'zene-filmzenek',
  'zene-hangszerek':'zene-filmzenek',
  'irodalom-magyar':'mitologia-magyar',
  'irodalom-vilag':'irodalom-krimi',
  'irodalom-kolteszet':'nyelv-szolasok',
  'irodalom-ifjusagi':'irodalom-mesek',
  'irodalom-drama':'mitologia-gorog',
  'gasztro-magyar':'gasztro-fuszerek',
  'gasztro-vilag':'gasztro-utcai',
  'gasztro-edessegek':'retro-jatekok',
  'gasztro-italok':'gasztro-fuszerek',
  'gasztro-alapanyagok':'gasztro-fuszerek',
  'termeszet-emlosok':'termeszet-veszelyes',
  'termeszet-madarak':'nyelv-szolasok',
  'termeszet-tenger':'termeszet-veszelyes',
  'termeszet-hullok':'termeszet-dinoszauruszok',
  'termeszet-novenyek':'nyelv-tajszavak',
  'technika-szamitastechnika':'technika-ai',
  'technika-talalmanyok':'technika-repules',
  'technika-autok':'sport-forma1',
  'technika-urkutatas':'technika-repules',
  'technika-jatekok':'retro-jatekok'
};

// Segéd: alkategória-id → fő kategória (ingyenes + prémium)
window.QH_SUB_TO_CAT = {};
QH_ALL_CATS.forEach(c => c.subs.forEach(s => { QH_SUB_TO_CAT[s.id] = c.id; }));
window.qhFindSub = function(subId){ const c = qhFindCat(QH_SUB_TO_CAT[subId]); return c ? c.subs.find(s => s.id === subId) : null; };
