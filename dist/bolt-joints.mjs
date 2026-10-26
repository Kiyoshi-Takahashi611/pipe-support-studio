// Side-plate joints only: bolt axes Z, plate and frame actions in X/Y.
// Capacity references and the elastic load distribution use separate, explicit sources.
export const jointSources={
 jfeBolts:{title:'JFE 鋼構造設計便覧 第6章',url:'https://www.jfe-steel.co.jp/products/building/assets/pdf/binran/binran_chapter06.pdf',page:'PDF 2–3頁 / 6-1〜6-4'},
 jfePlate:{title:'JFE 鋼構造設計便覧 第4章',url:'https://www.jfe-steel.co.jp/products/building/assets/pdf/binran/binran_chapter04.pdf',page:'PDF 2–3頁 / 4-1〜4-4'},
 boltF:{title:'平成12年建設省告示2464号 基準強度',url:'https://www.mlit.go.jp/notice/noticedata/pdf/201703/00006510.pdf',page:'PDF 3–5頁'},
 areas:{title:'日星精工 ねじの有効断面積',url:'https://nssy.co.jp/material/material04/',page:'並目ねじ表'},
 f10t:{title:'日鉄ボルテン 高力六角ボルト F10T',url:'https://www.bolten.nipponsteel.com/products/5909/',page:'建築用許容力表（2024-11-08更新）'},
 s10t:{title:'日鉄ボルテン トルシア形高力ボルト S10T',url:'https://www.bolten.nipponsteel.com/products/4736/',page:'建築用許容力表（2024-12-05更新）'},
 friction:{title:'高力ボルト協会 Q&A',url:'https://www.kouriki-bolt.jp/qa/faq',page:'許容力・摩擦面・孔径・板厚'},
 susPlate:{title:'日本製鉄 ステンレス鋼板',url:'https://www.nipponsteel.com/product/catalog_download/pdf/S008.pdf',page:'SUS304 機械的性質（0.2%耐力205 MPa）'},
 elastic:{title:'NASA Fastener Design Manual RP-1228',url:'https://ntrs.nasa.gov/api/citations/19900009424/downloads/19900009424.pdf',page:'printed p17, Finding Shear Loads on Fastener Group, 1990'}
};
export const boltSizes={6:20.1,8:36.6,10:58,12:84.3,14:115,16:157,18:192,20:245,22:303,24:353,27:459,30:561};
export const ordinaryGrades={'4.6':{F:240,label:'炭素鋼 4.6'},'4.8':{F:240,label:'炭素鋼 4.8'},'5.6':{F:300,label:'炭素鋼 5.6'},'5.8':{F:300,label:'炭素鋼 5.8'},'6.8':{F:420,label:'炭素鋼 6.8'},'A2-50':{F:210,label:'ステンレス A2-50'},'A4-50':{F:210,label:'ステンレス A4-50'}};
// [long one-plane, long two-plane, short one-plane, short two-plane], kN/bolt.
export const slipTable={12:[17,33.9,25.4,50.9],16:[30.2,60.3,45.2,90.5],20:[47.1,94.2,70.7,141],22:[57,114,85.5,171],24:[67.9,136,102,204],27:[85.9,172,129,258],30:[106,212,159,318]};
export function boltDefaults(t={}){const n=Number.isInteger(t.boltCount)&&t.boltCount>0&&t.boltCount<=36?t.boltCount:4,cols=n%2===0?2:1,rows=n/cols;return {method:'bearing',grade:'4.6',diameter:Number(t.boltSpec?.match(/M(\d+)/i)?.[1])||12,period:'long',planes:1,rows,cols,pitchX:50,pitchY:50,hole:14,offsetX:0,offsetY:0,plateMaterial:'SS400',plateT:6,plateW:160,plateH:160,mateMaterial:'SS400',mateT:6,mateW:160,mateH:160,scopeConfirmed:false,fitConfirmed:false,frictionSurface:'standard',slipCoefficient:.45,frictionConfirmed:false,loadCaseConfirmed:false,evidence:''};}
export function normalizeBoltDesign(t={}){return {...boltDefaults(t),...(t.boltDesign||{})};}
export const boltCount=d=>d.rows*d.cols;
export function boltLabel(d){return `${ordinaryGrades[d.grade]?.label||d.grade} / M${d.diameter}`;}
export function layoutBolts(d){if(!Number.isInteger(d.rows)||!Number.isInteger(d.cols)||d.rows<1||d.cols<1||d.rows>6||d.cols>6)throw Error('縦・横の本数はそれぞれ1〜6本です。');if(!Number.isFinite(d.pitchX)||!Number.isFinite(d.pitchY)||d.pitchX<0||d.pitchY<0)throw Error('ボルトピッチを確認してください。');return Array.from({length:d.rows},(_,r)=>Array.from({length:d.cols},(_,c)=>({id:r*d.cols+c+1,x:(c-(d.cols-1)/2)*d.pitchX,y:(r-(d.rows-1)/2)*d.pitchY}))).flat();}
export function distributeBoltForces(d,action){
 const points=layoutBolts(d),n=points.length,Fx=action.fx*1000,Fy=action.fy*1000,M=action.m*1e6-d.offsetX*Fy+d.offsetY*Fx,J=points.reduce((v,p)=>v+p.x*p.x+p.y*p.y,0);
 if(![Fx,Fy,M].every(Number.isFinite))throw Error('接合部の作用力・偏心距離が不正です。');
 if(J===0&&Math.abs(M)>1e-6)throw Error('1本のボルトでは曲げモーメントを伝達できません。配置を増やしてください。');
 return {M,J,points:points.map(p=>{const qx=Fx/n-(J?M*p.y/J:0),qy=Fy/n+(J?M*p.x/J:0);return {...p,qx:qx/1000,qy:qy/1000,q:Math.hypot(qx,qy)/1000};})};
}
export function plateStrength(material,t,period){if(!Number.isFinite(t)||t<3||t>40)throw Error('板厚は今回の登録範囲3〜40 mmで指定してください。');if(!['SS400','SUS304'].includes(material))throw Error('接合板・相手材の材質を確認してください。');const F=material==='SS400'?235:205,k=period==='short'?1.5:1;return {F,ft:F/1.5*k,fs:F/(1.5*Math.sqrt(3))*k,fb:F/1.5*k,fp:1.25*F*k,reference:material==='SUS304'};}
// Conservative screening of straight hole-subtracted sections. Full actions are
// enveloped at each potential cut, not a detailed finite-element plate analysis.
function plateScreen(d,action,dist,prefix,share){
 const t=d[prefix+'T'],W=d[prefix+'W'],H=d[prefix+'H'],strength=plateStrength(d[prefix+'Material'],t,d.period),Fx=Math.abs(action.fx)*1000*share,Fy=Math.abs(action.fy)*1000*share,M=Math.abs(dist.M)*share;
 const ys=Array.from({length:d.rows},(_,i)=>(i-(d.rows-1)/2)*d.pitchY),xs=Array.from({length:d.cols},(_,i)=>(i-(d.cols-1)/2)*d.pitchX);
 const netX=t*(H-d.rows*d.hole),netY=t*(W-d.cols*d.hole),Ix=t*(H**3/12-ys.reduce((v,y)=>v+d.hole**3/12+d.hole*y*y,0)),Iy=t*(W**3/12-xs.reduce((v,x)=>v+d.hole**3/12+d.hole*x*x,0));
 if(![netX,netY,Ix,Iy].every(Number.isFinite)||Math.min(netX,netY,Ix,Iy)<=0)throw Error('孔欠損後の板断面が成立しません。');
 const calc=(A,Z,N,V,Mc)=>{const sigma=N/A+Mc/Z,tau=1.5*V/A;return {A,Z,sigma,tau,ratio:sigma/strength.ft+tau/strength.fs};};
 const netVertical=calc(netX,Ix/(H/2),Fx,Fy,M+Math.max(...xs.map(Math.abs))*Fy),netHorizontal=calc(netY,Iy/(W/2),Fy,Fx,M+Math.max(...ys.map(Math.abs))*Fx);
 const grossVertical=calc(t*H,t*H*H/6,Fx,Fy,M+W/2*Fy),grossHorizontal=calc(t*W,t*W*W/6,Fy,Fx,M+H/2*Fx);
 const sections=[netVertical,netHorizontal,grossVertical,grossHorizontal];
 return {prefix,share,t,W,H,strength,netX,netY,Ix,Iy,sections,netRatio:Math.max(netVertical.ratio,netHorizontal.ratio),grossRatio:Math.max(grossVertical.ratio,grossHorizontal.ratio),bearingCapacity:strength.fp*d.diameter*t/1000,bearingDemand:Math.max(...dist.points.map(p=>p.q))*share};
}
export const jointLimitations=['接合部全体の合否は判定しません。以下は別途設計が必要です。','端抜け・ブロック破断、板の局部座屈、溶接・接合板の支持部、剛接の回転剛性、疲労、面外力・てこ反力は未照査です。','ボルト・接合板の追加自重は自動加算しません。必要な重量は荷重条件へ加えてください。','板の断面評価は直線状の孔欠損断面への全作用力による保守的な参考評価です。局部的な荷重拡散を解析していません。'];
export function evaluateBoltJoint(input,action){
 const d={...boltDefaults(),...input},issues=[],advisories=[],sources=['jfePlate','elastic'],checks=[];
 const out={design:d,status:'incomplete',issues,advisories,sources,checks,ratio:null,points:[],plate:[],allowable:null,limitations:jointLimitations};
 try{
  if(!['bearing','friction'].includes(d.method)||!['long','short'].includes(d.period)||![1,2].includes(d.planes))throw Error('接合方式・荷重区分・伝達面数を確認してください。');
  if(!Number.isFinite(d.diameter)||!Object.hasOwn(boltSizes,d.diameter))throw Error('ボルト径は登録された径を選択してください。');
  if(!Number.isFinite(d.hole)||d.hole<d.diameter||d.hole>d.diameter+2)throw Error('今回の対応孔は正円・呼び径以上〜径＋2 mmです。');
  for(const k of ['offsetX','offsetY','pitchX','pitchY','plateW','plateH','mateW','mateH'])if(!Number.isFinite(d[k]))throw Error('配置と板寸法は有限の数値で入力してください。');
  const dist=distributeBoltForces(d,action);out.points=dist.points;out.M=dist.M;out.J=dist.J;
  if((d.cols>1&&d.pitchX<2.5*d.diameter)||(d.rows>1&&d.pitchY<2.5*d.diameter))issues.push('ボルト間隔は2.5d以上にしてください。');
  for(const prefix of ['plate','mate']){
   const ex=(d[prefix+'W']-(d.cols-1)*d.pitchX)/2,ey=(d[prefix+'H']-(d.rows-1)*d.pitchY)/2;
   if(Math.min(ex,ey)<2.5*d.diameter)issues.push(`${prefix==='plate'?'接合板':'相手材'}の全周縁端距離を2.5d以上にしてください（本アプリの保守的な適用範囲）。`);
   if(d[prefix+'W']<=0||d[prefix+'H']<=0)throw Error('板幅・高さは正の値です。');
  }
  if(d.plateT*d.planes+d.mateT>5*d.diameter)issues.push('締付ける板の総厚は5d以下が対象です。');
  if(d.method==='bearing'){
   const g=ordinaryGrades[d.grade];if(!g)throw Error('普通ボルトの登録強度区分を選択してください。');
   out.allowable=boltSizes[d.diameter]*g.F/(1.5*Math.sqrt(3))*d.planes*(d.period==='short'?1.5:1)/1000;
   out.area=boltSizes[d.diameter];out.F=g.F;sources.push('jfeBolts','areas','boltF');
   advisories.push('普通ボルトは有効断面積AsとF/(1.5√3)を使う参考せん断照査です。A2/A4は強度区分50のみ登録。材質名だけで強度区分は推定しません。');
  }else{
   if(!['F10T','S10T'].includes(d.grade)||!slipTable[d.diameter]||(d.grade==='S10T'&&d.diameter===12))throw Error('選択した高力ボルトの径は許容力表にありません。');
   out.allowable=slipTable[d.diameter][(d.period==='short'?2:0)+d.planes-1];sources.push(d.grade==='F10T'?'f10t':'s10t','friction');
   if(d.plateMaterial!=='SS400'||d.mateMaterial!=='SS400')issues.push('登録摩擦耐力はSS400同士の標準摩擦面に限定します。SUSの摩擦接合は対象外です。');
   if(d.frictionSurface!=='standard')issues.push('塗装・めっき面・その他の摩擦面は登録表の対象外です。');
   if(!Number.isFinite(d.slipCoefficient)||d.slipCoefficient<.45)issues.push('確認したすべり係数が0.45以上であることが必要です。');
   if(d.frictionConfirmed!==true)issues.push('摩擦面処理・すべり係数・所定の締付けを確認してください。');
   advisories.push('摩擦耐力はメーカー掲載値を使用し、0.45を超えるすべり係数でも増加させません。すべり耐力とボルトの直接せん断耐力は別物です。');
  }
  const demand=Math.max(...dist.points.map(p=>p.q));checks.push({name:d.method==='friction'?'ボルト1本の摩擦すべり':'ボルト1本のせん断',demand,capacity:out.allowable,unit:'kN/本',ratio:demand/out.allowable});
  for(const [prefix,share] of [['plate',1/d.planes],['mate',1]]){
   const p=plateScreen(d,action,dist,prefix,share),label=prefix==='plate'?'接合板':'相手材';out.plate.push(p);
   if(p.strength.reference){advisories.push(`${label}のSUS304は0.2%耐力205 MPaを用いる材料参考評価です。建築構造用SUS304Aの基準強度ではありません。`);sources.push('susPlate');}
   if(d.method==='bearing')checks.push({name:label+'の孔壁支圧',demand:p.bearingDemand,capacity:p.bearingCapacity,unit:'kN/孔',ratio:p.bearingDemand/p.bearingCapacity});
   checks.push({name:label+'の孔欠損断面（参考）',demand:p.netRatio,capacity:1,unit:'合成比',ratio:p.netRatio},{name:label+'の総断面（参考）',demand:p.grossRatio,capacity:1,unit:'合成比',ratio:p.grossRatio});
  }
  if(d.scopeConfirmed!==true)issues.push('側板の面内接合で、ボルト軸方向の引張・面外偏心がないことを確認してください。');
  if(d.fitConfirmed!==true)issues.push('接合板と相手材の実際の有効寸法・孔配置の納まりを確認してください。');
  if(d.period==='short'&&d.loadCaseConfirmed!==true)issues.push('短期荷重の組合せを確認してください。荷重は自動追加されません。');
  if(!checks.every(c=>[c.demand,c.capacity,c.ratio].every(Number.isFinite)&&c.capacity>0&&c.ratio>=0))throw Error('計算値が数値範囲を超えています。作用力・寸法を確認してください。');
  out.candidateRatio=Math.max(...checks.map(c=>c.ratio));out.status=issues.length?'incomplete':'checked';out.ratio=issues.length?null:out.candidateRatio;
 }catch(e){issues.push(e.message);out.status='outside';out.ratio=null;}
 out.sources=[...new Set(sources)];return out;
}
