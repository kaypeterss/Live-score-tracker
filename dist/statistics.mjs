// Shared by the score tracker and OBS. No network or browser storage here.
export const statFields = [
  ['Current lead','stats-current-lead'],['Lead changes','stats-lead-changes'],
  ['Latest lead change','stats-latest-lead-change'],['First blood','stats-first-blood'],
  ['Biggest scoring moment','stats-biggest-score'],
  ...[1,2].flatMap(p=>[['Active time','active-time'],['CP spent','cp-spent'],
    ['Scoring pace (VP/min)','scoring-pace'],['Battletactic progress','battletactic-progress']]
    .map(([label,key])=>['Player '+p+' · '+label,'stats-player'+p+'-'+key])),
  ['Victory Point race chart','stats-chart-vp-race'],
  ['Cumulative active time chart','stats-chart-active-time'],
  ['Command Points spent chart','stats-chart-command-points'],
  ['Points scored chart','stats-chart-points-scored']
];
export const scoreOf=p=>p.baseVictory+p.tactics.reduce((n,t)=>n+t.goals.reduce((a,b)=>a+b,0),0);
export function readStats(game) {
  try { const x=typeof game.stats==='string'?JSON.parse(game.stats):game.stats;
    if(x?.version===1&&Array.isArray(x.events)&&Array.isArray(x.segments))return x;
  } catch {}
  return null;
}
export function initialStats(record,now,legacy=null) {
  const events=Array.isArray(legacy?.events)?legacy.events.filter(e=>[1,2].includes(e.p)&&Number.isFinite(e.d)&&Number.isFinite(e.a)).slice(-500).map(e=>({...e,k:e.k||(e.l==='Victory Points'?'victory':e.l==='Command Points spent'?'command':/^(Affray|Strike|Domination)/.test(e.l||'')?'goal':'other')})):[];
  const segments=Array.isArray(legacy?.segments)?legacy.segments.filter(s=>[1,2].includes(s.p)&&Number.isFinite(s.a)&&Number.isFinite(s.b)&&s.b>=s.a).slice(-200):[];
  const baseline=record.players.map(scoreOf);
  for(const e of events)if(['victory','goal','tactic'].includes(e.k))baseline[e.p-1]-=e.d;
  const game=record.game;
  return {version:1,started:now,partial:!!game.turn,baseline,events,segments,
    since:game.active&&['Top','Bot'].includes(game.phase)?(legacy?.player===game.active&&legacy.since>0?Math.min(now,legacy.since):now):0,
    player:game.active||0,t:game.turn,h:game.phase};
}
export function updateStats(before,after,change) {
  const now=change.at;
  if(change.scope==='newGame')return JSON.stringify(initialStats(after,now));
  const x=structuredClone(readStats(before.game)||initialStats(before,now,change.statsSeed));
  const old=before.game,g=after.game;
  const switched=old.active!==g.active||old.turn!==g.turn||old.phase!==g.phase;
  if(switched){
    if(x.since&&[1,2].includes(x.player))x.segments.push({p:x.player,a:x.since,b:Math.max(x.since,now),t:x.t,h:x.h});
    x.since=g.active&&['Top','Bot'].includes(g.phase)?now:0;
    x.player=g.active;x.t=g.turn;x.h=g.phase;
  }
  if(change.scope==='player'){
    const p=change.player,a=after.players[p],b=before.players[p];let d=0,l='',k=change.key;
    if(['command','army','rage','fury'].includes(k)){d=a[k]-b[k];l=k==='command'&&d<0?'Command Points spent':k;}
    if(k==='victory'){d=a.baseVictory-b.baseVictory;l='Victory Points';}
    if(k==='goal'||k==='tactic'){
      d=scoreOf(a)-a.baseVictory-(scoreOf(b)-b.baseVictory);
      l=k==='goal'?['Affray','Strike','Domination'][change.goal]+' · '+a.tactics[change.slot].name:'Battletactic correction';
    }
    if(d)x.events.push({a:now,p:p+1,t:g.turn,h:g.phase,d,k,l});
  }
  if(switched)x.events.push({a:now,p:g.active,t:g.turn,h:g.phase,d:0,k:'turn',l:g.turn?g.phase+' T'+g.turn:'Game not started'});
  // Bounded for a five-round game. Retain scoring baseline if very old events roll off.
  if(x.events.length>600){for(const e of x.events.splice(0,x.events.length-600))if(['victory','goal','tactic'].includes(e.k)&&e.p)x.baseline[e.p-1]+=e.d;x.partial=true;}
  x.segments=x.segments.slice(-500);
  return JSON.stringify(x);
}
export function turnIndex(e){return e.t>=1&&e.t<=5?(e.t-1)*2+(e.h==='Bot'||e.h==='END'?1:0):-1;}
export function duration(ms){const seconds=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
export function summarize(record,now=Date.now()) {
  const x=readStats(record.game)||initialStats(record,now);
  const time=[Array(10).fill(0),Array(10).fill(0)],cp=time.map(r=>r.slice()),vp=time.map(r=>r.slice()),bt=time.map(r=>r.slice()),totalTime=[0,0],cpSpent=[0,0];
  const addTime=(p,a,b,t,h)=>{if(![1,2].includes(p))return;const ms=Math.max(0,b-a);totalTime[p-1]+=ms;const i=turnIndex({t,h});if(i>=0)time[p-1][i]+=ms/1000;};
  x.segments.forEach(s=>addTime(s.p,s.a,s.b,s.t,s.h));
  if(x.since)addTime(x.player,x.since,now,x.t,x.h);
  let running=x.baseline.slice(),lastLeader=Math.sign(running[0]-running[1]),firstBlood=null,biggest=null;const leadChanges=[];
  // Replay by confirmed transaction order, including corrections.
  for(const e of x.events){
    if(![1,2].includes(e.p))continue;const p=e.p-1,i=turnIndex(e);
    if(e.k==='command'&&e.d<0){cpSpent[p]-=e.d;if(i>=0)cp[p][i]-=e.d;}
    if(!['victory','goal','tactic'].includes(e.k))continue;
    running[p]+=e.d;if(i>=0)(e.k==='victory'?vp:bt)[p][i]+=e.d;
    if(e.d>0){firstBlood ||= e;if(!biggest||e.d>biggest.d)biggest=e;}
    const leader=Math.sign(running[0]-running[1]);
    if(leader){if(lastLeader&&lastLeader!==leader)leadChanges.push({...e,leader:leader>0?1:2});lastLeader=leader;}
  }
  const race=time.map(r=>r.slice());running=x.baseline.slice();
  for(const e of x.events)if(turnIndex(e)<0&&['victory','goal','tactic'].includes(e.k)&&e.p)running[e.p-1]+=e.d;
  for(let i=0;i<10;i++){for(let p=0;p<2;p++){running[p]+=vp[p][i]+bt[p][i];race[p][i]=running[p];}}
  const cumulativeTime=time.map(row=>{let sum=0;return row.map(v=>Math.round(sum+=v));});
  const current=turnIndex({t:record.game.turn,h:record.game.phase});
  const names=record.players.map(p=>p.name+' · '+p.faction),lead=scoreOf(record.players[0])-scoreOf(record.players[1]);
  return {x,names,time:time.map(r=>r.map(Math.round)),totalTime,cp,cpSpent,vp,bt,race,cumulativeTime,current,lead,leadChanges,firstBlood,biggest,
    pace:record.players.map((p,i)=>totalTime[i]?(scoreOf(p)/(totalTime[i]/60000)).toFixed(1):'0.0'),
    tacticPoints:record.players.map(p=>scoreOf(p)-p.baseVictory)};
}
export function statText(field,record,s=summarize(record)) {
  const player=/^stats-player([12])-(.+)$/.exec(field);
  if(player){const p=Number(player[1])-1;return ({'active-time':duration(s.totalTime[p]),'cp-spent':String(s.cpSpent[p]),'scoring-pace':s.pace[p],'battletactic-progress':s.tacticPoints[p]+' / 30'})[player[2]]??'';}
  const who=e=>e?s.names[e.p-1]:'';
  const values={'stats-current-lead':s.lead?s.names[s.lead>0?0:1]+' +'+Math.abs(s.lead):'Scores tied',
    'stats-lead-changes':String(s.leadChanges.length),
    'stats-latest-lead-change':s.leadChanges.length?s.names[s.leadChanges.at(-1).leader-1]+' · '+s.leadChanges.at(-1).h+' T'+s.leadChanges.at(-1).t:'No lead changes yet',
    'stats-first-blood':s.firstBlood?who(s.firstBlood)+' · +'+s.firstBlood.d:'No scoring yet',
    'stats-biggest-score':s.biggest?who(s.biggest)+' · +'+s.biggest.d:'No scoring yet'};
  return values[field]??'';
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function chart(field,record,s=summarize(record)) {
  const configs={
    'stats-chart-vp-race':['Cumulative Victory Point race',s.race,false,'VP'],
    'stats-chart-active-time':['Cumulative active time per turn',s.cumulativeTime,false,'seconds'],
    'stats-chart-command-points':['Command Points spent per turn',s.cp,true,'CP'],
    'stats-chart-points-scored':['Points scored per turn',[s.vp[0],s.bt[0],s.vp[1],s.bt[1]],true,'VP']
  };
  const config=configs[field];if(!config)return '';const [title,rows,columns,unit]=config;
  const colors=['#83b6f5','#ef9c7e','#83b6f5','#ef9c7e'],palette=rows.length===4?['#83b6f5','#bad5fa','#ef9c7e','#f5c6b6']:colors;
  const legends=rows.length===4?[s.names[0]+' · other VP',s.names[0]+' · battletactic VP',s.names[1]+' · other VP',s.names[1]+' · battletactic VP']:s.names;
  const w=920,h=280,L=54,R=18,T=24,B=38,plot=w-L-R,high=Math.max(1,...rows.flat()),low=Math.min(0,...rows.flat()),y=v=>T+(high-v)/(high-low)*(h-T-B);
  let svg='';for(let j=0;j<4;j++){const v=low+(high-low)*j/3;svg+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="currentColor" opacity=".18"/><text x="4" y="'+(y(v)+4)+'">'+Math.round(v)+'</text>';}
  for(let i=0;i<10;i++)svg+='<text x="'+(L+(i+.5)*plot/10)+'" y="'+(h-10)+'" text-anchor="middle">'+(i%2?'Bot':'Top')+' '+(Math.floor(i/2)+1)+'</text>';
  rows.forEach((row,j)=>{
    if(columns){row.forEach((v,i)=>{if(i>s.current)return;const bw=plot/10/(rows.length+1),x=L+i*plot/10+bw*(j+.5);svg+='<rect x="'+x+'" y="'+Math.min(y(v),y(0))+'" width="'+(bw-3)+'" height="'+Math.max(1,Math.abs(y(v)-y(0)))+'" fill="'+palette[j]+'"/><text x="'+(x+(bw-3)/2)+'" y="'+(v>=0?y(v)-6:y(v)+16)+'" text-anchor="middle">'+v+'</text>';});}
    else {const points=row.slice(0,s.current+1).map((v,i)=>({x:L+(i+.5)*plot/10,y:y(v),v}));svg+='<polyline points="'+points.map(p=>p.x+','+p.y).join(' ')+'" stroke="'+palette[j]+'" stroke-width="3" fill="none"/>'+points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+palette[j]+'"/><text x="'+p.x+'" y="'+(p.y+(j?18:-9))+'" text-anchor="middle">'+p.v+'</text>').join('');}
  });
  return '<section class="tt-stat-chart"><h3>'+title+' <small>('+unit+')</small></h3><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+title+'">'+svg+'</svg><div class="tt-chart-legend">'+legends.map((l,j)=>'<span><i style="background:'+palette[j]+'"></i>'+esc(l)+'</span>').join('')+'</div></section>';
}
