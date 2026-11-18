/* Auditorias Hauke — app (PWA). Depende de: modelo.js (MODELO), config.js (HAUKE_CONFIG), vendor/jspdf. */
'use strict';

const NOTAS = {
 A:{p:20, lbl:'A',   txt:'Concluiu totalmente',                pts:'20 pontos'},
 B:{p:15, lbl:'B',   txt:'Concluiu parcialmente',              pts:'15 pontos'},
 C:{p:5,  lbl:'C',   txt:'Uma pequena parcela foi concluída',  pts:'5 pontos'},
 D:{p:0,  lbl:'D',   txt:'Requisitos não constatados',         pts:'0 pontos'},
 KO:{p:0, lbl:'K.O', txt:'Não consta os requisitos, sendo este um item obrigatório', pts:'10% da pontuação total possível é subtraído'},
 NA:{p:null,lbl:'N/A',txt:'Requisito não aplicável para setor ou empresa', pts:'Excluído da pontuação final'}
};
const ORDEM = ['A','B','C','D','KO','NA'];
const COR = {A:'#1f9d55',B:'#7cb342',C:'#f2a516',D:'#e4572e',KO:'#9b1c1c',NA:'#8a94a3'};

function montarModelo(){
  return MODELO.map((s,si)=>({
    id:String(si+1), nome:s.nome, curto:s.curto,
    subs:s.subs.map((sb,bi)=>{
      const pref = sb.nome ? `${si+1}.${bi+1}` : `${si+1}`;
      return { id:pref, nome:sb.nome, itens:sb.itens.map((t,ii)=>({id:`${pref}.${ii+1}`, t})) };
    })
  }));
}

