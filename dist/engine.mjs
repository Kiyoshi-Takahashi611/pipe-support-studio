import {anchorExtraDefaults,anchorCapacityReady,anchorProducts,effectiveAnchorCapacity} from './anchors.mjs';
// Plane, linear elastic Euler-Bernoulli frame. Units: N, mm, MPa.
export const materials={SS400:{E:205000,rho:7850,label:'SS400'},SUS304:{E:193000,rho:7930,label:'SUS304'}};
// JFE angle section table. A cm², I cm⁴, Z cm³ converted to mm units.
export const catalog={
 'L50':{label:'L 50 × 50 × 6',A:564.4,I:126000,Imin:52300,Z:3550,Av:264,h:50,b:50,t:6,kind:'L',source:'JFE 等辺山形鋼'},
 'L65':{label:'L 65 × 65 × 6',A:752.7,I:294000,Imin:122000,Z:6270,Av:354,h:65,b:65,t:6,kind:'L',source:'JFE 等辺山形鋼'},
 'L75':{label:'L 75 × 75 × 6',A:872.7,I:461000,Imin:190000,Z:8470,Av:414,h:75,b:75,t:6,kind:'L',source:'JFE 等辺山形鋼'},
 'RECT':{label:'角形断面・寸法入力',kind:'RECT'},'H':{label:'H形断面・寸法入力',kind:'H'},'C':{label:'溝形断面・寸法入力',kind:'C'},'BENT':{label:'曲げ鋼板・自由断面',kind:'BENT'},'MANUAL':{label:'断面性能を直接入力',kind:'MANUAL'}
};
const sum=a=>a.reduce((s,x)=>s+x,0);
function rectangles(rs){const A=sum(rs.map(r=>r.w*r.h));const cx=sum(rs.map(r=>r.w*r.h*r.x))/A,cy=sum(rs.map(r=>r.w*r.h*r.y))/A;
 const I=sum(rs.map(r=>r.w*r.h**3/12+r.w*r.h*(r.y-cy)**2)),Iy=sum(rs.map(r=>r.h*r.w**3/12+r.w*r.h*(r.x-cx)**2));const Ixy=sum(rs.map(r=>r.w*r.h*(r.x-cx)*(r.y-cy)));
 const ymin=Math.min(...rs.map(r=>r.y-r.h/2)),ymax=Math.max(...rs.map(r=>r.y+r.h/2));return {A,I,Imin:(I+Iy)/2-Math.hypot((I-Iy)/2,Ixy),Z:I/Math.max(ymax-cy,cy-ymin),cx,cy,Iy,Ixy};}
