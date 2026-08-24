// ==== Peace Home Dashboard - Live version ====
// Fetches data from /api/data (Google Sheets → Vercel serverless) with 5-min cache
(function(){
  'use strict';
  const MILESTONES = [
    {key:'m1',no:'①',label:'図面確定',target:14},
    {key:'m3',no:'③',label:'仕様確定',target:70},
    {key:'m4',no:'④',label:'確認申請提出',target:58},
    {key:'m5',no:'⑤',label:'確認申請許可',target:68},
    {key:'m6',no:'⑥',label:'社内打合せ',target:66},
    {key:'m7',no:'⑦',label:'ANDPAD登録',target:72},
    {key:'m8',no:'⑧',label:'着工',target:90},
    {key:'m2',no:'②',label:'仕様打合せ開始',target:15},
  ];
  const CATS = {
    ph:{label:'PH注文',color:'var(--brand-ph)',brand:'ph'},
    hinata:{label:'ひなた',color:'var(--brand-hinata)',brand:'hinata'},
    struct:{label:'構造計算',color:'var(--brand-struct)',brand:'ph'},
    long:{label:'長期優良',color:'var(--brand-long)',brand:'ph'},
  };
  const SCALE_MAX = 120;
  let projects = [];
  let targets = {};
  let filter = {cat:'all', adv:'all'};
  let fcState = {
    leadStart: 130, leadWork: 140,
    startYear: 2026, startMonth: 9,
    fyLabel: '45期',
    targets: {},
  };

  const parseD = s => (s && /^\d{4}-\d{2}-\d{2}/.test(s)) ? new Date(s.slice(0,10)+'T00:00:00') : null;
  const dbetween = (a,b) => Math.round((b-a)/86400000);
  const clsDelta = (v,t) => v==null?'empty':(v<=t?'good':v<=t+7?'warn':'bad');
  const monthKey = d => d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : '';
  const brandOf = p => CATS[p.cat]?.brand || 'ph';
  const projDays = p => {
    const c = parseD(p.contract); if(!c) return {};
    const o = {}; MILESTONES.forEach(m => { const d = parseD(p[m.key]); o[m.key] = d?dbetween(c,d):null }); return o;
  };
  const filtered = () => projects.filter(p => (filter.cat==='all'||p.cat===filter.cat) && (filter.adv==='all'||p.adv===filter.adv));

  // ---- Data fetch ----
  async function loadData() {
    const statusDot = document.querySelector('#sync-status .dot');
    const statusText = document.getElementById('sync-text');
    statusDot.className = 'dot load';
    statusText.textContent = '同期中...';
    try {
      const r = await fetch('/api/data', {credentials:'include'});
      if(!r.ok) throw new Error(`API ${r.status}`);
      const data = await r.json();
      projects = data.projects || [];
      const remoteTargets = data.targets || {};
      // Merge fetched targets if available
      if(Object.keys(remoteTargets).length) {
        fcState.targets = remoteTargets;
      } else if(Object.keys(fcState.targets).length === 0) {
        // Fallback default from image
        fcState.targets = {
          '濵畑':[1,1,1,2,2,1,1,1,1,1,1,1],
          '長友':[1,1,1,1,1,1,1,1,1,1,1,1],
          '中原':[1,0,1,1,1,0,1,1,1,1,1,1],
          '渡邊':[1,0,1,1,1,1,1,2,0,1,1,0],
          '井上':[0,2,1,1,1,2,1,1,1,1,2,1],
          'イ・スギョン':[0,0,0,0,0,1,0,1,0,1,0,1],
          '長峰':[0,0,0,0,0,0,0,1,0,0,0,1],
        };
      }
      const updated = new Date(data.updatedAt);
      statusDot.className = 'dot';
      statusText.textContent = `${projects.length}件 ／ ${updated.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} 更新`;
      document.getElementById('foot-updated').textContent = `最終更新 ${updated.toLocaleString('ja-JP')} ／ ${projects.length} 物件`;
      if(data.warnings?.length) showWarning(data.warnings);
      renderAll();
    } catch(err) {
      statusDot.className = 'dot err';
      statusText.textContent = 'エラー';
      showError(err.message);
    } finally {
      document.getElementById('loading').classList.add('hidden');
    }
  }
  function showError(msg) {
    document.getElementById('error-slot').innerHTML = `
      <div class="error-banner">
        <strong>データ取得エラー：</strong> ${msg}
        <pre>設定確認：
1. Vercel の環境変数 (APP_PASSWORD/GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY/PROJECTS_SHEET_ID) が全て入力済みか
2. サービスアカウントメールにスプレッドシートが共有されているか
3. /api/health を開いて設定状況を確認</pre>
      </div>`;
  }
  function showWarning(warns) {
    if(!warns.length) return;
    document.getElementById('error-slot').innerHTML = `
      <div class="error-banner" style="border-left-color:var(--warn);background:linear-gradient(180deg, color-mix(in srgb, var(--warn) 6%, var(--surface)), var(--surface))">
        <strong style="color:var(--warn)">一部シートの読み込みに問題：</strong>
        <pre>${warns.join('\n')}</pre>
      </div>`;
  }

  // ==== Tab 1 ====
  function renderKPI() {
    const list = filtered();
    const el = document.getElementById('kpi-strip'); el.innerHTML = '';
    MILESTONES.slice(0,7).forEach(m => {
      const vals = list.map(p => projDays(p)[m.key]).filter(v => v!=null);
      const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
      const cls = clsDelta(avg, m.target);
      const pct = avg==null?0:Math.min(100,(avg/m.target)*100);
      el.insertAdjacentHTML('beforeend',
        `<div class="kpi ${cls}"><div class="no">${m.no}</div><div class="label">${m.label}</div><div class="value">${avg==null?'—':avg.toFixed(1)}<span class="unit">日</span></div><div class="target">目標 ${m.target}日 ／ n=${vals.length}</div><div class="bar"><i style="width:${pct}%"></i></div></div>`);
    });
    // 8th kpi = m8
    const m = MILESTONES[7];
    const vals = list.map(p => projDays(p)[m.key]).filter(v => v!=null);
    const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
    el.insertAdjacentHTML('beforeend',
      `<div class="kpi ${clsDelta(avg, m.target)}"><div class="no">${m.no}</div><div class="label">${m.label}</div><div class="value">${avg==null?'—':avg.toFixed(1)}<span class="unit">日</span></div><div class="target">目標 ${m.target}日 ／ n=${vals.length}</div><div class="bar"><i style="width:${avg==null?0:Math.min(100,(avg/m.target)*100)}%"></i></div></div>`);
  }
  function renderFilterChips() {
    const advs = Array.from(new Set(projects.map(p => p.adv).filter(Boolean))).sort();
    document.getElementById('adv-chips').innerHTML =
      `<span class="chip ${filter.adv==='all'?'active':''}" data-filter="adv" data-value="all">全て</span>` +
      advs.map(a => `<span class="chip ${filter.adv===a?'active':''}" data-filter="adv" data-value="${a}">${a}</span>`).join('');
  }
  function renderDrawingAlerts() {
    const today = new Date();
    const list = filtered().filter(p => {
      const c = parseD(p.contract); if(!c) return false;
      if(parseD(p.m1)) return false;
      return dbetween(c, today) > 14;
    }).sort((a,b) => dbetween(parseD(b.contract), today) - dbetween(parseD(a.contract), today));
    const el = document.getElementById('drawing-alerts');
    if(!list.length) { el.innerHTML = '<div class="empty-state">現在、図面確定14日超過中の物件はありません ✓</div>'; return; }
    el.innerHTML = list.map(p => {
      const d = dbetween(parseD(p.contract), today);
      return `<div class="alert-item"><span class="adv-tag">${p.adv||'未設定'}</span><span class="name-line">${p.name} <small>${CATS[p.cat]?.label||''} ／ 設計 ${p.design||'—'}</small></span><span class="status">契約 ${p.contract}</span><span class="days">+${d-14}日<br><small>契約後${d}日</small></span></div>`;
    }).join('');
  }
  function renderCompareBars(id, groups, target, list) {
    const el = document.getElementById(id); el.innerHTML = '';
    if(!groups.length) { el.innerHTML = '<div class="empty-state">データなし</div>'; return; }
    const tX = 100*(target/SCALE_MAX);
    groups.forEach(g => {
      const rows = list.filter(g.match);
      const vals = rows.map(p => projDays(p).m8).filter(v => v!=null);
      const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
      const w = avg==null?0:Math.min(100,(avg/SCALE_MAX)*100);
      const cls = clsDelta(avg, target);
      const bc = avg==null?'var(--rule-2)':(cls==='good'?'var(--good)':cls==='warn'?'var(--warn)':'var(--bad)');
      el.insertAdjacentHTML('beforeend',
        `<div class="row"><div class="rowlabel">${g.swatch?`<span class="swatch" style="background:${g.swatch}"></span>`:''}<span>${g.label}</span></div><div class="track"><i style="width:${w}%;background:${bc}"></i><div class="target" style="left:${tX}%" data-label="${target}日"></div></div><div class="metric">${avg==null?'—':avg.toFixed(0)+'日'}<div class="n">完了${vals.length}／進行${rows.length-vals.length}</div></div></div>`);
    });
  }
  function renderComparisons() {
    const list = filtered();
    const cg = Object.keys(CATS).map(k => ({label:CATS[k].label, swatch:CATS[k].color, match:p=>p.cat===k}));
    renderCompareBars('comp-cat', cg, 90, list);
    const advs = Array.from(new Set(list.map(p => p.adv).filter(Boolean))).sort();
    renderCompareBars('comp-adv', advs.map(a=>({label:a, swatch:null, match:p=>p.adv===a})), 90, list);
    const designs = Array.from(new Set(list.map(p => p.design).filter(Boolean))).sort();
    renderCompareBars('comp-design', designs.map(d=>({label:d, swatch:null, match:p=>p.design===d})), 90, list);
  }
  function renderTable() {
    const list = filtered().slice().sort((a,b) => (a.contract||'').localeCompare(b.contract||''));
    const tb = document.getElementById('tbody');
    if(!list.length) { tb.innerHTML = '<tr><td colspan="11" class="empty-state">データなし</td></tr>'; return; }
    tb.innerHTML = list.map(p => {
      const d = projDays(p);
      const cells = ['m1','m3','m4','m5','m6','m7','m8'].map(k => {
        const m = MILESTONES.find(x=>x.key===k); const v = d[k];
        return `<td class="num ${clsDelta(v, m.target)}">${v==null?'—':v}</td>`;
      }).join('');
      const cc = CATS[p.cat]?.color || 'var(--brand-ph)';
      return `<tr><td><span class="brand-tag" style="background:${cc}"></span>${p.name}</td><td class="who">${p.adv||'—'}</td><td class="who">${p.design||'—'}</td><td class="who">${p.contract||'—'}</td>${cells}</tr>`;
    }).join('');
  }

  // ==== Tab 2 ====
  function renderHero() {
    const today = new Date();
    const inProg = projects.filter(p => {
      const s = parseD(p.m8); const f = parseD(p.afinish);
      if(!s || s > today) return false;
      if(f && f <= today) return false;
      return true;
    });
    const ph = inProg.filter(p => brandOf(p)==='ph').length;
    const hn = inProg.filter(p => brandOf(p)==='hinata').length;
    document.getElementById('hero-inprog').textContent = inProg.length;
    document.getElementById('hero-inprog-ph').textContent = ph + '棟';
    document.getElementById('hero-inprog-hinata').textContent = hn + '棟';
    const tm = monthKey(today);
    const thisStart = projects.filter(p => { const d = parseD(p.cstart) || parseD(p.m8); return d && monthKey(d) === tm; }).length;
    const thisFin = projects.filter(p => { const d = parseD(p.cfinish); return d && monthKey(d) === tm; }).length;
    document.getElementById('hero-this-start').textContent = thisStart + '棟';
    document.getElementById('hero-this-finish').textContent = thisFin + '棟';

    const amts = projects.map(p => +p.camt || 0).filter(v => v > 0);
    const avgAmt = amts.length ? amts.reduce((a,b) => a+b, 0) / amts.length : 2400;
    const months = [];
    for(let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth()+i, 1);
      months.push({y:d.getFullYear(), m:d.getMonth()+1, key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`});
    }
    let totalRev = 0;
    document.getElementById('hero-forecast-months').innerHTML = months.map((mo,i) => {
      const list = projects.filter(p => { const d = parseD(p.cfinish); return d && monthKey(d) === mo.key; });
      let rev = 0; list.forEach(p => rev += (+p.camt || 0) || avgAmt);
      totalRev += rev;
      const revStr = rev >= 10000 ? (rev/10000).toFixed(2)+'億' : rev >= 1000 ? (rev/1000).toFixed(1)+'千万' : rev.toFixed(0)+'万';
      return `<div class="hfm ${i===0?'this-month':''}"><div class="m-mon">${mo.m}月<span class="y">${mo.y}</span></div><div class="m-count">${list.length}<span class="u">棟</span></div><div class="m-revenue">${list.length?revStr:'—'}</div></div>`;
    }).join('');
    document.getElementById('hero-fc-total').textContent = totalRev >= 10000 ? (totalRev/10000).toFixed(2)+'億' : (totalRev/1000).toFixed(1)+'千万';
  }
  function renderFYTiles() {
    const today = new Date();
    const list = projects;
    const contracts = list.length;
    const started = list.filter(p => { const d = parseD(p.m8); return d && d <= today; }).length;
    const finished = list.filter(p => { const d = parseD(p.afinish); return d && d <= today; }).length;
    const plannedStart = list.filter(p => parseD(p.cstart)).length;
    const plannedFinish = list.filter(p => parseD(p.cfinish)).length;
    const totalAmt = list.reduce((s,p) => s + (+p.camt||0), 0);
    document.getElementById('fy-tiles').innerHTML = `
      <div class="fy-tile"><div class="t-label">対象物件</div><div class="t-value">${contracts}<span class="u">棟</span></div></div>
      <div class="fy-tile warn"><div class="t-label">着工予定</div><div class="t-value">${plannedStart}<span class="u">棟</span></div><div class="t-sub">実績 ${started}棟</div></div>
      <div class="fy-tile accent"><div class="t-label">完工予定</div><div class="t-value">${plannedFinish}<span class="u">棟</span></div><div class="t-sub">実績 ${finished}棟</div></div>
      <div class="fy-tile good"><div class="t-label">完工済</div><div class="t-value">${finished}<span class="u">棟</span></div></div>
      <div class="fy-tile"><div class="t-label">契約額合計</div><div class="t-value" style="font-size:20px">${totalAmt>=10000?(totalAmt/10000).toFixed(2)+'億':totalAmt.toFixed(0)+'万'}</div></div>
      <div class="fy-tile"><div class="t-label">工事中</div><div class="t-value">${started - finished}<span class="u">棟</span></div></div>`;
  }
  function renderAdvSummary() {
    const advs = Array.from(new Set(projects.map(p => p.adv).filter(Boolean))).sort();
    const today = new Date();
    const t = document.getElementById('adv-summary-table');
    if(!advs.length) { t.innerHTML = '<tbody><tr><td class="empty-state">データなし</td></tr></tbody>'; return; }
    let h = `<thead><tr><th>ADV</th><th style="text-align:right">契約</th><th style="text-align:right">着工済</th><th style="text-align:right">完工済</th><th style="text-align:right">着工率</th><th style="text-align:right">完工率</th></tr></thead><tbody>`;
    advs.forEach(a => {
      const rows = projects.filter(p => p.adv === a);
      const c = rows.length;
      const s = rows.filter(p => { const d = parseD(p.m8); return d && d <= today; }).length;
      const f = rows.filter(p => { const d = parseD(p.afinish); return d && d <= today; }).length;
      const sR = c?Math.round(s/c*100):0, fR = c?Math.round(f/c*100):0;
      h += `<tr><td>${a}</td><td class="num">${c}</td><td class="num">${s}</td><td class="num">${f}</td><td class="num" style="color:${sR>=70?'var(--good)':sR>=40?'var(--warn)':'var(--bad)'}">${sR}%</td><td class="num" style="color:${fR>=50?'var(--good)':fR>=25?'var(--warn)':'var(--bad)'}">${fR}%</td></tr>`;
    });
    t.innerHTML = h + '</tbody>';
  }

  // ==== Tab 3 ====
  function renderKM() {
    const wM6 = projects.filter(p => parseD(p.m6));
    const wB = wM6.filter(p => parseD(p.bclose));
    const rate = wM6.length ? Math.round(wB.length/wM6.length*100) : 0;
    document.getElementById('km-rate-value').textContent = rate + '%';
    document.getElementById('km-rate-detail').textContent = wB.length + ' / ' + wM6.length;
    const rb = document.getElementById('km-rate-bar');
    rb.style.width = rate + '%';
    rb.style.background = rate >= 80 ? 'var(--good)' : rate >= 50 ? 'var(--warn)' : 'var(--bad)';
    const lts = wB.map(p => dbetween(parseD(p.m6), parseD(p.bclose))).filter(v => v >= 0);
    const avg = lts.length ? lts.reduce((a,b)=>a+b,0)/lts.length : null;
    document.getElementById('km-lt-value').textContent = avg == null ? '—' : avg.toFixed(1);
    document.getElementById('km-lt-n').textContent = lts.length;

    const fin = projects.filter(p => parseD(p.afinish) && p.camt && p.acost);
    if(fin.length) {
      const gC = fin.reduce((s,p) => s+(+p.gm||0), 0)/fin.length;
      const gAarr = fin.map(p => { const c=+p.camt||0, a=+p.acost||0; return c?((c-a)/c*100):0; }).filter(v => v);
      const gA = gAarr.length ? gAarr.reduce((a,b)=>a+b,0)/gAarr.length : 0;
      document.getElementById('km-gm-contract').textContent = gC.toFixed(1)+'%';
      const e = document.getElementById('km-gm-actual');
      e.textContent = gA.toFixed(1)+'%';
      e.style.color = gA >= 25 ? 'var(--good)' : gA >= 15 ? 'var(--warn)' : 'var(--bad)';
    }

    const today = new Date();
    const alerts = projects.filter(p => parseD(p.m6) && !parseD(p.bclose) && !parseD(p.afinish))
      .sort((a,b) => dbetween(parseD(b.m6), today) - dbetween(parseD(a.m6), today));
    const el = document.getElementById('km-budget-alerts');
    if(!alerts.length) { el.innerHTML = '<div class="empty-state" style="color:var(--good)">現在、実行予算未作成の対象物件はありません ✓</div>'; }
    else {
      el.innerHTML = alerts.map(p => {
        const d = dbetween(parseD(p.m6), today);
        return `<div class="alert-item"><span class="adv-tag" style="background:var(--warn)">${p.kx||'未設定'}</span><span class="name-line">${p.name} <small>ADV ${p.adv||'—'}</small></span><span class="status">社内打合 ${p.m6}</span><span class="days" style="color:var(--warn)">経過${d}日</span></div>`;
      }).join('');
    }

    // ADV table
    const advs = Array.from(new Set(projects.map(p => p.adv).filter(Boolean))).sort();
    let h = `<thead><tr><th>ADV</th><th style="text-align:right">契約数</th><th style="text-align:right">平均契約額</th><th style="text-align:right">契約時粗利率</th><th style="text-align:right">完工数</th><th style="text-align:right">実績損益率</th></tr></thead><tbody>`;
    advs.forEach(a => {
      const rows = projects.filter(p => p.adv === a);
      const amts = rows.map(p => +p.camt||0).filter(v => v);
      const avgAmt = amts.length ? amts.reduce((a,b)=>a+b,0)/amts.length : 0;
      const gms = rows.map(p => +p.gm||0).filter(v => v);
      const avgGm = gms.length ? gms.reduce((a,b)=>a+b,0)/gms.length : null;
      const done = rows.filter(p => parseD(p.afinish) && p.camt && p.acost);
      const actGms = done.map(p => { const c=+p.camt||0, a=+p.acost||0; return c?((c-a)/c*100):null; }).filter(v => v!=null);
      const avgAct = actGms.length ? actGms.reduce((a,b)=>a+b,0)/actGms.length : null;
      h += `<tr><td>${a}</td><td class="num">${rows.length}</td><td class="num">${avgAmt?avgAmt.toFixed(0)+'万':'—'}</td><td class="num">${avgGm==null?'—':avgGm.toFixed(1)+'%'}</td><td class="num">${done.length}</td><td class="num">${avgAct==null?'—':avgAct.toFixed(1)+'%'}</td></tr>`;
    });
    document.getElementById('km-adv-table').innerHTML = h + '</tbody>';
  }

  // ==== Tab 4 ====
  function stats() {
    const wS = projects.filter(p => parseD(p.contract) && parseD(p.m8));
    const sL = wS.map(p => dbetween(parseD(p.contract), parseD(p.m8))).filter(v => v > 30 && v < 400);
    const avgS = sL.length ? sL.reduce((a,b)=>a+b,0)/sL.length : null;
    const wF = projects.filter(p => parseD(p.m8) && parseD(p.afinish));
    const wD = wF.map(p => dbetween(parseD(p.m8), parseD(p.afinish))).filter(v => v > 30 && v < 400);
    const avgW = wD.length ? wD.reduce((a,b)=>a+b,0)/wD.length : null;
    const mix = {};
    projects.forEach(p => { if(!p.adv) return; if(!mix[p.adv]) mix[p.adv] = {ph:0,hinata:0}; mix[p.adv][brandOf(p)]++; });
    Object.keys(mix).forEach(a => { const t = mix[a].ph+mix[a].hinata; mix[a] = t?{ph:mix[a].ph/t,hinata:mix[a].hinata/t}:{ph:.75,hinata:.25}; });
    return {avgS, avgW, mix, nS:sL.length, nW:wD.length};
  }
  function forecast() {
    const s = stats();
    const startLead = fcState.leadStart, workLead = fcState.leadWork;
    const buckets = [];
    for(let i = 0; i < 24; i++) {
      const d = new Date(fcState.startYear, fcState.startMonth-1+i, 1);
      buckets.push({y:d.getFullYear(), m:d.getMonth()+1, key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        pipeFinishes:{ph:0,hinata:0,total:0}, newFinishes:{ph:0,hinata:0,total:0}, contracts:{total:0}});
    }
    const pipeline = {inProg:0, waiting:0};
    projects.forEach(p => {
      if(parseD(p.afinish)) return;
      const brand = brandOf(p);
      let fDate = null;
      if(parseD(p.m8)) { const st = parseD(p.m8); fDate = parseD(p.cfinish) || new Date(st.getTime()+workLead*86400000); pipeline.inProg++; }
      else if(parseD(p.contract)) { const st = parseD(p.cstart) || new Date(parseD(p.contract).getTime()+startLead*86400000); fDate = parseD(p.cfinish) || new Date(st.getTime()+workLead*86400000); pipeline.waiting++; }
      if(fDate) {
        const idx = buckets.findIndex(b => b.key === monthKey(fDate));
        if(idx >= 0) { if(brand==='hinata') buckets[idx].pipeFinishes.hinata++; else buckets[idx].pipeFinishes.ph++; buckets[idx].pipeFinishes.total++; }
      }
    });
    Object.entries(fcState.targets).forEach(([adv, arr]) => {
      const mix = s.mix[adv] || {ph:.75, hinata:.25};
      arr.forEach((cnt, i) => {
        if(!cnt) return;
        const cD = new Date(fcState.startYear, fcState.startMonth-1+i, 15);
        const sD = new Date(cD.getTime()+startLead*86400000);
        const fD = new Date(sD.getTime()+workLead*86400000);
        const cIdx = buckets.findIndex(b => b.key === monthKey(cD));
        const fIdx = buckets.findIndex(b => b.key === monthKey(fD));
        if(cIdx >= 0) buckets[cIdx].contracts.total += cnt;
        if(fIdx >= 0) { buckets[fIdx].newFinishes.ph += cnt*mix.ph; buckets[fIdx].newFinishes.hinata += cnt*mix.hinata; buckets[fIdx].newFinishes.total += cnt; }
      });
    });
    return {buckets, stats:s, pipeline};
  }
  function renderFc() {
    const {buckets, stats:s, pipeline} = forecast();
    document.getElementById('fc-lead-start-actual').textContent = s.avgS ? `実測 ${s.avgS.toFixed(0)}日（n=${s.nS}） 目標90日` : '実測データなし';
    document.getElementById('fc-lead-work-actual').textContent = s.avgW ? `実測 ${s.avgW.toFixed(0)}日（n=${s.nW}）` : '実測データなし';
    const within = buckets.slice(0,12);
    const newC = within.reduce((s,m)=>s+m.contracts.total,0);
    const totalF = within.reduce((s,m)=>s+m.pipeFinishes.total+m.newFinishes.total,0);
    const pipeF = within.reduce((s,m)=>s+m.pipeFinishes.total,0);
    const newF = within.reduce((s,m)=>s+m.newFinishes.total,0);
    const spill = buckets.slice(12).reduce((s,m)=>s+m.newFinishes.total,0);
    const amts = projects.map(p => +p.camt||0).filter(v => v>0);
    const avgAmt = amts.length ? amts.reduce((a,b)=>a+b,0)/amts.length : 2400;
    const rev = totalF * avgAmt;
    document.getElementById('fc-tiles').innerHTML = `
      <div class="fy-tile warn"><div class="t-label">現在 工事中</div><div class="t-value">${pipeline.inProg}<span class="u">棟</span></div></div>
      <div class="fy-tile"><div class="t-label">契約済・着工前</div><div class="t-value">${pipeline.waiting}<span class="u">棟</span></div></div>
      <div class="fy-tile"><div class="t-label">来期 受注目標</div><div class="t-value">${newC}<span class="u">棟</span></div></div>
      <div class="fy-tile accent"><div class="t-label">来期 完工予測 合計</div><div class="t-value">${Math.round(totalF)}<span class="u">棟</span></div><div class="t-sub">既存${Math.round(pipeF)} ＋ 新規${Math.round(newF)}</div></div>
      <div class="fy-tile good"><div class="t-label">来期 売上見込み</div><div class="t-value" style="font-size:20px">${rev>=10000?(rev/10000).toFixed(2)+'億':(rev/1000).toFixed(1)+'千万'}</div></div>
      <div class="fy-tile"><div class="t-label">新規受注 翌期繰越</div><div class="t-value" style="color:var(--bad)">${Math.round(spill)}<span class="u">棟</span></div></div>`;

    // Target table
    const advs = Object.keys(fcState.targets);
    let head = '<tr><th>ADV</th>';
    for(let i = 0; i < 12; i++) { const d = new Date(fcState.startYear, fcState.startMonth-1+i, 1); head += `<th style="text-align:center">${d.getMonth()+1}月</th>`; }
    head += '<th style="text-align:center">合計</th></tr>';
    document.getElementById('fc-target-thead').innerHTML = head;
    let body = '', totals = new Array(12).fill(0);
    advs.forEach(adv => {
      body += `<tr><td>${adv}</td>`;
      let sum = 0;
      fcState.targets[adv].forEach((v,i) => {
        totals[i] += v; sum += v;
        body += `<td class="num"><input type="number" min="0" value="${v}" data-adv="${adv}" data-mi="${i}" style="width:44px;text-align:center;font-family:var(--font-mono);background:var(--bg);border:1px solid var(--rule-2);border-radius:3px;padding:3px;font-size:12px"></td>`;
      });
      body += `<td class="num" style="font-weight:600">${sum}</td></tr>`;
    });
    body += `<tr style="background:var(--surface-2);border-top:2px solid var(--rule-2)"><td style="font-weight:600;color:var(--accent)">月次合計</td>`;
    totals.forEach(t => { body += `<td class="num" style="font-weight:600">${t}</td>`; });
    body += `<td class="num" style="font-weight:700;color:var(--accent)">${totals.reduce((a,b)=>a+b,0)}</td></tr>`;
    document.getElementById('fc-target-tbody').innerHTML = body;
    document.getElementById('fc-target-tbody').querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', e => {
        fcState.targets[e.target.dataset.adv][+e.target.dataset.mi] = parseInt(e.target.value,10) || 0;
        renderFc();
      });
    });

    // Insights
    const totalLag = fcState.leadStart + fcState.leadWork;
    document.getElementById('fc-insights').innerHTML = `
      <p style="margin:0 0 14px;padding:10px 12px;background:var(--surface-2);border-radius:6px"><strong style="color:var(--accent);font-size:14px">◆ 来期完工 予測 = 既存パイプ ${Math.round(pipeF)}棟 ＋ 新規受注分 ${Math.round(newF)}棟 = <span style="font-size:18px">${Math.round(totalF)}棟</span></strong><br>売上見込み <strong>${rev>=10000?(rev/10000).toFixed(2)+'億':(rev/1000).toFixed(1)+'千万'}</strong>（平均契約額 ${avgAmt.toFixed(0)}万×${Math.round(totalF)}棟）</p>
      <p style="margin:0 0 12px"><strong>◇ 既存パイプラインの状況：</strong>工事中 <strong>${pipeline.inProg}棟</strong>、契約済・着工前 <strong>${pipeline.waiting}棟</strong>。</p>
      <p style="margin:0 0 12px"><strong>◇ 新規受注 ${newC}棟の行方：</strong>期内完工まで到達 <strong style="color:var(--accent)">${Math.round(newF)}棟（${newC?Math.round(newF/newC*100):0}%）</strong>、翌期繰越 <strong style="color:var(--bad)">${Math.round(spill)}棟</strong>。契約→完工 <strong>${totalLag}日</strong> の現状ペースが変わらない限り、期後半の受注は物理的に来期完工に間に合わない。</p>
      <p style="margin:0"><strong>◇ 営業への示唆：</strong>来期完工${Math.round(totalF)}棟のうち<strong>${totalF?Math.round(pipeF/totalF*100):0}%は既存パイプの消化</strong>。新規受注${newC}棟のうち実際に来期売上化するのは<strong>${Math.round(newF)}棟だけ</strong>。「早期契約＝期内完工可能性UP」をADV KPIに反映すべき。</p>`;
    document.getElementById('tab4-count').textContent = fcState.fyLabel;
  }

  function updateBadges() {
    document.getElementById('tab1-count').textContent = projects.length;
    document.getElementById('tab2-count').textContent = projects.length + '件';
    document.getElementById('tab3-count').textContent = projects.length;
  }
  function renderAll() {
    renderKPI(); renderFilterChips(); renderDrawingAlerts(); renderComparisons(); renderTable();
    renderHero(); renderFYTiles(); renderAdvSummary();
    renderKM(); renderFc();
    document.getElementById('filter-count').textContent = `${filtered().length} / ${projects.length} 件`;
    updateBadges();
  }

  // ==== Events ====
  document.getElementById('tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab'); if(!t) return;
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x===t));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-'+t.dataset.tab).classList.add('active');
  });
  document.getElementById('filters').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if(!c) return;
    const k = c.dataset.filter, v = c.dataset.value;
    filter[k] = v;
    document.querySelectorAll('#filters .chip').forEach(x => { if(x.dataset.filter===k) x.classList.toggle('active', x.dataset.value===v); });
    renderAll();
  });
  ['fc-lead-start','fc-lead-work','fc-start-ym','fc-fy-label'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      if(id==='fc-lead-start') fcState.leadStart = parseInt(e.target.value,10)||130;
      else if(id==='fc-lead-work') fcState.leadWork = parseInt(e.target.value,10)||140;
      else if(id==='fc-start-ym') { const [y,m] = e.target.value.split('-').map(Number); fcState.startYear=y; fcState.startMonth=m; }
      else if(id==='fc-fy-label') fcState.fyLabel = e.target.value;
      renderFc();
    });
  });

  // ==== Init ====
  loadData();
  // Auto-refresh every 5 minutes
  setInterval(loadData, 5 * 60 * 1000);
})();