/* ================= UTILITÁRIOS ================= */
const $app=document.getElementById('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const fmtData=ts=>{ if(!ts) return '-'; const d=new Date(ts); if(isNaN(d)) return '-'; return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const fmtN=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
const pct=(a,b)=> b? a/b*100 : 0;
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const dataAud=a=> a.dados.data? new Date(a.dados.data).getTime() : a.criada;
const mapsUrl=(lat,lng)=>`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}
const b64ToBytes=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
const blobB64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});

/* ================= SENHA / CONFIGURAÇÃO ================= */
let SESSAO=null; // {senha, url}
const CFG=window.HAUKE_CONFIG||{};
const configurado=()=>!!(CFG.enc&&CFG.iv&&CFG.salt);
async function decifrarUrl(senha){
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(senha),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64ToBytes(CFG.salt),iterations:CFG.iter||310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(CFG.iv)},key,b64ToBytes(CFG.enc));
  return JSON.parse(new TextDecoder().decode(pt)).url;
}
function renderGate(msg){
  $app.innerHTML=`<div class="gate"><form class="gbox" id="gform">
    <img src="icons/icon-192.png" alt="">
    <h1>Auditorias Hauke</h1>
    <p>${esc(msg||'Digite a senha de acesso da equipe.')}</p>
    <input type="password" id="gsenha" autocomplete="current-password" placeholder="Senha" required>
    <div id="gerr" class="err" style="margin:0 0 10px"></div>
    <button class="btn btn-p btn-block" id="gbtn">Entrar</button>
  </form></div>`;
  const f=document.getElementById('gform');
  f.addEventListener('submit',async ev=>{
    ev.preventDefault(); const s=document.getElementById('gsenha').value; const b=document.getElementById('gbtn');
    b.disabled=true; b.textContent='Verificando…';
    try{ const url=await decifrarUrl(s); SESSAO={senha:s,url}; LS.set('hauke_senha',s); irHome(); sincronizar(); }
    catch(e){ await new Promise(r=>setTimeout(r,800)); document.getElementById('gerr').textContent='Senha incorreta.'; b.disabled=false; b.textContent='Entrar'; }
  });
  setTimeout(()=>document.getElementById('gsenha')?.focus(),50);
}
function sair(msg){ SESSAO=null; LS.del('hauke_senha'); A=null; renderGate(msg); }

/* ================= ARMAZENAMENTO LOCAL (IndexedDB) ================= */
const DB = (()=>{
  let db=null; const mem={auditorias:new Map(),fotos:new Map()};
  async function open(){
    try{
      db = await new Promise((res,rej)=>{
        const r=indexedDB.open('hauke-auditorias',1);
        r.onupgradeneeded=()=>{const d=r.result;
          d.createObjectStore('auditorias',{keyPath:'id'});
          const f=d.createObjectStore('fotos',{keyPath:'id'}); f.createIndex('aud','aud');};
        r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);
      });
    }catch(e){ db=null; }
    return !!db;
  }
  function req(store,mode,fn){
    return new Promise((res,rej)=>{
      const t=db.transaction(store,mode); const r=fn(t.objectStore(store));
      t.oncomplete=()=>res(r?r.result:undefined); t.onerror=()=>rej(t.error); t.onabort=()=>rej(t.error);
    });
  }
  return {
    open, get ok(){return !!db},
    put:(s,o)=> db? req(s,'readwrite',st=>st.put(o)) : (mem[s].set(o.id,structuredClone(o)),Promise.resolve()),
    get:(s,id)=> db? req(s,'readonly',st=>st.get(id)) : Promise.resolve(structuredClone(mem[s].get(id))),
    all:(s)=> db? req(s,'readonly',st=>st.getAll()) : Promise.resolve([...mem[s].values()]),
    del:(s,id)=> db? req(s,'readwrite',st=>st.delete(id)) : (mem[s].delete(id),Promise.resolve()),
    fotosDe:(aud)=> db? req('fotos','readonly',st=>st.index('aud').getAll(aud)) : Promise.resolve([...mem.fotos.values()].filter(f=>f.aud===aud))
  };
})();

/* ================= ESTADO ================= */
let A=null, passo=0, fotos=new Map(), lista=[], obsAberta=new Set();

/* ================= CÁLCULO ================= */
function itensDe(a){ const out=[]; a.tpl.forEach(s=>s.subs.forEach(sb=>sb.itens.forEach(it=>out.push({s,sb,it})))); return out; }
function calc(a){
  const setores={}; let tot=0,max=0,ko=0,na=0,resp=0,n=0;
  a.tpl.forEach(s=>setores[s.id]={pts:0,max:0,ko:0,resp:0,n:0,subs:{}});
  itensDe(a).forEach(({s,sb,it})=>{
    const S=setores[s.id]; S.subs[sb.id]=S.subs[sb.id]||{pts:0,max:0};
    const nota=a.respostas[it.id]?.nota; n++; S.n++;
    if(nota){resp++;S.resp++;}
    if(nota==='NA'){na++;return;}
    max+=20; S.max+=20; S.subs[sb.id].max+=20;
    if(nota){ const p=NOTAS[nota].p; tot+=p; S.pts+=p; S.subs[sb.id].pts+=p; if(nota==='KO'){ko++;S.ko++;} }
  });
  const desconto=ko*0.10*max, final=Math.max(0,tot-desconto);
  return {setores,tot,max,ko,na,resp,n,desconto,final,pct:pct(final,max)};
}

/* ================= PERSISTÊNCIA ================= */
let tSave=null;
async function salvar(imediato){
  if(!A) return;
  A.atualizada=Date.now();
  const snap=A;
  const go=async()=>{ try{ await DB.put('auditorias',snap); marcarSalvo(); }catch(e){ toast('Erro ao salvar: '+e.message); } };
  clearTimeout(tSave);
  if(imediato) return go();
  tSave=setTimeout(go,400);
}
function marcarSalvo(){ const el=document.getElementById('saved'); if(el) el.textContent='Salvo '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }

/* ================= HOME ================= */
async function irHome(){
  A=null; fotos=new Map(); obsAberta.clear();
  lista=(await DB.all('auditorias')).sort((a,b)=>b.atualizada-a.atualizada);
  renderHome(); window.scrollTo(0,0);
}
function syncTag(a){
  if(!SESSAO||a.status!=='concluida') return '';
  const s=a.sync?.estado;
  if(s==='ok') return '<span class="sync s-ok">☁ Enviada para o Drive</span>';
  if(s==='enviando') return '<span class="sync s-pend">⏳ Enviando…</span>';
  if(s==='erro') return `<span class="sync s-err">⚠ Falha no envio – tenta de novo sozinha</span>`;
  return '<span class="sync s-pend">⏳ Aguardando internet para enviar</span>';
}
function cardAud(a){
  const c=calc(a); const prog=Math.round(pct(c.resp,c.n)); const concl=a.status==='concluida';
  return `<div class="card acard" data-act="abrir" data-id="${a.id}">
    <div class="info">
      <b>${esc(a.dados.cliente||'Sem cliente')}</b>
      <small>${fmtData(dataAud(a))} · ${esc(a.dados.auditor||'')}</small>
      ${concl? syncTag(a) : `<div class="minibar"><i style="width:${prog}%"></i></div><small>${c.resp}/${c.n} itens respondidos</small>`}
    </div>
    <span class="pill">${concl? fmtN(c.pct)+'%' : prog+'%'}</span>
    <button class="more" data-act="menu" data-id="${a.id}" aria-label="Opções">⋯</button>
  </div>`;
}
function cardRemota(r){
  return `<div class="card acard">
    <div class="info"><b>${esc(r.cliente||'Sem cliente')}</b>
      <small>${fmtData(r.data)} · ${esc(r.auditor||'')}</small>
      <span class="sync s-ok">☁ No Drive</span></div>
    <span class="pill">${fmtN(r.pct)}%</span>
    ${r.pdf?`<a class="pill" href="${esc(r.pdf)}" target="_blank" rel="noopener">PDF</a>`:''}
  </div>`;
}
function renderHome(){
  const abertas=lista.filter(a=>a.status!=='concluida');
  const locais=lista.filter(a=>a.status==='concluida');
  let remotas=[]; try{ remotas=JSON.parse(LS.get('hauke_remotas')||'[]'); }catch(e){}
  const ids=new Set(lista.map(a=>a.id));
  const hist=[...locais.map(a=>({t:dataAud(a),h:cardAud(a)})), ...remotas.filter(r=>!ids.has(r.id)).map(r=>({t:new Date(r.data).getTime()||0,h:cardRemota(r)}))].sort((x,y)=>y.t-x.t);
  $app.innerHTML=`
  <div class="top"><div class="top-in"><div class="title">Auditorias</div>
    ${SESSAO?'<button class="iconbtn" data-act="menuApp" aria-label="Menu">⋯</button>':'<span class="brand">HAUKE ENGENHARIA</span>'}</div></div>
  ${DB.ok?'':'<div class="banner">Armazenamento local indisponível neste navegador — os dados ficam só enquanto a página estiver aberta.</div>'}
  ${configurado()?'':'<div class="banner">Envio para o Drive não configurado — auditorias ficam só neste aparelho.</div>'}
  ${senhaRecusada?'<div class="banner" style="background:#fde8e1;color:#8a2c12">O Apps Script recusou a senha: a senha gravada nele (configurarSenha) é diferente da usada no config.js. As auditorias continuam salvas no aparelho.</div>':''}
  <div class="wrap">
    <div id="instBox">${htmlInstalar()}</div>
    <div class="hero">
      <h1>Auditoria de Instalações – Qualidade</h1>
      <p>Checklist por setores com notas A–D, K.O e N/A, fotos e relatório em PDF. Funciona sem internet.</p>
      <button class="btn btn-w" data-act="nova">＋ Nova auditoria</button>
    </div>
    <h2 class="sec">Em andamento (${abertas.length})</h2>
    ${abertas.length? abertas.map(cardAud).join('') : '<div class="empty">Nenhuma auditoria em aberto neste aparelho.</div>'}
    <h2 class="sec">Histórico (${hist.length})</h2>
    ${hist.length? hist.map(x=>x.h).join('') : '<div class="empty">As auditorias concluídas aparecem aqui.</div>'}
  </div>`;
}

async function novaAuditoria(){
  const agora=new Date(); agora.setSeconds(0,0);
  const local=new Date(agora.getTime()-agora.getTimezoneOffset()*60000).toISOString().slice(0,16);
  A={ id:uid('aud_'), status:'aberta', criada:Date.now(), atualizada:Date.now(), tpl:montarModelo(),
      dados:{auditor:LS.get('hauke_auditor')||'', cliente:'', data:local, local:'', lat:null, lng:null, precisao:null, produtos:'', acompanhantes:'', anterior:'N/D'},
      respostas:{}, fotosEnviadas:{} };
  fotos=new Map(); passo=0;
  await salvar(true); renderAudit();
}
async function abrirAuditoria(id){
  const a=await DB.get('auditorias',id); if(!a){toast('Auditoria não encontrada');return;}
  A=a; fotos=new Map(); obsAberta.clear();
  (await DB.fotosDe(id)).forEach(f=>fotos.set(f.id,f));
  passo = A.status==='concluida' ? totalPassos()-1 : (A.ultimoPasso ?? 0);
  renderAudit(); window.scrollTo(0,0);
}

/* ================= AUDITORIA ================= */
const totalPassos=()=>A.tpl.length+3;
const ro=()=>A.status==='concluida';
function ir(p){ passo=Math.max(0,Math.min(totalPassos()-1,p)); A.ultimoPasso=passo; if(!ro()) salvar(); renderAudit(); window.scrollTo(0,0); }

function renderAudit(){
  const c=calc(A); const N=A.tpl.length;
  const tabs=[{l:'Dados'},{l:'Notas'}, ...A.tpl.map(s=>{const S=c.setores[s.id];return {l:`${s.id}. ${s.curto}`,c:`${S.resp}/${S.n}`,done:S.resp===S.n};}), {l:'Resumo'}];
  let corpo='';
  if(passo===0) corpo=vDados();
  else if(passo===1) corpo=vNotas();
  else if(passo<N+2) corpo=vSetor(A.tpl[passo-2]);
  else corpo=vResumo(c);
  const ultimo=passo===N+2;
  $app.innerHTML=`
  <div class="top">
    <div class="top-in">
      <button class="iconbtn" data-act="home">‹ Início</button>
      <div class="title">${esc(A.dados.cliente||'Nova auditoria')}</div>
      <span class="saved" id="saved">${ro()?'Concluída':'Salvo'}</span>
    </div>
    <div class="prog"><i style="width:${pct(c.resp,c.n)}%"></i></div>
    <div class="tabs" id="tabs">${tabs.map((t,i)=>`<button class="tab ${i===passo?'on':''} ${t.done?'done':''}" data-act="ir" data-p="${i}">${esc(t.l)}${t.c?`<span class="c">${t.c}</span>`:''}</button>`).join('')}</div>
  </div>
  <div class="wrap ${ro()?'ro':''}">${corpo}</div>
  <div class="bottom"><div class="bottom-in">
    ${passo>0?'<button class="btn btn-g" data-act="ant">‹ Anterior</button>':''}
    ${ultimo
      ? (ro()? '<button class="btn btn-p" data-act="pdf">Gerar PDF</button>' : '<button class="btn btn-p" data-act="finalizar">Finalizar auditoria</button>')
      : `<button class="btn btn-p" data-act="prox">${passo===0?'Continuar':passo===N+1?'Ver resumo':'Próximo setor'} ›</button>`}
  </div></div>`;
  const on=document.querySelector('.tab.on'); if(on) on.scrollIntoView({inline:'center',block:'nearest'});
}

function vGeo(){
  const d=A.dados;
  const coords = d.lat!=null ? `<small>📍 ${d.lat}, ${d.lng}${d.precisao?` (±${d.precisao} m)`:''}</small> <a class="linkbtn" href="${mapsUrl(d.lat,d.lng)}" target="_blank" rel="noopener">Ver no mapa</a>` : '';
  if(ro()) return coords?`<div class="geo">${coords}</div>`:'';
  return `<div class="geo"><button class="tbtn" data-act="geo" id="geoBtn">📍 Usar localização atual</button>${coords}
    ${d.lat!=null && !d.local ? '<button class="linkbtn" data-act="geoEnd">Buscar endereço</button>':''}</div>`;
}
function vDados(){
  const d=A.dados; const dis=ro()?'disabled':'';
  return `<div class="sechead"><h3>Dados da auditoria</h3><small>Preencha antes de iniciar a avaliação.</small></div>
  <div class="card">
    <div class="field"><label>Responsável pela auditoria <span class="req">*</span></label><input data-f="auditor" value="${esc(d.auditor)}" ${dis} autocomplete="name"></div>
    <div class="field"><label>Cliente <span class="req">*</span></label><input data-f="cliente" value="${esc(d.cliente)}" ${dis} placeholder="Ex.: Albaruska"></div>
    <div class="field"><label>Data de realização</label><input type="datetime-local" data-f="data" value="${esc(d.data)}" ${dis}></div>
    <div class="field"><label>Localização</label><textarea data-f="local" id="fLocal" rows="2" ${dis} placeholder="Endereço / município">${esc(d.local)}</textarea><div id="geoBox">${vGeo()}</div></div>
    <div class="field"><label>Produtos fabricados na instalação</label><input data-f="produtos" value="${esc(d.produtos)}" ${dis}></div>
    <div class="field"><label>Funcionários que acompanharam a auditoria</label><input data-f="acompanhantes" value="${esc(d.acompanhantes)}" ${dis}></div>
    <div class="field"><label>Houve auditoria anterior?</label>
      <div class="seg">${['Sim','Não','N/D'].map(o=>`<button data-act="anterior" data-v="${o}" class="${d.anterior===o?'on':''}" ${dis}>${o}</button>`).join('')}</div></div>
    <div id="errDados"></div>
  </div>`;
}
function vNotas(){
  return `<div class="sechead"><h3>Informações e orientações</h3><small>Como cada item é pontuado durante a auditoria.</small></div>
  <div class="leg">
    <div class="h">Nota</div><div class="h">Explicação</div><div class="h">Pontuação</div>
    ${ORDEM.map(k=>`<div><span class="badge b${k}">${NOTAS[k].lbl}</span></div><div>${NOTAS[k].txt}</div><div style="font-size:12px;max-width:120px">${NOTAS[k].pts}</div>`).join('')}
  </div>
  <div class="note"><b>Como o resultado é calculado:</b> cada item vale até 20 pontos. Itens N/A saem do total possível. Cada K.O. desconta 10% da pontuação total possível do resultado final. Fotos e observações podem ser adicionadas em qualquer item, independente da nota.</div>`;
}
function vItem(it){
  const r=A.respostas[it.id]||{}; const fs=r.fotos||[];
  const showObs=obsAberta.has(it.id)||!!r.obs;
  return `<div class="item ${r.nota?'answered':''}" id="it-${it.id.replace(/\./g,'-')}">
    <div class="q"><span class="num">${it.id}</span>${esc(it.t)}</div>
    <div class="notas">${ORDEM.map(k=>`<button class="nb n-${k} ${r.nota===k?'on':''}" data-act="nota" data-id="${it.id}" data-n="${k}">${NOTAS[k].lbl}</button>`).join('')}</div>
    <div class="tools">
      <label class="tbtn ${fs.length?'has':''}">📷 Fotos${fs.length?` (${fs.length})`:''}<input type="file" accept="image/*" multiple data-act="foto" data-id="${it.id}" ${ro()?'disabled':''}></label>
      <button class="tbtn ${r.obs?'has':''}" data-act="obs" data-id="${it.id}">✎ Observação</button>
    </div>
    ${showObs?`<textarea class="obs" data-act="obstxt" data-id="${it.id}" placeholder="Descreva a constatação…" ${ro()?'readonly':''}>${esc(r.obs||'')}</textarea>`:''}
    ${fs.length?`<div class="thumbs">${fs.map(fid=>{const f=fotos.get(fid);return f?`<div class="th"><img src="${f.data}" data-act="ver" data-f="${fid}" alt=""><button data-act="delfoto" data-id="${it.id}" data-f="${fid}" aria-label="Remover">×</button></div>`:'';}).join('')}</div>`:''}
  </div>`;
}
function vSetor(s){
  const S=calc(A).setores[s.id];
  return `<div class="sechead"><h3>${s.id} – ${esc(s.nome)}</h3><small>${S.resp} de ${S.n} itens avaliados</small></div>
  ${s.subs.map(sb=>`${sb.nome?`<div class="sub">${sb.id} – ${esc(sb.nome)}</div>`:''}${sb.itens.map(vItem).join('')}`).join('')}`;
}
function vResumo(c){
  const R=46, C=2*Math.PI*R, off=C*(1-Math.min(100,c.pct)/100);
  const corPct=c.pct>=85?'#1f9d55':c.pct>=70?'#7cb342':c.pct>=50?'#f2a516':'#e4572e';
  const pend=c.n-c.resp;
  const atencao=itensDe(A).filter(({it})=>['C','D','KO'].includes(A.respostas[it.id]?.nota));
  const s=A.sync||{};
  return `<div class="sechead"><h3>Resumo da auditoria</h3><small>${esc(A.dados.cliente)} · ${fmtData(dataAud(A))}</small></div>
  ${ro()?`<div class="ok">Auditoria concluída em ${fmtData(A.concluida)}.${SESSAO? (s.estado==='ok'?' Enviada para o Drive.':' Envio para o Drive pendente — acontece sozinho quando houver internet.'):''}</div>`
       : pend?`<div class="warn"><b>${pend} ${pend>1?'itens sem resposta':'item sem resposta'}.</b> Itens sem nota contam como pontuação possível não atingida. <a href="#" data-act="pendente" style="color:inherit">Ir para o primeiro</a></div>`:`<div class="ok">Todos os itens foram avaliados.</div>`}
  <div class="card score">
    <svg class="ring" viewBox="0 0 110 110"><circle cx="55" cy="55" r="${R}" fill="none" stroke="#e9edf2" stroke-width="12"/><circle cx="55" cy="55" r="${R}" fill="none" stroke="${corPct}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 55 55)"/><text x="55" y="61" text-anchor="middle" font-size="20" font-weight="800" fill="#0d2f5e">${Math.round(c.pct)}%</text></svg>
    <div style="flex:1">
      <div class="big">${fmtN(c.final)} / ${fmtN(c.max)}</div>
      <div class="kv"><span>Pontos obtidos</span><b>${fmtN(c.tot)}</b></div>
      ${c.ko?`<div class="kv"><span>Desconto K.O. (${c.ko}×10%)</span><b style="color:var(--KO)">−${fmtN(c.desconto)}</b></div>`:''}
      <div class="kv"><span>Itens N/A</span><b>${c.na}</b></div>
    </div>
  </div>
  <h2 class="sec">Por setor</h2>
  <div class="card">${A.tpl.map(st=>{const S=c.setores[st.id];const p=pct(S.pts,S.max);const cor=p>=85?'#1f9d55':p>=70?'#7cb342':p>=50?'#f2a516':'#e4572e';
    return `<div class="srow" data-act="ir" data-p="${A.tpl.indexOf(st)+2}" style="cursor:pointer"><div class="t"><span>${st.id}. ${esc(st.nome)}${S.ko?` <span class="badge bKO" style="height:20px;min-width:0;font-size:11px">${S.ko} K.O</span>`:''}</span><span>${fmtN(S.pts)}/${fmtN(S.max)} (${fmtN(p)}%)</span></div><div class="bar"><i style="width:${p}%;background:${cor}"></i></div></div>`;}).join('')}</div>
  <h2 class="sec">Pontos de atenção (C, D e K.O) – ${atencao.length}</h2>
  <div class="card">${atencao.length? atencao.map(({s:st,it})=>{const r=A.respostas[it.id];return `<div class="nc" data-act="irItem" data-id="${it.id}" data-p="${A.tpl.indexOf(st)+2}"><span class="badge b${r.nota}">${NOTAS[r.nota].lbl}</span><span class="t"><b>${it.id}</b> ${esc(it.t)}${r.obs?`<br><small style="color:var(--mute)">${esc(r.obs)}</small>`:''}</span></div>`;}).join('') : '<div class="empty">Nenhum item com nota C, D ou K.O.</div>'}</div>
  <div class="stack" style="margin-top:16px">
    <button class="btn btn-g btn-block" data-act="pdf">📄 Gerar PDF do relatório</button>
    ${s.estado==='ok'&&s.pdfUrl?`<a class="btn btn-g btn-block" style="display:block;text-align:center;text-decoration:none" href="${esc(s.pdfUrl)}" target="_blank" rel="noopener">☁ Abrir PDF no Drive</a>`:''}
    ${ro()?'<button class="btn btn-g btn-block" data-act="reabrir">Reabrir para edição</button>':''}
  </div>`;
}

/* ================= EVENTOS ================= */
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-act]'); if(!el) return;
  const act=el.dataset.act;
  if(['foto','obstxt'].includes(act)) return;
  if(act==='menu'){ e.stopPropagation(); e.preventDefault(); return menuAud(el.dataset.id); }
  e.preventDefault();
  switch(act){
    case 'nova': return novaAuditoria();
    case 'abrir': return abrirAuditoria(el.dataset.id);
    case 'home': await salvar(true); return irHome();
    case 'menuApp': return menuApp();
    case 'instalar': return instalarApp();
    case 'instDepois': LS.set('hauke_inst_ate',String(Date.now()+3*864e5)); return atualizarInstalar();
    case 'ir': if(passo===0 && !validarDados()) return; return ir(+el.dataset.p);
    case 'ant': return ir(passo-1);
    case 'prox': if(passo===0 && !validarDados()) return; return ir(passo+1);
    case 'anterior': if(ro())return; A.dados.anterior=el.dataset.v; salvar(); el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el)); return;
    case 'geo': return pegarLocalizacao();
    case 'geoEnd': return buscarEndereco(true);
    case 'nota': return setNota(el.dataset.id, el.dataset.n);
    case 'obs': { const id=el.dataset.id; obsAberta.has(id)&&!A.respostas[id]?.obs?obsAberta.delete(id):obsAberta.add(id); reItem(id); const ta=document.querySelector(`#it-${id.replace(/\./g,'-')} textarea`); if(ta&&!ro()) ta.focus(); return; }
    case 'delfoto': return confirmar('Remover foto?','A foto será apagada desta auditoria.','Remover',async()=>{ const r=A.respostas[el.dataset.id]; r.fotos=r.fotos.filter(f=>f!==el.dataset.f); fotos.delete(el.dataset.f); await DB.del('fotos',el.dataset.f); salvar(); reItem(el.dataset.id); });
    case 'ver': return verFoto(el.dataset.f);
    case 'finalizar': return finalizar();
    case 'reabrir': A.status='aberta'; delete A.concluida; A.sync=null; await salvar(true); toast('Auditoria reaberta'); return renderAudit();
    case 'pdf': return pdfLocal();
    case 'pendente': { const p=itensDe(A).find(({it})=>!A.respostas[it.id]?.nota); if(p) irItem(A.tpl.indexOf(p.s)+2,p.it.id); return; }
    case 'irItem': return irItem(+el.dataset.p, el.dataset.id);
  }
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.dataset.f && A && !ro()){ A.dados[el.dataset.f]=el.value; if(el.dataset.f==='auditor') LS.set('hauke_auditor',el.value);
    if(el.dataset.f==='cliente'){const t=document.querySelector('.title'); if(t) t.textContent=el.value||'Nova auditoria';}
    salvar(); }
  if(el.dataset.act==='obstxt' && !ro()){ const r=resp(el.dataset.id); r.obs=el.value; salvar(); }
});
document.addEventListener('change',async e=>{
  const el=e.target; if(el.dataset.act!=='foto') return;
  const id=el.dataset.id; const files=[...el.files]; el.value='';
  if(!files.length) return;
  toast(`Processando ${files.length} foto(s)…`);
  const r=resp(id); r.fotos=r.fotos||[];
  for(const f of files){
    try{ const p=await processarImg(f); const fid=uid('f_'); const rec={id:fid,aud:A.id,item:id,...p};
      await DB.put('fotos',rec); fotos.set(fid,rec); r.fotos.push(fid);
    }catch(err){ toast('Não foi possível ler uma das imagens'); }
  }
  await salvar(true); reItem(id); toast('Foto(s) adicionada(s)');
});