export function bentSection(b){
 if(!([b.t,b.r,b.k].every(Number.isFinite)&&b.t>0&&b.r>=0&&b.k>=0&&b.k<=1&&b.legs.length>=2&&b.legs.length<=12))throw Error('曲げ板の板厚・内R・K値・辺数を確認してください。');
 let x=0,y=0,dir=0;const parts=[],points=[[0,0]];let allowance=0;
 for(let i=0;i<b.legs.length;i++){const leg=b.legs[i];if(!(leg.length>0&&Number.isFinite(leg.length)&&Number.isFinite(leg.turn)&&Math.abs(leg.turn)<175))throw Error('曲げ板の直線長は正、曲げ角は±175°未満で入力してください。');
 const rad=dir*Math.PI/180,dx=leg.length*Math.cos(rad),dy=leg.length*Math.sin(rad);parts.push({A:leg.length*b.t,x:x+dx/2,y:y+dy/2,I: b.t*leg.length**3*Math.sin(rad)**2/12+leg.length*b.t**3*Math.cos(rad)**2/12,Iy:b.t*leg.length**3*Math.cos(rad)**2/12+leg.length*b.t**3*Math.sin(rad)**2/12,Ixy:(b.t*leg.length**3-leg.length*b.t**3)*Math.cos(rad)*Math.sin(rad)/12});x+=dx;y+=dy;points.push([x,y]);
 if(i<b.legs.length-1){allowance+=Math.abs(leg.turn)*Math.PI/180*(b.r+b.k*b.t);dir+=leg.turn;}}
 const A=sum(parts.map(p=>p.A)),cx=sum(parts.map(p=>p.A*p.x))/A,cy=sum(parts.map(p=>p.A*p.y))/A,I=sum(parts.map(p=>p.I+p.A*(p.y-cy)**2)),Iy=sum(parts.map(p=>p.Iy+p.A*(p.x-cx)**2)),Ixy=sum(parts.map(p=>p.Ixy+p.A*(p.x-cx)*(p.y-cy)));
 return {A,I,Iy,Ixy,Imin:(I+Iy)/2-Math.hypot((I-Iy)/2,Ixy),Z:I/Math.max(...points.map(p=>Math.abs(p[1]-cy)+b.t/2)),Av:A/2,cx,cy,points,developed:sum(b.legs.map(l=>l.length))+allowance,label:'曲げ鋼板（直線要素近似）',kind:'BENT',source:'直線中心線モデル・曲げR部を断面に含めない'};
}
export function section(s,key){const c=catalog[key];if(!c)throw Error('未登録の断面です。');if(c.A)return {...c};if(key==='BENT')return bentSection(s.bent);
 if(key==='MANUAL'){const q=s.manual;if(!['A','I','Imin','Z','Av'].every(k=>Number.isFinite(q[k])&&q[k]>0))throw Error('直接入力の断面性能をすべて正の値で指定してください。');return {...q,label:'任意断面（直接入力）',kind:'MANUAL',source:s.manualSource||'出典未入力'};}
 const {h,b,t,tf}=s.dims;if(!(h>0&&b>0&&t>0&&t<Math.min(h,b)/2&&tf>0&&tf<h/2))throw Error('断面寸法が成立していません。板厚と外形寸法を確認してください。');let rs,Av;
 if(key==='RECT'){rs=[{w:b,h:t,x:b/2,y:t/2},{w:b,h:t,x:b/2,y:h-t/2},{w:t,h:h-2*t,x:t/2,y:h/2},{w:t,h:h-2*t,x:b-t/2,y:h/2}];Av=2*t*(h-2*t);}
 else {rs=[{w:b,h:tf,x:b/2,y:tf/2},{w:b,h:tf,x:b/2,y:h-tf/2},{w:t,h:h-2*tf,x:key==='H'?b/2:t/2,y:h/2}];Av=t*(h-2*tf);}
 return {...rectangles(rs),Av,label:`${key==='RECT'?'□':key} ${h} × ${b} × ${t}${key==='RECT'?'':' × '+tf}`,kind:key,h,b,t,tf,source:'矩形合成・隅R/フランジ勾配を省略'};
}
export function preset(type,mount,w,h,defaultSection='L65',material='SS400'){
 const support=(id,x,y,fix='fixed')=>({id,x,y,fix,mount});let nodes,members=[];
 if(type==='portal'){nodes=[support(1,0,0),support(2,0,h,'free'),support(3,w,h,'free'),support(4,w,0),support(5,w/2,h,'free')];members=[[1,2],[2,5],[5,3],[3,4]];if(mount==='ceiling'){nodes.forEach(n=>n.y=h-n.y);} if(mount==='wall'){nodes=[support(1,0,0),support(2,w,0,'free'),support(3,w,-h,'free'),support(4,0,-h),support(5,w,-h/2,'free')];} }
 else if(mount==='wall'){nodes=[support(1,0,0),support(2,w,0,'free'),support(3,0,-h)];members=[[1,2],[3,1]];if(type==='brace')members.push([3,2]);}
 else {nodes=[support(1,0,0),support(2,0,mount==='ceiling'?-h:h,'free'),support(3,w,mount==='ceiling'?-h:h,'free')];members=[[1,2],[2,3]];if(type==='brace'){nodes.push(support(4,0,mount==='ceiling'?-h*.35:h*.35,'free'));members=[[1,4],[4,2],[2,3],[4,3]];}}
 return {nodes,members:members.map(([a,b],i)=>({id:i+1,a,b,section:defaultSection,material,k:1})),loads:[{node:type==='portal'?5:mount==='wall'?2:3,fx:0,fy:-1,mz:0}]};
}
export function initialState(){return {version:1,name:'配管架台 検討 01',type:'brace',mount:'wall',w:800,h:600,defaultSection:'L65',material:'SS400',...preset('brace','wall',800,600),dims:{h:100,b:50,t:5,tf:7.5},bent:{t:4,r:6,k:.4,legs:[{length:40,turn:90},{length:80,turn:90},{length:40,turn:0}]},manual:{A:1000,I:1000000,Imin:300000,Z:20000,Av:500},manualSource:'',allow:{SS400:{normal:0,shear:0},SUS304:{normal:0,shear:0}},deflection:3,selfWeight:true,factor:1,anchor:{...anchorExtraDefaults,type:'metal',product:'',diameter:12,count:4,pitch:120,embed:70,edge:100,fc:24,thickness:180,nt:0,vt:0,confirmed:false},note:''};}
function mat(n,m=n){return Array.from({length:n},()=>Array(m).fill(0));}const mv=(A,x)=>A.map(row=>sum(row.map((v,i)=>v*x[i])));const tr=A=>A[0].map((_,i)=>A.map(r=>r[i]));const mm=(A,B)=>A.map(r=>B[0].map((_,j)=>sum(r.map((v,k)=>v*B[k][j]))));
function solve(A,b){A=A.map((r,i)=>[...r,b[i]]);let n=b.length;for(let i=0;i<n;i++){const scale=Math.max(...A[i].slice(0,n).map(Math.abs));if(scale===0)throw Error('構造が不安定です。支点または部材の接続を確認してください。');A[i]=A[i].map(x=>x/scale);}
 for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[p][k]))p=i;if(Math.abs(A[p][k])<1e-12)throw Error('構造が不安定です。固定条件・孤立節点・部材接続を確認してください。');[A[k],A[p]]=[A[p],A[k]];for(let i=k+1;i<n;i++){let f=A[i][k]/A[k][k];for(let j=k;j<=n;j++)A[i][j]-=f*A[k][j];}}
 const x=Array(n).fill(0);for(let i=n-1;i>=0;i--)x[i]=(A[i][n]-sum(A[i].slice(i+1,n).map((v,j)=>v*x[i+1+j])))/A[i][i];if(x.some(v=>!Number.isFinite(v)))throw Error('数値解が得られません。');return x;}
