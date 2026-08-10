// QuizHungary — közös motor az alkategóriás oldalakhoz.
// Haladás: localStorage mindig; bejelentkezve Supabase `level_progress` táblával összefésülve.
(function(){
  const SURL='https://biooqabaubndamtnprha.supabase.co';
  const SKEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpb29xYWJhdWJuZGFtdG5wcmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTA5MzcsImV4cCI6MjA5NjQyNjkzN30.7yjkyPrOOo70ZkAUZkkvf0duTDe_y4zJj2x4r7pydzU';
  const sb=window.supabase?supabase.createClient(SURL,SKEY):null;

  const LS_KEY='qh_levels'; // { subId: legmagasabb teljesített szint }
  let user=null, profile=null, prog=readLocal();

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(LS_KEY))||{};}catch(e){return {};}
  }
  function writeLocal(){localStorage.setItem(LS_KEY,JSON.stringify(prog));}
  function esc(s){const d=document.createElement('div');d.textContent=s==null?'':s;return d.innerHTML;}

  // A haladás/streak localStorage-ban él. Hogy egy böngészőn több fiók / vendég
  // ne örökölje egymás adatait, minden kulcshoz "tulajdonost" rendelünk; ha az
  // változik (másik fiók vagy vendég), a korábbi játékadatokat kitöröljük.
  function resetLocalPlayData(){
    ['qh_levels','qh_streak','qh_streak_date','qh_daily','qh_daily_state','qh_guest_plays']
      .forEach(k=>localStorage.removeItem(k));
    prog={};
  }
  function claimLocalDataFor(ownerId){
    const cur=localStorage.getItem('qh_owner');
    if(cur!==ownerId){resetLocalPlayData();localStorage.setItem('qh_owner',ownerId);}
  }

  async function init(){
    if(sb){
      try{
        const{data:{session}}=await sb.auth.getSession();
        if(session?.user){
          user=session.user;
          claimLocalDataFor(user.id);
          const{data}=await sb.from('profiles').select('username,is_admin,is_premium,subscription_status,subscription_end').eq('id',user.id).single();
          profile=data;
          await syncFromServer();
        }else{
          claimLocalDataFor('guest');
        }
      }catch(e){console.warn('QH auth:',e.message);}
    }
    renderNav();
    return {user,profile};
  }

  // Szerver + helyi haladás összefésülése (mindig a nagyobb szint nyer), majd visszaírás.
  async function syncFromServer(){
    const{data,error}=await sb.from('level_progress').select('sub_id,completed_level').eq('user_id',user.id);
    if(error){console.warn('QH progress load:',error.message);return;}
    const server={};(data||[]).forEach(r=>{server[r.sub_id]=r.completed_level;});
    const toUpload=[];
    const all=new Set([...Object.keys(server),...Object.keys(prog)]);
    all.forEach(id=>{
      const s=server[id]||0,l=prog[id]||0,m=Math.max(s,l);
      prog[id]=m;
      if(m>s)toUpload.push({user_id:user.id,sub_id:id,completed_level:m});
    });
    writeLocal();
    if(toUpload.length)await sb.from('level_progress').upsert(toUpload,{onConflict:'user_id,sub_id'});
  }

  function getLevel(subId){return prog[subId]||0;}

  // Szint teljesítve → haladás mentése (helyi + szerver) és pont jóváírása a meglévő scores táblába.
  async function completeLevel(subId,level,correct){
    let advanced=false;
    if(level>getLevel(subId)){prog[subId]=level;writeLocal();advanced=true;}
    // pont: szint × 20 alap + minden jó válasz 10 (első teljesítéskor teljes, ismétléskor fele)
    const base=level*20+correct*10;
    const pts=advanced?base:Math.round(base/2);
    let saved=false;
    if(user&&sb){
      try{
        if(advanced)await sb.from('level_progress').upsert({user_id:user.id,sub_id:subId,completed_level:prog[subId]},{onConflict:'user_id,sub_id'});
        const cat=QH_CATALOG.find(c=>c.id===QH_SUB_TO_CAT[subId]);
        const sub=cat?.subs.find(s=>s.id===subId);
        await sb.from('scores').insert({user_id:user.id,topic:(cat?.name||'Kvíz')+' – '+(sub?.name||subId),points:pts});
        await sb.from('profiles').update({last_played_date:new Date().toISOString().split('T')[0]}).eq('id',user.id);
        saved=true;
      }catch(e){console.warn('QH save:',e.message);}
    }
    // saved: a pont ténylegesen jóváíródott-e a ranglistán (bejelentkezett felhasználónál)
    return {advanced,points:pts,saved};
  }

  // ── Feloldási szabályok ────────────────────────────────────────────────────
  function isSubUnlocked(cat,subIndex){
    if(subIndex===0)return true;
    return getLevel(cat.subs[subIndex-1].id)>=QH_RULES.UNLOCK_AT_LEVEL;
  }
  function isLevelUnlocked(subId,level){return level<=getLevel(subId)+1;}
  function catProgress(cat){ // teljesített szintek / összes
    let done=0,total=0;cat.subs.forEach(s=>{const L=qhLevels(s.id);done+=Math.min(getLevel(s.id),L);total+=L;});
    return {done,total};
  }

  // ── Kérdésbetöltő (data/questions/<kat>.js fájlok on-demand) ───────────────
  const loadedCats={};
  function loadQuestions(catId){
    if(loadedCats[catId])return loadedCats[catId];
    loadedCats[catId]=new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='data/questions/'+catId+'.js?v='+(window.QH_DATA_VERSION||'1');
      s.onload=()=>res();
      s.onerror=()=>rej(new Error('Nem sikerült betölteni: '+catId));
      document.head.appendChild(s);
    });
    return loadedCats[catId];
  }
  function loadAllQuestions(){return Promise.allSettled(QH_CATALOG.map(c=>loadQuestions(c.id)));}
  function getLevelQuestions(subId,level){
    const bank=(window.QH_QUESTIONS||{})[subId];
    if(!bank)return null;
    return bank[level-1]||null;
  }

  // ── Nav / UI ───────────────────────────────────────────────────────────────
  function renderNav(){
    const g=document.getElementById('nav-guest'),u=document.getElementById('nav-user');
    if(!g||!u)return;
    if(user){
      g.style.display='none';u.style.display='flex';
      const n=profile?.username||user.email.split('@')[0];
      const a=document.getElementById('nava');if(a)a.textContent=n.slice(0,2).toUpperCase();
      const un=document.getElementById('navu');if(un)un.textContent=n;
      buildUserMenu(u,n);
    }else{g.style.display='flex';u.style.display='none';}
  }

  function isPremium(){
    if(profile?.is_premium!==true)return false;
    if(profile?.subscription_status==='referral_reward'&&profile?.subscription_end){
      if(new Date(profile.subscription_end)<new Date())return false;
    }
    return true;
  }

  // Ugyanaz a felhasználói legördülő menü, mint a főoldalon. A menüpontok a
  // főoldal megfelelő nézetét nyitják meg (#hash), a kijelentkezés helyben történik.
  function buildUserMenu(u,name){
    if(u.dataset.qhMenu)return; // csak egyszer építjük fel
    u.dataset.qhMenu='1';
    u.classList.add('user-menu');
    // A meglévő avatar+név lesz a kattintható trigger.
    const trigger=document.createElement('div');
    trigger.className='user-trigger';
    while(u.firstChild)trigger.appendChild(u.firstChild);
    u.appendChild(trigger);

    const drop=document.createElement('div');
    drop.className='udrop';
    const label=isPremium()?esc(name)+' <span style="color:var(--gold)">✨ Premium</span>':esc(name);
    let html='<div class="udlabel">'+label+'</div><div class="uddiv"></div>';
    html+='<button class="udi" data-go="#profil">👤 Profilom</button>';
    html+='<button class="udi" data-go="#premium">✨ Premium</button>';
    html+='<button class="udi" data-go="#referral">🎁 Hívj meg barátokat</button>';
    if(profile?.is_admin===true)html+='<button class="udi" data-go="#admin">🔐 Admin</button>';
    html+='<button class="udi" data-go="#rangsor">🏆 Ranglista</button>';
    html+='<div class="uddiv"></div><button class="udi danger" data-signout="1">Kijelentkezés</button>';
    drop.innerHTML=html;
    u.appendChild(drop);

    trigger.addEventListener('click',e=>{e.stopPropagation();drop.classList.toggle('show');});
    drop.querySelectorAll('[data-go]').forEach(b=>{
      b.addEventListener('click',()=>{location.href='/'+b.getAttribute('data-go');});
    });
    const so=drop.querySelector('[data-signout]');
    if(so)so.addEventListener('click',async()=>{
      try{await sb.auth.signOut();}catch(e){}
      location.href='/';
    });
    document.addEventListener('click',e=>{if(!u.contains(e.target))drop.classList.remove('show');});
  }

  let tt=null;
  function toast(msg,type='ok'){
    const t=document.getElementById('tst');if(!t)return;
    t.textContent=msg;t.className='toast '+type+' show';
    clearTimeout(tt);tt=setTimeout(()=>t.className='toast',3500);
  }

  function qs(name){return new URLSearchParams(location.search).get(name);}

  // ── Napi sorozat (streak) ──────────────────────────────────────────────────
  // Ugyanazokat a localStorage kulcsokat használja, mint a főoldal. Bármely kvíz
  // (szint, IQ teszt stb.) teljesítésekor meghívható, hogy a sorozat a kvíz
  // típusától függetlenül nőjön — nem csak a napi kvíztől.
  function markStreak(){
    const today=new Date().toISOString().slice(0,10);
    const last=localStorage.getItem('qh_streak_date');
    if(last===today)return; // ma már számoltuk
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const cur=parseInt(localStorage.getItem('qh_streak')||'0');
    localStorage.setItem('qh_streak',(last===yesterday?cur+1:1).toString());
    localStorage.setItem('qh_streak_date',today);
  }

  window.QH={init,getLevel,completeLevel,isSubUnlocked,isLevelUnlocked,catProgress,
    loadQuestions,loadAllQuestions,getLevelQuestions,toast,qs,markStreak,
    get user(){return user;},get sb(){return sb;}};
})();