function resp(id){ return A.respostas[id]=A.respostas[id]||{}; }
function setNota(id,n){ if(ro()) return; const r=resp(id); r.nota = r.nota===n ? null : n; salvar(); reItem(id); atualizarTopo(); }
function reItem(id){ const el=document.getElementById('it-'+id.replace(/\./g,'-')); if(!el) return; const it=itensDe(A).find(x=>x.it.id===id).it; el.outerHTML=vItem(it); }
function atualizarTopo(){
  const c=calc(A);
  document.querySelector('.prog>i').style.width=pct(c.resp,c.n)+'%';
  document.querySelectorAll('.tab').forEach((t,i)=>{ if(i>=2&&i<A.tpl.length+2){const S=c.setores[A.tpl[i-2].id]; t.querySelector('.c').textContent=`${S.resp}/${S.n}`; t.classList.toggle('done',S.resp===S.n);} });
  const sm=document.querySelector('.sechead small'); if(sm&&passo>=2&&passo<A.tpl.length+2){const S=c.setores[A.tpl[passo-2].id]; sm.textContent=`${S.resp} de ${S.n} itens avaliados`;}
}
function irItem(p,id){ ir(p); setTimeout(()=>{const el=document.getElementById('it-'+id.replace(/\./g,'-')); if(el){el.scrollIntoView({block:'start'}); el.style.boxShadow='0 0 0 3px #7fc4ff'; setTimeout(()=>el.style.boxShadow='',1500);}},50); }
function validarDados(){
  const faltam=[]; if(!A.dados.auditor.trim()) faltam.push('responsável'); if(!A.dados.cliente.trim()) faltam.push('cliente');
  const box=document.getElementById('errDados');
  if(faltam.length){ if(box) box.innerHTML=`<div class="err">Informe: ${faltam.join(' e ')}.</div>`; else toast('Preencha os dados obrigatórios'); if(passo!==0) ir(0); return false; }
  return true;
}
function finalizar(){
  const c=calc(A); const pend=c.n-c.resp;
  const envio = SESSAO ? ' Ela será enviada para o Drive (agora ou quando houver internet).' : '';
  confirmar('Finalizar auditoria?', (pend?`Ainda há ${pend} item(ns) sem resposta; eles contarão como não atingidos. `:'')+'A auditoria vai para o histórico e pode ser reaberta.'+envio,'Finalizar',async()=>{
    A.status='concluida'; A.concluida=Date.now(); A.sync={estado:'pendente'}; await salvar(true); toast('Auditoria concluída'); renderAudit(); sincronizar();
  });
}

