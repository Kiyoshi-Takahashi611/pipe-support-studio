// Dimension-driven in-plane rack. Input y is distance from base (ceiling: down).
// All crossing steel centerlines are joined and split, pipe load applied at its center X.
const EPS=1e-6;
const mm=v=>Math.round(v*10)/10;
const finite=Number.isFinite;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function onLine(p,line){const v=sub(line.b,line.a),q=sub(p,line.a),L=distance(line.a,line.b);return Math.abs(cross(v,q))<=EPS*L&&q.x*v.x+q.y*v.y>=-EPS*L&&q.x*v.x+q.y*v.y<=L*L+EPS*L;}
export function defaultRack(s){return {left:0,right:s.w,tiers:[{height:s.h,pipes:[{x:mm(s.w/3),diameter:60.5,load:.5},{x:mm(2*s.w/3),diameter:60.5,load:.5}]}],braces:s.type==='brace'?[{ax:0,ay:mm(s.h*.35),bx:s.w,by:s.h}]:[]};}
export function resizeTiers(rack,count,height,width){if(!Number.isInteger(count)||count<1||count>6)throw Error('段数は1〜6で指定してください。');return {...rack,tiers:Array.from({length:count},(_,i)=>({height:mm(height*(i+1)/count),pipes:rack.tiers[i]?.pipes.map(p=>({...p}))||[{x:mm(width/3),diameter:60.5,load:.5},{x:mm(2*width/3),diameter:60.5,load:.5}]}))};}
export function buildRack(s){
 const r=s.rack;if(!r||!Array.isArray(r.tiers)||r.tiers.length<1||r.tiers.length>6||!Array.isArray(r.braces)||r.braces.length>8)throw Error('段数は1〜6、ブレースは8本までです。');
 if(!['l','brace','portal'].includes(s.type)||!['floor','wall','ceiling'].includes(s.mount)||!finite(s.w)||!finite(s.h)||s.w<1||s.h<1)throw Error('形状・取付面と正の幅・全高を指定してください。');
 const inBox=(p)=>[p.x,p.y].every(finite)&&p.x>=0&&p.x<=s.w&&p.y>=0&&p.y<=s.h;
 const heights=r.tiers.map(t=>t.height);if(heights.some(h=>!finite(h)||h<1||h>s.h))throw Error('各段の高さは1 mm以上、全高以下で指定してください。');
 if(heights.some((h,i)=>heights.some((v,j)=>j!==i&&Math.abs(v-h)<1)))throw Error('段の高さは1 mm以上離してください。');
 if(s.type==='portal'&&(!finite(r.left)||!finite(r.right)||r.left<0||r.right>s.w||r.right-r.left<1))throw Error('門型の脚位置は 0 ≤ 左脚 < 右脚 ≤ 梁幅、脚間は1 mm以上で指定してください。');
 const lines=[],supports=[],pipes=[],warnings=[];
 function line(a,b,kind){if(distance(a,b)<1)throw Error('部材長は1 mm以上必要です。');const x={a,b,kind,points:[a,b]};lines.push(x);return x;}
 const xs=s.type==='portal'?[r.left,r.right]:[0];
 for(const x of xs){line({x,y:0},{x,y:s.h},'column');supports.push({x,y:0});}
 if(s.mount==='wall'&&s.type!=='portal')supports.push({x:0,y:s.h});
 for(let i=0;i<r.tiers.length;i++){
  const t=r.tiers[i];if(!Array.isArray(t.pipes)||t.pipes.length>8)throw Error(`段${i+1}の配管は8本までです。`);
  line({x:0,y:t.height},{x:s.w,y:t.height},'tier');
  t.pipes.forEach((p,j)=>{if(![p.x,p.diameter,p.load].every(finite)||p.x<0||p.x>s.w||p.diameter<=0||p.load<0)throw Error(`段${i+1}・配管${j+1}の位置・外径・荷重を確認してください。`);pipes.push({...p,tier:i+1,number:j+1,y:t.height});});
 }
 const core=[...lines];
 r.braces.forEach((b,i)=>{const a={x:b.ax,y:b.ay},z={x:b.bx,y:b.by};if(!inBox(a)||!inBox(z)||distance(a,z)<1)throw Error(`ブレース${i+1}の両端を幅・全高の範囲内で指定してください。`);if(Math.abs(a.x-z.x)<EPS||Math.abs(a.y-z.y)<EPS)throw Error(`ブレース${i+1}は斜めになる取付位置を指定してください。`);if(!core.some(l=>onLine(a,l))||!core.some(l=>onLine(z,l)))throw Error(`ブレース${i+1}の両端を柱または各段の梁上に指定してください。`);line(a,z,'brace');});
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const a=lines[i],b=lines[j],v=sub(a.b,a.a),w=sub(b.b,b.a),delta=sub(b.a,a.a),den=cross(v,w);
  if(Math.abs(den)<EPS){if(Math.abs(cross(delta,v))<EPS*distance(a.a,a.b)){const common=[a.a,a.b,b.a,b.b].filter(p=>onLine(p,a)&&onLine(p,b));if(common.some(p=>common.some(q=>distance(p,q)>EPS)))throw Error('部材が重複しています。ブレースの位置を確認してください。');}continue;}
  const t=cross(delta,w)/den,u=cross(delta,v)/den;
  if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS){const p={x:a.a.x+t*v.x,y:a.a.y+t*v.y};a.points.push(p);b.points.push(p);}
 }
 for(const p of pipes){const q={x:p.x,y:p.y};for(const l of lines)if(onLine(q,l))l.points.push(q);}
 const nodes=[],members=[];const sign=s.mount==='ceiling'?-1:1;
 function node(p){let n=nodes.find(n=>Math.hypot(n.x-p.x,n.y-sign*p.y)<EPS);if(!n){n={id:nodes.length+1,x:p.x,y:sign*p.y,fix:supports.some(q=>distance(p,q)<EPS)?'fixed':'free',mount:s.mount};nodes.push(n);}return n.id;}
 lines.forEach((l,index)=>{const ps=l.points.filter((p,i,arr)=>!arr.slice(0,i).some(q=>distance(p,q)<EPS)).sort((p,q)=>distance(l.a,p)-distance(l.a,q));for(let i=0;i<ps.length-1;i++){const length=distance(ps[i],ps[i+1]);if(length<1)throw Error('取付点・配管荷重点が近すぎます。部材の分割長が1 mm以上になるよう調整してください。');members.push({id:members.length+1,a:node(ps[i]),b:node(ps[i+1]),section:s.defaultSection,material:s.material,k:1,group:index+1,kind:l.kind,physicalLength:distance(l.a,l.b)});}});
 const loads=pipes.map(p=>({node:node({x:p.x,y:p.y}),fx:0,fy:-p.load,mz:0,pipe:true,tier:p.tier,number:p.number}));
 if(nodes.length>80||members.length>160)throw Error('生成モデルの上限（80節点・160部材）を超えました。配管かブレースを減らしてください。');
 // Clearance is only a circle-outline check; no fabricated steel profile or insulation thickness is inferred.
 for(let i=0;i<pipes.length;i++){const a=pipes[i];if(a.x-a.diameter/2<0||a.x+a.diameter/2>s.w)warnings.push(`段${a.tier}・配管${a.number}の外径が梁幅からはみ出しています。`);for(let j=i+1;j<pipes.length;j++){const b=pipes[j];if(Math.hypot(a.x-b.x,sign*a.y+a.diameter/2-sign*b.y-b.diameter/2)<(a.diameter+b.diameter)/2-EPS)warnings.push(`段${a.tier}・配管${a.number}と段${b.tier}・配管${b.number}の外径が重なっています。`);}}
 return {nodes,members,loads,pipeVisuals:pipes.map(p=>({...p,y:sign*p.y})),rackWarnings:warnings};
}