export function analyze(s){
 const finite=(v)=>typeof v==='number'&&Number.isFinite(v), positive=v=>finite(v)&&v>0;
 if(!s||!Array.isArray(s.nodes)||!Array.isArray(s.members)||!Array.isArray(s.loads))throw Error('モデル形式が不正です。');
 if(typeof s.name!=='string'||typeof s.note!=='string'||typeof s.manualSource!=='string')throw Error('文字項目の形式が不正です。');
 if(!['l','brace','portal'].includes(s.type)||!['floor','wall','ceiling'].includes(s.mount)||!Object.hasOwn(catalog,s.defaultSection)||!Object.hasOwn(materials,s.material))throw Error('形状・材質の設定が不正です。');
 if(!positive(s.w)||!positive(s.h))throw Error('幅と高さは正の値で指定してください。');
 if(s.nodes.some(n=>!Number.isSafeInteger(n.id)||n.id<1||!['floor','wall','ceiling'].includes(n.mount)))throw Error('節点番号・取付面が不正です。');
 if(new Set(s.members.map(m=>m.id)).size!==s.members.length||s.members.some(m=>!Number.isSafeInteger(m.id)||m.id<1||!positive(m.k)||!Object.hasOwn(catalog,m.section)||!Object.hasOwn(materials,m.material)))throw Error('部材番号・材質・断面・有効長係数を確認してください。');
 if(s.loads.length>100||!finite(s.factor)||!finite(s.deflection)||typeof s.selfWeight!=='boolean')throw Error('荷重・変位条件が不正です。');
 for(const name of Object.keys(materials)){if(!s.allow?.[name]||!['normal','shear'].every(k=>finite(s.allow[name][k])&&s.allow[name][k]>=0))throw Error('応力限度は0以上の数値で指定してください。');}
 const anc=s.anchor;if(anc?.capacityMode!==undefined&&!['manual','catalog'].includes(anc.capacityMode))throw Error('許容耐力の取得方式が不正です。');for(const k of ['layoutConfirmed','installationConfirmed','sustained'])if(anc?.[k]!==undefined&&typeof anc[k]!=='boolean')throw Error('アンカー適用条件の形式が不正です。');for(const k of ['rodKey','concreteKey','layoutEvidence'])if(anc?.[k]!==undefined&&typeof anc[k]!=='string')throw Error('自動照合条件の形式が不正です。');if(anc?.catalogId!==undefined&&anc.catalogId!=='custom'&&!Object.hasOwn(anchorProducts,anc.catalogId))throw Error('未登録のアンカー製品です。');for(const k of ['spec','basis','source','crack','duration','installation'])if(anc?.[k]!==undefined&&typeof anc[k]!=='string')throw Error('アンカー製品情報の形式が不正です。');if(!anc||!['metal','chemical'].includes(anc.type)||typeof anc.product!=='string'||typeof anc.confirmed!=='boolean'||!['diameter','pitch','embed','edge','fc','thickness'].every(k=>positive(anc[k]))||!Number.isSafeInteger(anc.count)||anc.count<2||anc.count>100||anc.count%2||!['nt','vt'].every(k=>finite(anc[k])&&anc[k]>=0))throw Error('アンカー条件を確認してください。本数は2以上の偶数、寸法は正の値で指定してください。');
 if(!s.bent||!Array.isArray(s.bent.legs)||!s.dims||!s.manual)throw Error('断面データの形式が不正です。');
 if(!['h','b','t','tf'].every(k=>positive(s.dims[k]))||!['A','I','Imin','Z','Av'].every(k=>positive(s.manual[k])))throw Error('断面寸法・断面性能は正の数値で指定してください。');
 bentSection(s.bent);
 if(s.nodes.length<2||s.nodes.length>40||s.members.length<1||s.members.length>80)throw Error('節点数は2〜40、部材数は1〜80の範囲にしてください。');
 const ids=s.nodes.map(n=>n.id);if(new Set(ids).size!==ids.length)throw Error('節点番号が重複しています。');s.nodes.forEach(n=>{if(![n.x,n.y].every(Number.isFinite)||!['free','fixed','pin'].includes(n.fix))throw Error('節点座標または支点条件が不正です。');});
 if(!(s.factor>0&&s.deflection>0))throw Error('荷重倍率・変位限度は正の値が必要です。');
 const nd=s.nodes.length*3,K=mat(nd),F=Array(nd).fill(0),els=[];let weight=0;
 for(const m of s.members){let a=ids.indexOf(m.a),b=ids.indexOf(m.b);if(a<0||b<0||a===b)throw Error(`部材 ${m.id} の接続先が不正です。`);const na=s.nodes[a],nb=s.nodes[b],dx=nb.x-na.x,dy=nb.y-na.y,L=Math.hypot(dx,dy);if(L<1||!(m.k>0))throw Error(`部材 ${m.id} の長さまたは有効長係数が不正です。`);const c=dx/L,d=dy/L,p=section(s,m.section),mt=materials[m.material];if(!mt)throw Error('材質を指定してください。');
 if(!['A','I','Imin','Z','Av'].every(k=>Number.isFinite(p[k])&&p[k]>0))throw Error('断面性能が成立しません。入力寸法を確認してください。');const E=mt.E,ea=E*p.A/L,ei=E*p.I,L2=L*L,L3=L2*L;
 const kl=[[ea,0,0,-ea,0,0],[0,12*ei/L3,6*ei/L2,0,-12*ei/L3,6*ei/L2],[0,6*ei/L2,4*ei/L,0,-6*ei/L2,2*ei/L],[-ea,0,0,ea,0,0],[0,-12*ei/L3,-6*ei/L2,0,12*ei/L3,-6*ei/L2],[0,6*ei/L2,2*ei/L,0,-6*ei/L2,4*ei/L]];
 const T=[[c,d,0,0,0,0],[-d,c,0,0,0,0],[0,0,1,0,0,0],[0,0,0,c,d,0],[0,0,0,-d,c,0],[0,0,0,0,0,1]],kg=mm(tr(T),mm(kl,T));const mass=p.A*L*1e-9*mt.rho;weight+=mass;
 const q=s.selfWeight?-p.A*1e-9*mt.rho*9.80665*s.factor:0,qx=q*d,qy=q*c,fl=[qx*L/2,qy*L/2,qy*L2/12,qx*L/2,qy*L/2,-qy*L2/12],fg=mv(tr(T),fl),ix=[3*a,3*a+1,3*a+2,3*b,3*b+1,3*b+2];
 ix.forEach((ii,i)=>{F[ii]+=fg[i];ix.forEach((jj,j)=>K[ii][jj]+=kg[i][j]);});els.push({m,L,p,mt,kl,T,fl,ix,qx,qy});}
 for(const l of s.loads){const i=ids.indexOf(l.node);if(i<0||![l.fx,l.fy,l.mz].every(Number.isFinite))throw Error('荷重の節点番号または値が不正です。');F[3*i]+=l.fx*1000*s.factor;F[3*i+1]+=l.fy*1000*s.factor;F[3*i+2]+=l.mz*1e6*s.factor;}
 const fixed=[];s.nodes.forEach((n,i)=>{if(n.fix!=='free')fixed.push(3*i,3*i+1);if(n.fix==='fixed')fixed.push(3*i+2);});if(!fixed.length)throw Error('支点を指定してください。');const free=Array.from({length:nd},(_,i)=>i).filter(i=>!fixed.includes(i));const uf=solve(free.map(i=>free.map(j=>K[i][j])),free.map(i=>F[i])),u=Array(nd).fill(0);free.forEach((i,j)=>u[i]=uf[j]);const R=mv(K,u).map((x,i)=>x-F[i]);
 let maxDisp=0;const results=els.map(e=>{const ul=mv(e.T,e.ix.map(i=>u[i])),f=mv(e.kl,ul).map((v,i)=>v-e.fl[i]);let maxM=0,maxV=0,maxN=0,compression=0,disp=0;const positions=Array.from({length:101},(_,i)=>e.L*i/100);if(e.qy&&-f[1]/e.qy>0&&-f[1]/e.qy<e.L)positions.push(-f[1]/e.qy);
 for(const x of positions){const t=x/e.L,N=-f[0]-e.qx*x,V=f[1]+e.qy*x,M=-f[2]+f[1]*x+e.qy*x*x/2;maxN=Math.max(maxN,Math.abs(N));compression=Math.max(compression,-N);maxV=Math.max(maxV,Math.abs(V));maxM=Math.max(maxM,Math.abs(M));const ux=ul[0]*(1-t)+ul[3]*t+e.qx*x*(e.L-x)/(2*e.mt.E*e.p.A);const uy=(1-3*t*t+2*t**3)*ul[1]+e.L*(t-2*t*t+t**3)*ul[2]+(3*t*t-2*t**3)*ul[4]+e.L*(-t*t+t**3)*ul[5]+e.qy*x*x*(e.L-x)**2/(24*e.mt.E*e.p.I);disp=Math.max(disp,Math.hypot(ux,uy));}
 maxDisp=Math.max(maxDisp,disp);const sigma=maxN/e.p.A+maxM/e.p.Z,tau=1.5*maxV/e.p.Av,cr=Math.PI**2*e.mt.E*e.p.Imin/(e.m.k*e.L)**2,allow=s.allow[e.m.material];const normal=allow.normal>0?sigma/allow.normal:null,shear=allow.shear>0?tau/allow.shear:null;
 return {id:e.m.id,L:e.L,p:e.p,material:e.m.material,N:maxN/1000,V:maxV/1000,M:maxM/1e6,sigma,tau,disp,euler:compression/cr,normal,shear,ratio:normal===null||shear===null?null:Math.max(normal,shear),f,ul};});
 const anchorCapacity=effectiveAnchorCapacity(s.anchor,{selfWeight:s.selfWeight});
 const supports=s.nodes.flatMap((n,i)=>{if(n.fix==='free')return [];const rx=R[3*i],ry=R[3*i+1],mz=R[3*i+2],a=s.anchor;const normal=n.mount==='wall'?-rx:n.mount==='ceiling'?ry:-ry,shear=n.mount==='wall'?ry:rx;const valid=a.count>=2&&a.count%2===0&&a.pitch>0;const tension=valid?(Math.max(0,normal)/a.count+2*Math.abs(mz)/(a.count*a.pitch))/1000:null,vs=valid?Math.abs(shear)/a.count/1000:null;return [{id:n.id,mount:n.mount,rx:rx/1000,ry:ry/1000,m:mz/1e6,tension,shear:vs,ratio:valid&&anchorCapacity.ready?tension/anchorCapacity.nt+vs/anchorCapacity.vt:null}];});
 return {results,supports,anchorCapacity,u,F,R,weight,maxDisp,defRatio:maxDisp/s.deflection,maxStress:Math.max(...results.map(r=>r.sigma)),memberRatio:results.every(r=>r.ratio!==null)?Math.max(...results.map(r=>r.ratio)):null,anchorRatio:supports.every(r=>r.ratio!==null)?Math.max(...supports.map(r=>r.ratio)):null,euler:Math.max(...results.map(r=>r.euler))};
}
