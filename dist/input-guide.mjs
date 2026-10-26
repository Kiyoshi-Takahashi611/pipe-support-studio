// UI-only mapping: no engineering values or analysis state are changed here.
export function inputContext(s,path='',label=''){
 const c={title:label||'入力欄を選ぶと、対象を図で強調します',hint:'オレンジ色が入力対象です。図はスクロールしても表示されます。',lines:[],points:[],dimension:null};
 const sign=s.mount==='ceiling'?-1:1,point=(x,y)=>({x,y:sign*y}),line=(a,b)=>c.lines.push([a,b]);
 const heightHint=s.mount==='ceiling'?'天井を0として、下向きの距離です。':'柱の下端を0として、上向きの高さです。';
 const tier=path.match(/^rack\.tiers\.(\d+)/),pipe=path.match(/^rack\.tiers\.(\d+)\.pipes\.(\d+)\.(.+)/),joint=path.match(/^rack\.tiers\.(\d+)\.(?:jointTypes|boltDesigns)\.([^.]+)/);
 if(s.geometryMode==='dimensions'){
 if(path==='w'){c.title='架台全体 ／ '+label;c.hint='梁の左端から右端までの幅・張出し寸法です。';c.dimension=[point(0,0),point(s.w,0),'W'];}
 else if(path==='h'){c.title='柱全体 ／ '+label;c.hint=heightHint;c.dimension=[point(0,0),point(0,s.h),'H'];}
 else if(pipe){const i=+pipe[1],j=+pipe[2],t=s.rack.tiers[i],p=t?.pipes[j];if(p){c.title=`段${i+1}・配管 P${i+1}-${j+1} ／ ${label.replace(/^段\d+ 配管\d+ /,'')}`;const visual=s.pipeVisuals?.find(v=>v.tier===i+1&&v.number===j+1);c.points=[{x:p.x,y:sign*t.height+(visual?.outerWithInsulation||p.diameter||0)/2}];c.hint=pipe[3]==='x'?'梁の左端（X=0）から配管中心までの距離です。':pipe[3]==='span'||pipe[3]==='tributary'?'支持間隔・負担長は、配管が延びる図の手前・奥方向の距離です。梁幅とは別です。':'オレンジの配管に適用します。本体・水・保温の重量はこの配管の荷重になります。';if(pipe[3]==='x')c.dimension=[point(0,t.height),point(p.x,t.height),'X'];}}
 else if(joint){const i=+joint[1],key=joint[2],t=s.rack.tiers[i],x=key==='tip'?s.w:key==='rightColumn'?s.rack.right:s.type==='portal'?s.rack.left:0;if(t){c.title=`段${i+1}・${key==='tip'?'先端側':key==='rightColumn'?'右柱側':s.type==='portal'?'左柱側':'柱側'} ／ ${label}`;c.points=[point(x,t.height)];c.hint='オレンジの接合位置だけに適用します。ボルト配置図の寸法は接合板面内の寸法です。';}}
 else if(tier){const i=+tier[1],t=s.rack.tiers[i];if(t){c.title=`段${i+1} ／ ${label.replace(/^段\d+ /,'')}`;line(point(0,t.height),point(s.w,t.height));c.hint=heightHint;if(path.endsWith('.height'))c.dimension=[point(0,0),point(0,t.height),`段${i+1}`];}}
 else if(path==='rack.left'||path==='rack.right'){const x=path.endsWith('left')?s.rack.left:s.rack.right;c.title=(path.endsWith('left')?'左柱':'右柱')+' ／ '+label;c.hint='梁の左端（X=0）から脚の中心までの距離です。';line(point(x,0),point(x,s.h));c.dimension=[point(0,0),point(x,0),'X'];}
 else if(path.startsWith('rack.brace')){const m=path.match(/^rack\.braces\.(\d+)/),b=(s.braceVisuals||[])[m?+m[1]:0];c.title=`ブレース B${m?+m[1]+1:1} ／ ${label}`;c.hint='Xは梁の左端から、高さは'+(s.mount==='ceiling'?'天井から下向き':'柱の下端から上向き')+'です。丸印が両端の取付位置です。';if(b){const a=point(b.ax,b.ay),z=point(b.bx,b.by);line(a,z);c.points=[a,z];if(path==='rack.braceDrop')c.dimension=[a,point(b.ax,b.by),'高さ差'];}}
 else if(path==='rack.tipTie'){c.title='先端の縦つなぎ';c.hint='各段の梁の右端同士を縦材でつなぎます。';line(point(s.w,Math.min(...s.rack.tiers.map(t=>t.height))),point(s.w,Math.max(...s.rack.tiers.map(t=>t.height))));}
 }
 if(path.startsWith('anchor.')){c.title='固定部・全支点共通 ／ '+label;c.hint='オレンジの固定部すべてに共通の条件です。ピッチ・埋込み・へりあきは固定部の局所寸法です。';c.points=s.nodes.filter(n=>n.fix!=='free');}
 if(path.startsWith('nodes.')){const n=s.nodes[+path.split('.')[1]];if(n){c.title=`節点 N${n.id} ／ ${label}`;c.points=[n];c.hint='Xは右向き、Yは上向きが正の座標です。';}}
 if(path.startsWith('members.')){const m=s.members[+path.split('.')[1]];if(m){c.title=`部材 M${m.id} ／ ${label}`;const a=s.nodes.find(n=>n.id===m.a),b=s.nodes.find(n=>n.id===m.b);if(a&&b)line(a,b);}}
 if(path.startsWith('loads.')){const l=s.loads[+path.split('.')[1]],n=s.nodes.find(n=>n.id===l?.node);if(n)c.points=[n];c.hint='オレンジの節点に作用する荷重です。Fxは右、Fyは上、Mzは反時計回りが正です。';}
 if(path.startsWith('bent.')||path.startsWith('dims.')){c.title='鋼材断面 ／ '+label;c.hint='断面図を参照して入力します。架台全体の幅・高さとは別の寸法です。';}
 return c;
}
export function contextOverlay(c,project){
 const num=n=>Number.isFinite(n)?Math.round(n*10)/10:0;
 let svg='<g class="input-target" fill="none" stroke="#c95c24" stroke-width="3">';
 for(const [a,b] of c.lines){const [x,y]=project(a),[u,v]=project(b);svg+=`<path d="M${num(x)} ${num(y)}L${num(u)} ${num(v)}" stroke-width="12" opacity=".35"/><path d="M${num(x)} ${num(y)}L${num(u)} ${num(v)}" stroke-dasharray="6 3"/>`;}
 for(const a of c.points){const [x,y]=project(a);svg+=`<circle cx="${num(x)}" cy="${num(y)}" r="14" fill="#fff0d9" fill-opacity=".5"/><circle cx="${num(x)}" cy="${num(y)}" r="20" opacity=".4"/>`;}
 if(c.dimension){const [a,b]=c.dimension,[x,y]=project(a),[u,v]=project(b),vertical=Math.abs(a.x-b.x)<1e-6,dx=vertical?-30:0,dy=vertical?0:28;svg+=`<path d="M${num(x)} ${num(y)}L${num(x+dx)} ${num(y+dy)}L${num(u+dx)} ${num(v+dy)}L${num(u)} ${num(v)}" stroke-width="2"/><path d="M${num(x+dx-5)} ${num(y+dy-5)}l10 10m${num(u-x-10)} ${num(v-y-10)}l10 10" stroke-width="2"/>`;}
 return svg+'</g>';
}
export function boltGuideOverlay(d,key,scale,cx,cy){
 const color='#c95c24',X=x=>cx+x*scale,Y=y=>cy-y*scale;
 let a,b,label='';
 if(['pitchX','cols'].includes(key)&&d.cols>1){a=[X(-(d.cols-1)*d.pitchX/2),Y((d.rows-1)*d.pitchY/2)-17];b=[a[0]+d.pitchX*scale,a[1]];label=`横ピッチ ${d.pitchX} mm`;}
 if(['pitchY','rows'].includes(key)&&d.rows>1){a=[X((d.cols-1)*d.pitchX/2)+22,Y((d.rows-1)*d.pitchY/2)];b=[a[0],a[1]+d.pitchY*scale];label=`縦ピッチ ${d.pitchY} mm`;}
 if(['plateW','mateW'].includes(key)){const k=key==='plateW'?'plate':'mate';a=[X(-d[k+'W']/2),Y(-d[k+'H']/2)+12];b=[X(d[k+'W']/2),a[1]];label=`幅 ${d[k+'W']} mm`;}
 if(['plateH','mateH'].includes(key)){const k=key==='plateH'?'plate':'mate';a=[X(-d[k+'W']/2)-12,Y(d[k+'H']/2)];b=[a[0],Y(-d[k+'H']/2)];label=`高さ ${d[k+'H']} mm`;}
 if(!a||!a.concat(b).every(Number.isFinite))return '';
 return `<g stroke="${color}" fill="none" stroke-width="2.5"><path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}"/><circle cx="${a[0]}" cy="${a[1]}" r="3"/><circle cx="${b[0]}" cy="${b[1]}" r="3"/></g><rect x="92" y="31" width="236" height="21" rx="4" fill="#fff0d9"/><text x="210" y="46" text-anchor="middle" font-size="12" fill="${color}">${label}</text>`;
}
