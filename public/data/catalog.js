// QuizHungary — kategóriafa (10 fő kategória × 5 alkategória × 10 szint × 5 kérdés)
// Az alkategóriák sorrendje = feloldási sorrend: a következő akkor nyílik,
// ha az előzőben elérted az UNLOCK_AT_LEVEL szintet.
window.QH_RULES = {
  LEVELS: 10,           // szintek száma alkategóriánként
  Q_PER_LEVEL: 5,       // kérdés / szint
  PASS_MIN: 4,          // ennyi jó válasz kell a szint teljesítéséhez
  UNLOCK_AT_LEVEL: 5    // előző alkategóriában elérendő szint a következő feloldásához
};

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

// Segéd: alkategória-id → fő kategória
window.QH_SUB_TO_CAT = {};
QH_CATALOG.forEach(c => c.subs.forEach(s => { QH_SUB_TO_CAT[s.id] = c.id; }));