/* ================= LOCALIZAÇÃO ================= */
function pegarLocalizacao(){
  if(!('geolocation' in navigator)){ toast('Este aparelho não oferece localização'); return; }
  const b=document.getElementById('geoBtn'); if(b){ b.textContent='📍 Localizando…'; b.disabled=true; }
  navigator.geolocation.getCurrentPosition(async pos=>{
    if(!A) return;
    A.dados.lat=+pos.coords.latitude.toFixed(6); A.dados.lng=+pos.coords.longitude.toFixed(6);
    A.dados.precisao=Math.round(pos.coords.accuracy||0);
    await salvar(true);
    const achou=await buscarEndereco(false);
    if(!achou) toast(navigator.onLine?'Coordenadas salvas (endereço não encontrado)':'Sem internet: coordenadas salvas. Busque o endereço depois.');
    atualizarGeo();
  },err=>{
    const m={1:'Permissão de localização negada. Libere nas configurações do navegador.',2:'Não foi possível obter a localização.',3:'A localização demorou demais. Tente de novo.'}[err.code]||'Erro de localização';
    toast(m); atualizarGeo();
  },{enableHighAccuracy:true,timeout:20000,maximumAge:60000});
}
async function buscarEndereco(manual){
  const d=A.dados; if(d.lat==null) return false;
  if(!navigator.onLine){ if(manual) toast('Sem internet no momento'); return false; }
  try{
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${d.lat}&lon=${d.lng}&zoom=18&addressdetails=1&accept-language=pt-BR`);
    const j=await r.json(); const ad=j.address||{};
    const uf=(ad['ISO3166-2-lvl4']||'').replace('BR-','')||ad.state||'';
    const linha1=[ad.road,ad.house_number].filter(Boolean).join(', ');
    const bairro=ad.suburb||ad.neighbourhood||ad.village||ad.hamlet||ad.quarter||'';
    const cidade=ad.city||ad.town||ad.municipality||ad.village||'';
    const partes=[linha1,bairro!==cidade?bairro:'',[cidade,uf].filter(Boolean).join(' – '),ad.postcode].filter(Boolean);
    const end=partes.join(', ')||j.display_name;
    if(!end) return false;
    d.local=end; await salvar(true);
    const f=document.getElementById('fLocal'); if(f) f.value=end;
    atualizarGeo(); toast('Localização preenchida');
    return true;
  }catch(e){ if(manual) toast('Não foi possível buscar o endereço'); return false; }
}
function atualizarGeo(){ const g=document.getElementById('geoBox'); if(g&&A) g.innerHTML=vGeo(); }

/* ================= MODAIS ================= */
function modalAcoes(titulo,texto,acoes){
  const m=document.createElement('div'); m.className='modal';
  m.innerHTML=`<div class="mbox"><h4>${esc(titulo)}</h4>${texto?`<p>${esc(texto)}</p>`:''}<div class="stack">${acoes.map((a,i)=>`<button class="btn ${a.cls||'btn-g'} btn-block" data-i="${i}">${esc(a.label)}</button>`).join('')}<button class="btn btn-g btn-block" data-x>Cancelar</button></div></div>`;
  m.addEventListener('click',ev=>{ ev.stopPropagation(); const b=ev.target.closest('button'); if(ev.target===m||b?.hasAttribute('data-x')) return m.remove(); if(b?.dataset.i){ m.remove(); acoes[+b.dataset.i].fn(); } });
  document.body.appendChild(m);
}
function confirmar(titulo,texto,ok,fn,cls='btn-p'){
  const m=document.createElement('div'); m.className='modal';
  m.innerHTML=`<div class="mbox"><h4>${esc(titulo)}</h4><p>${esc(texto)}</p><div class="mbtns"><button class="btn btn-g" data-x>Cancelar</button><button class="btn ${cls}" data-ok>${esc(ok)}</button></div></div>`;
  m.addEventListener('click',ev=>{ ev.stopPropagation(); if(ev.target===m||ev.target.hasAttribute('data-x')) m.remove(); if(ev.target.hasAttribute('data-ok')){ m.remove(); fn(); } });
  document.body.appendChild(m);
}
function verFoto(fid){
  const f=fotos.get(fid); if(!f) return;
  const v=document.createElement('div'); v.className='viewer';
  v.innerHTML=`<img src="${f.data}" alt=""><button class="iconbtn">Fechar ✕</button>`;
  v.addEventListener('click',ev=>{ev.stopPropagation(); v.remove();}); document.body.appendChild(v);
}
async function apagarLocal(id){
  for(const f of await DB.fotosDe(id)) await DB.del('fotos',f.id);
  await DB.del('auditorias',id);
}
function menuAud(id){
  const a=lista.find(x=>x.id===id); if(!a) return;
  const nome=a.dados.cliente||'Sem cliente';
  const acoes=[];
  if(a.status==='concluida'&&a.sync?.estado==='ok'){
    acoes.push({label:'Remover deste aparelho',fn:()=>confirmar('Remover do aparelho?',`"${nome}" continua salva no Drive e no histórico. Só as fotos e dados locais deste celular são apagados.`,'Remover',async()=>{await apagarLocal(id);toast('Removida do aparelho');irHome();})});
  } else {
    if(a.status==='concluida'&&SESSAO) acoes.push({label:'Tentar enviar agora',fn:()=>sincronizar(true)});
    acoes.push({label:'Excluir auditoria',cls:'btn-r',fn:()=>confirmar('Excluir auditoria?',`"${nome}" e todas as fotos serão apagadas deste aparelho${a.status==='concluida'?' e ela ainda não foi enviada para o Drive':''}. Não dá para desfazer.`,'Excluir',async()=>{await apagarLocal(id);toast('Auditoria excluída');irHome();},'btn-r')});
  }
  modalAcoes(nome,'',acoes);
}
function menuApp(){
  modalAcoes('Auditorias Hauke','',[
    {label:'Sincronizar agora',fn:()=>sincronizar(true)},
    {label:'Sair (esquecer a senha neste aparelho)',fn:()=>confirmar('Sair?','A senha será pedida de novo na próxima abertura. Auditorias deste aparelho não são apagadas.','Sair',()=>sair())}
  ]);
}

/* ================= FOTOS ================= */
function processarImg(file){
  return new Promise((res,rej)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{ const max=1280; let w=img.naturalWidth,h=img.naturalHeight; const k=Math.min(1,max/Math.max(w,h)); w=Math.round(w*k); h=Math.round(h*k);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url); res({data:cv.toDataURL('image/jpeg',0.72),w,h}); };
    img.onerror=()=>{URL.revokeObjectURL(url); rej(new Error('imagem inválida'));};
    img.src=url;
  });
}

/* ================= PDF ================= */
const nomePdf=a=>`Auditoria_${(a.dados.cliente||'cliente').replace(/[^\wÀ-ÿ-]+/g,'_')}_${(a.dados.data||'').slice(0,10)}.pdf`;
function montarPDF(a,fm){
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'});
  const W=210,H=297,M=14,CW=W-2*M; let y=M;
  const c=calc(a); const d=a.dados;
  const dataTxt=fmtData(dataAud(a));
  const need=h=>{ if(y+h>H-16){ doc.addPage(); y=M; } };
  const txt=(s,x,yy,o)=>doc.text(String(s),x,yy,o);
  const corPct=p=>p>=85?'#1f9d55':p>=70?'#7cb342':p>=50?'#f2a516':'#e4572e';

  doc.setFillColor('#0d2f5e'); doc.rect(0,0,W,32,'F');
  doc.setTextColor('#ffffff'); doc.setFont('helvetica','bold'); doc.setFontSize(15);
  txt('RELATÓRIO DE AUDITORIA – INSTALAÇÕES – QUALIDADE',M,13);
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  txt(`${d.cliente}  |  ${dataTxt}  |  ${d.auditor}`,M,21);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); txt('HAUKE ENGENHARIA',W-M,27,{align:'right'});
  doc.setFont('helvetica','normal'); txt(a.status==='concluida'?'Concluída':'Em andamento',M,27);
  y=40;

  doc.setDrawColor('#dfe4ea'); doc.setFillColor('#f3f5f8'); doc.roundedRect(M,y,CW,26,3,3,'FD');
  doc.setTextColor('#6b7685'); doc.setFontSize(9); txt('RESULTADO',M+5,y+7);
  doc.setTextColor('#0d2f5e'); doc.setFont('helvetica','bold'); doc.setFontSize(20);
  txt(`${fmtN(c.final)} / ${fmtN(c.max)}  (${fmtN(c.pct)}%)`,M+5,y+17);
  doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor('#6b7685');
  txt(`Pontos obtidos: ${fmtN(c.tot)}   |   K.O.: ${c.ko}${c.ko?` (−${fmtN(c.desconto)})`:''}   |   N/A: ${c.na}   |   Respondidos: ${c.resp}/${c.n}`,M+5,y+23);
  doc.setFillColor('#e9edf2'); doc.rect(M+120,y+12,CW-125,4,'F'); doc.setFillColor(corPct(c.pct)); doc.rect(M+120,y+12,(CW-125)*Math.min(100,c.pct)/100,4,'F');
  y+=33;

  const loc=[d.local||'', d.lat!=null?`Coordenadas: ${d.lat}, ${d.lng}`:''].filter(Boolean).join('\n')||'-';
  const linhas=[['Cliente',d.cliente],['Data de realização',dataTxt],['Responsável pela auditoria',d.auditor],['Funcionários que acompanharam',d.acompanhantes||'-'],['Localização',loc],['Produtos fabricados na instalação',d.produtos||'-'],['Houve auditoria anterior',d.anterior||'N/D']];
  doc.setFontSize(9.5);
  linhas.forEach(([k,v])=>{ const vl=doc.splitTextToSize(String(v),CW-70); const temMapa=k==='Localização'&&d.lat!=null; const h=Math.max(1,vl.length)*4.4+3+(temMapa?4.4:0); need(h);
    doc.setTextColor('#6b7685'); doc.setFont('helvetica','normal'); txt(k,M,y+4);
    doc.setTextColor('#1b2430'); doc.setFont('helvetica','bold'); doc.text(vl,M+70,y+4);
    if(temMapa){ doc.setTextColor('#1d5fae'); doc.setFont('helvetica','normal'); doc.textWithLink('Ver no mapa',M+70,y+4+vl.length*4.4,{url:mapsUrl(d.lat,d.lng)}); }
    doc.setDrawColor('#e5e9ee'); doc.line(M,y+h-0.5,W-M,y+h-0.5); y+=h; });
  y+=6;

  need(14); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor('#0d2f5e'); txt('Resumo por setor',M,y); y+=5;
  doc.setFontSize(9);
  a.tpl.forEach(s=>{ const S=c.setores[s.id]; const p=pct(S.pts,S.max); need(9);
    doc.setTextColor('#1b2430'); doc.setFont('helvetica','normal'); txt(`${s.id} – ${s.nome}${S.ko?`  (${S.ko} K.O)`:''}`,M,y+4);
    doc.setFont('helvetica','bold'); txt(`${fmtN(S.pts)} / ${fmtN(S.max)} (${fmtN(p)}%)`,W-M,y+4,{align:'right'});
    doc.setFillColor('#e9edf2'); doc.rect(M,y+5.5,CW,1.8,'F'); doc.setFillColor(corPct(p)); doc.rect(M,y+5.5,CW*p/100,1.8,'F'); y+=9.5; });
  y+=4;

  need(30); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor('#0d2f5e'); txt('Critérios de pontuação',M,y); y+=4;
  doc.setFontSize(8.5);
  ORDEM.forEach(k=>{ need(6); doc.setFillColor(COR[k]); doc.roundedRect(M,y,11,4.6,1,1,'F'); doc.setTextColor('#ffffff'); doc.setFont('helvetica','bold'); txt(NOTAS[k].lbl,M+5.5,y+3.4,{align:'center'});
    doc.setTextColor('#1b2430'); doc.setFont('helvetica','normal'); txt(`${NOTAS[k].txt} – ${NOTAS[k].pts}`,M+14,y+3.4); y+=6; });

  for(const s of a.tpl){
    const S=c.setores[s.id];
    doc.addPage(); y=M;
    doc.setFillColor('#0d2f5e'); doc.rect(M,y,CW,10,'F'); doc.setTextColor('#ffffff'); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    txt(`${s.id} – ${s.nome}`,M+3,y+6.7); txt(`${fmtN(S.pts)} / ${fmtN(S.max)} (${fmtN(pct(S.pts,S.max))}%)`,W-M-3,y+6.7,{align:'right'}); y+=14;
    for(const sb of s.subs){
      if(sb.nome){ const sp=S.subs[sb.id]; need(10); doc.setFillColor('#e8f0fa'); doc.rect(M,y,CW,7,'F'); doc.setTextColor('#1d5fae'); doc.setFontSize(9.5);
        txt(`${sb.id} – ${sb.nome.toUpperCase()}`,M+2,y+4.8); txt(`${fmtN(sp.pts)} / ${fmtN(sp.max)} (${fmtN(pct(sp.pts,sp.max))}%)`,W-M-2,y+4.8,{align:'right'}); y+=10; }
      for(const it of sb.itens){
        const r=a.respostas[it.id]||{};
        doc.setFont('helvetica','normal'); doc.setFontSize(9.5);
        const ql=doc.splitTextToSize(`${it.id} – ${it.t}`,CW-22);
        const ol=r.obs? doc.splitTextToSize(r.obs,CW-22):[];
        need(ql.length*4.3+(ol.length?ol.length*4+2:0)+4);
        doc.setTextColor('#1b2430'); doc.text(ql,M,y+4);
        if(r.nota){ doc.setFillColor(COR[r.nota]); doc.roundedRect(W-M-14,y,14,6,1.2,1.2,'F'); doc.setTextColor('#ffffff'); doc.setFont('helvetica','bold'); doc.setFontSize(9); txt(NOTAS[r.nota].lbl,W-M-7,y+4.2,{align:'center'}); }
        else { doc.setTextColor('#9aa3af'); doc.setFontSize(8); txt('sem resposta',W-M,y+4,{align:'right'}); }
        y+=ql.length*4.3+1.5;
        if(ol.length){ doc.setFont('helvetica','italic'); doc.setFontSize(9); doc.setTextColor('#4a5563'); doc.setFillColor('#fff8e6'); doc.rect(M,y-0.5,CW-20,ol.length*4+2,'F'); doc.text(ol,M+2,y+3); y+=ol.length*4+3; }
        const fs=(r.fotos||[]).map(f=>fm.get(f)).filter(Boolean);
        if(fs.length){
          const colW=(CW-6)/2, maxH=62; let col=0, rowH=0;
          for(const f of fs){
            let w=colW, h=w*f.h/f.w; if(h>maxH){ h=maxH; w=h*f.w/f.h; }
            if(col===0){ need(h+3); }
            const x=M+col*(colW+6)+(colW-w)/2;
            try{ doc.addImage(f.data,'JPEG',x,y,w,h); }catch(e){}
            rowH=Math.max(rowH,h);
            col++; if(col===2){ col=0; y+=rowH+3; rowH=0; }
          }
          if(col===1) y+=rowH+3;
        }
        doc.setDrawColor('#e5e9ee'); doc.line(M,y+1,W-M,y+1); y+=4;
      }
    }
  }
  const np=doc.getNumberOfPages();
  for(let i=1;i<=np;i++){ doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor('#8a94a3');
    txt(`Hauke Engenharia – Auditoria ${d.cliente} – ${dataTxt}`,M,H-8); txt(`${i}/${np}`,W-M,H-8,{align:'right'}); }
  return doc.output('blob');
}
async function pdfLocal(){
  if(!window.jspdf){ toast('Gerador de PDF não carregou.'); return; }
  toast('Gerando PDF…'); await new Promise(r=>setTimeout(r,30));
  const blob=montarPDF(A,fotos); const nome=nomePdf(A);
  const file=new File([blob],nome,{type:'application/pdf'});
  const baixar=()=>{ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=nome; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(url); a.remove();},5000); };
  if(navigator.canShare && navigator.canShare({files:[file]})){
    modalAcoes('PDF pronto',nome,[
      {label:'Compartilhar (WhatsApp, e-mail, Arquivos…)',cls:'btn-p',fn:()=>navigator.share({files:[file],title:nome}).catch(()=>{})},
      {label:'Baixar',fn:baixar}
    ]);
  } else baixar();
}

/* ================= ENVIO PARA O DRIVE (Apps Script) ================= */
async function api(acao,dados){
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),120000);
  try{
    const r=await fetch(SESSAO.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({acao,senha:SESSAO.senha,...dados}),signal:ctrl.signal,redirect:'follow'});
    const j=await r.json();
    if(!j.ok){ const e=new Error(j.erro||'erro no servidor'); e.code=j.erro; throw e; }
    return j;
  } finally { clearTimeout(t); }
}
async function gravarSync(id,sync,fotosEnviadas){
  const atual=await DB.get('auditorias',id); if(!atual) return;
  atual.sync=sync; if(fotosEnviadas) atual.fotosEnviadas=fotosEnviadas;
  await DB.put('auditorias',atual);
  if(A&&A.id===id){ A.sync=sync; if(fotosEnviadas) A.fotosEnviadas=fotosEnviadas; }
}
function paraServidor(a,c){
  const env=a.fotosEnviadas||{};
  return {
    id:a.id, dados:a.dados, criada:a.criada, concluida:a.concluida,
    resultado:{pontos:c.tot,maximo:c.max,desconto:c.desconto,final:c.final,pct:c.pct,ko:c.ko,na:c.na,respondidos:c.resp,total:c.n},
    setores:a.tpl.map(s=>{const S=c.setores[s.id];return {id:s.id,nome:s.nome,pontos:S.pts,maximo:S.max,pct:pct(S.pts,S.max),ko:S.ko};}),
    itens:itensDe(a).map(({s,sb,it})=>{const r=a.respostas[it.id]||{};return {setor:`${s.id} – ${s.nome}`,sub:sb.nome||'',id:it.id,pergunta:it.t,nota:r.nota?NOTAS[r.nota].lbl:'',pontos:r.nota&&r.nota!=='NA'?NOTAS[r.nota].p:'',obs:r.obs||'',fotos:(r.fotos||[]).map(f=>env[f]).filter(Boolean)};})
  };
}
async function enviarAuditoria(id){
  const a=await DB.get('auditorias',id); if(!a) return;
  const fm=new Map(); (await DB.fotosDe(id)).forEach(f=>fm.set(f.id,f));
  const env=a.fotosEnviadas||{};
  await gravarSync(id,{estado:'enviando'});
  if(!A) renderHome();
  try{
    const meta={id:a.id,cliente:a.dados.cliente,data:a.dados.data};
    for(const [itemId,r] of Object.entries(a.respostas)){
      for(const fid of (r.fotos||[])){
        if(env[fid]||!fm.get(fid)) continue;
        const res=await api('enviarFoto',{auditoria:meta,fotoId:fid,item:itemId,base64:fm.get(fid).data.split(',')[1]});
        env[fid]=res.url; await gravarSync(id,{estado:'enviando'},env);
      }
    }
    a.fotosEnviadas=env;
    const c=calc(a);
    const pdf64=await blobB64(montarPDF(a,fm));
    const res=await api('enviarAuditoria',{auditoria:paraServidor(a,c),pdf:pdf64,nomePdf:nomePdf(a)});
    await gravarSync(id,{estado:'ok',pdfUrl:res.pdfUrl,pastaUrl:res.pastaUrl,enviadaEm:Date.now()},env);
  }catch(e){
    await gravarSync(id,{estado:'erro',msg:e.message},env);
    throw e;
  }
}
async function atualizarRemotas(){
  const res=await api('listar',{});
  LS.set('hauke_remotas',JSON.stringify(res.auditorias||[]));
}
let sincronizando=false, senhaRecusada=false;
async function sincronizar(manual){
  if(!SESSAO){ if(manual) toast('Envio para o Drive não configurado'); return; }
  if(!navigator.onLine){ if(manual) toast('Sem internet — o envio fica na fila'); return; }
  if(sincronizando) return; sincronizando=true;
  let falhas=0, enviadas=0;
  try{
    const fila=(await DB.all('auditorias')).filter(a=>a.status==='concluida'&&a.sync?.estado!=='ok');
    for(const a of fila){
      try{ await enviarAuditoria(a.id); enviadas++; }
      catch(e){ if(e.code==='senha') throw e; falhas++; }
    }
    await atualizarRemotas(); senhaRecusada=false;
    if(manual||enviadas) toast(falhas?`${falhas} envio(s) falharam; nova tentativa depois`: enviadas?`${enviadas} auditoria(s) enviada(s) para o Drive`:'Tudo sincronizado');
  }catch(e){
    if(e.code==='senha'){ senhaRecusada=true; if(manual) toast('O Apps Script recusou a senha.'); }
    if(manual) toast('Falha na conexão com o Drive: '+e.message);
  }finally{
    sincronizando=false;
    if(!A&&SESSAO) irHome(); else if(A&&passo===totalPassos()-1) renderAudit();
  }
}


/* ================= AVISO DE INSTALAÇÃO ================= */
let promptInstalar=null;
const ua=navigator.userAgent;
const ehIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const ehAndroid=/Android/i.test(ua);
const instalado=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function htmlInstalar(){
  if(instalado()) return '';
  if(Number(LS.get('hauke_inst_ate')||0)>Date.now()) return '';
  const depois='<button class="btn btn-g" data-act="instDepois">Agora não</button>';
  const caixa=(t,corpo,acts)=>`<div class="inst"><img src="icons/icon-192.png" alt=""><div style="flex:1"><h4>${t}</h4>${corpo}<div class="inst-acts">${acts}</div></div></div>`;
  const appInterno=/FBAN|FBAV|FB_IAB|Instagram|Line\//.test(ua);
  const iosOutro=ehIOS&&/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if(promptInstalar) return caixa('Instale o app Auditorias','<p>Abre pelo ícone na tela inicial e funciona sem internet.</p>','<button class="btn btn-p" data-act="instalar">Instalar app</button>'+depois);
  if(appInterno) return caixa('Abra no navegador para instalar',`<p>Por dentro deste app não dá para instalar. Toque nos três pontinhos e escolha <b>Abrir no ${ehIOS?'Safari':'Chrome'}</b>.</p>`,depois);
  if(ehIOS&&iosOutro) return caixa('Abra no Safari para instalar','<p>No iPhone, a instalação é feita pelo <b>Safari</b>. Copie o link e abra nele.</p>',depois);
  if(ehIOS) return caixa('Instale o app Auditorias','<ol><li>Toque em <b>Compartilhar</b> (quadrado com seta, na barra do Safari)</li><li>Escolha <b>Adicionar à Tela de Início</b></li><li>Toque em <b>Adicionar</b></li></ol>',depois);
  if(ehAndroid) return caixa('Instale o app Auditorias','<p>No Chrome, toque em <b>⋮</b> (canto superior direito) e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>',depois);
  return '';
}
function atualizarInstalar(){ const el=document.getElementById('instBox'); if(el) el.innerHTML=htmlInstalar(); }
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); promptInstalar=e; atualizarInstalar(); });
window.addEventListener('appinstalled',()=>{ promptInstalar=null; atualizarInstalar(); toast('App instalado. Abra pelo ícone na tela inicial.'); });
async function instalarApp(){
  if(!promptInstalar) return;
  promptInstalar.prompt();
  try{ await promptInstalar.userChoice; }catch(e){}
  promptInstalar=null; atualizarInstalar();
}

/* ================= INÍCIO ================= */
(async()=>{
  if('serviceWorker' in navigator && location.protocol==='https:'){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }
  if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  await DB.open();
  window.addEventListener('online',()=>sincronizar());
  if(configurado()){
    const s=LS.get('hauke_senha');
    if(s){ try{ SESSAO={senha:s,url:await decifrarUrl(s)}; }catch(e){ LS.del('hauke_senha'); } }
    if(!SESSAO) return renderGate();
  }
  await irHome();
  sincronizar();
})();
