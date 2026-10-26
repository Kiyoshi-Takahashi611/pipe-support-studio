// IAPWS R7-97(2012), International Association for the Properties of Water and Steam.
// Region 1: Tables 2–5, Eq. 7.
// Region 2: Tables 11–14, Eqs. 15–17. Region 4: Table 34, Eqs. 30–31.
// B23: Table 1, Eq. 5. Coefficients reproduced with attribution per release permission.
export const gasSources={
 steam:{label:'IAPWS-IF97（IAPWS）',url:'https://iapws.org/technical-guidance/release/IF97-Rev',page:'Region 1 / 2 / 4・表2〜5、11〜15、34〜36'},
 air:{label:'アイオワ大学・Fluid Mechanics（乾燥空気の状態方程式）',url:'https://stern.lab.uiowa.edu/sites/stern.lab.uiowa.edu/files/2024-11/Chapter1.pdf',page:'Chapter 1・12頁 / R=287.05 J/(kg·K)'}
};
const residual=[
[1,0,-.17731742473213e-2],[1,1,-.17834862292358e-1],[1,2,-.45996013696365e-1],[1,3,-.57581259083432e-1],[1,6,-.50325278727930e-1],
[2,1,-.33032641670203e-4],[2,2,-.18948987516315e-3],[2,4,-.39392777243355e-2],[2,7,-.43797295650573e-1],[2,36,-.26674547914087e-4],
[3,0,.20481737692309e-7],[3,1,.43870667284435e-6],[3,3,-.32277677238570e-4],[3,6,-.15033924542148e-2],[3,35,-.40668253562649e-1],
[4,1,-.78847309559367e-9],[4,2,.12790717852285e-7],[4,3,.48225372718507e-6],[5,7,.22922076337661e-5],[6,3,-.16714766451061e-10],
[6,16,-.21171472321355e-2],[6,35,-.23895741934104e2],[7,0,-.59059564324270e-17],[7,11,-.12621808899101e-5],[7,25,-.38946842435739e-1],
[8,8,.11256211360459e-10],[8,36,-.82311340897998e1],[9,13,.19809712802088e-7],[10,4,.10406965210174e-18],[10,10,-.10234747095929e-12],
[10,14,-.10018179379511e-8],[16,29,-.80882908646985e-10],[16,50,.10693031879409],[18,57,-.33662250574171],[20,20,.89185845355421e-24],
[20,35,.30629316876232e-12],[20,48,-.42002467698208e-5],[21,21,-.59056029685639e-25],[22,53,.37826947613457e-5],
[23,39,-.12768608934681e-14],[24,26,.73087610595061e-28],[24,40,.55414715350778e-16],[24,58,-.94369707241210e-6]
];
const n=[0,.11670521452767e4,-.72421316703206e6,-.17073846940092e2,.12020824702470e5,-.32325550322333e7,.14915108613530e2,-.48232657361591e4,.40511340542057e6,-.23855557567849,.65017534844798e3];
export function saturationPressure(T){
 if(!Number.isFinite(T)||T<273.15||T>647.096)throw Error('飽和温度の計算範囲外です。');
 const t=T+n[9]/(T-n[10]),A=t*t+n[1]*t+n[2],B=n[3]*t*t+n[4]*t+n[5],C=n[6]*t*t+n[7]*t+n[8];
 return (2*C/(-B+Math.sqrt(B*B-4*A*C)))**4;
}
export function saturationTemperature(p){
 if(!Number.isFinite(p)||p<saturationPressure(273.15)||p>22.064)throw Error('飽和圧力の計算範囲外です。');
 const b=p**.25,E=b*b+n[3]*b+n[6],F=n[1]*b*b+n[4]*b+n[7],G=n[2]*b*b+n[5]*b+n[8];
 const D=2*G/(-F-Math.sqrt(F*F-4*E*G));return (n[10]+D-Math.sqrt((n[10]+D)**2-4*(n[9]+n[10]*D)))/2;
}
export function steamDensity(p,T){
 if(!Number.isFinite(p)||p<=0||p>100||!Number.isFinite(T)||T<273.15||T>1073.15)throw Error('蒸気の自動計算は0〜800℃・絶対圧100 MPa以下のIF97 Region 2が対象です。');
 const limit=T<=623.15?saturationPressure(T):T<=863.15?348.05185628969-1.1671859879975*T+.0010192970039326*T*T:100;
 if(p>limit*(1+1e-10)){
  const ts=p>=saturationPressure(273.15)&&p<=22.064?saturationTemperature(p)-273.15:null;
  throw Error(ts!==null&&T<ts+273.15?`入力温度は飽和温度 ${ts.toFixed(3)}℃未満です。液相・湿り蒸気にはこの計算を使えません。温度を確認するか、密度を手入力してください。`:'IF97 Region 2の範囲外です。根拠資料の密度を手入力してください。');
 }
 const tau=540/T,derivative=1/p+residual.reduce((sum,[I,J,c])=>sum+c*I*p**(I-1)*(tau-.5)**J,0);
 const v=.461526*T*derivative/1000;
 if(!Number.isFinite(v)||v<=0)throw Error('蒸気密度を計算できません。');
 return 1/v;
}
// Region 1 Gibbs coefficients from IAPWS Table 2; the I=0 terms have zero pressure derivative.
const liquidTerms=[
[1,-9,.28319080123804e-3],[1,-7,-.60706301565874e-3],[1,-1,-.18990068218419e-1],[1,0,-.32529748770505e-1],[1,1,-.21841717175414e-1],[1,3,-.52838357969930e-4],
[2,-3,-.47184321073267e-3],[2,0,-.30001780793026e-3],[2,1,.47661393906987e-4],[2,3,-.44141845330846e-5],[2,17,-.72694996297594e-15],
[3,-4,-.31679644845054e-4],[3,0,-.28270797985312e-5],[3,6,-.85205128120103e-9],[4,-5,-.22425281908000e-5],[4,-2,-.65171222895601e-6],[4,10,-.14341729937924e-12],
[5,-8,-.40516996860117e-6],[8,-11,-.12734301741641e-8],[8,-6,-.17424871230634e-9],[21,-29,-.68762131295531e-18],[23,-31,.14478307828521e-19],[29,-38,.26335781662795e-22],[30,-39,-.11947622640071e-22],[31,-40,.18228094581404e-23],[32,-41,-.93537087292458e-25]
];
export function liquidDensity(p,T){
 if(!Number.isFinite(p)||p<=0||p>100||!Number.isFinite(T)||T<273.15-1e-8||T>623.15+1e-8)throw Error('飽和水の密度計算範囲外です。');
 T=Math.min(623.15,Math.max(273.15,T));
 if(p<saturationPressure(T)*(1-1e-9))throw Error('Region 1の液相範囲外です。');
 const pi=p/16.53,tau=1386/T;
 const d=liquidTerms.reduce((sum,[I,J,c])=>sum-c*I*(7.1-pi)**(I-1)*(tau-1.222)**J,0);
 const v=.461526*T*d/(16.53*1000);
 if(!Number.isFinite(v)||v<=0)throw Error('飽和水密度を計算できません。');
 return 1/v;
}
export const mixtureSource={label:'Purdue大学：乾き度と混合物の比体積',url:'https://engineering.purdue.edu/~wassgren/teaching/ME20000/NotesAndReading/Lec08_Reading_Wassgren.pdf',page:'3.5.2 Quality・式3.51〜3.56'};
export function saturatedMixture(p,qualityPercent=100){
 if(!Number.isFinite(qualityPercent)||qualityPercent<0||qualityPercent>100)throw Error('乾き度は0〜100％で入力してください。');
 if(!Number.isFinite(p)||p<saturationPressure(273.15)||p>saturationPressure(623.15))throw Error('飽和蒸気の自動計算範囲は絶対圧0.000611213〜16.529164 MPa（飽和温度0〜350℃）です。');
 const T=saturationTemperature(p),liquidSpecificVolume=1/liquidDensity(p,T),vaporSpecificVolume=1/steamDensity(p,T),quality=qualityPercent/100;
 const mixtureSpecificVolume=(1-quality)*liquidSpecificVolume+quality*vaporSpecificVolume;
 return {qualityPercent,quality,liquidSpecificVolume,vaporSpecificVolume,mixtureSpecificVolume,fluidDensity:1/mixtureSpecificVolume,mixtureSource,phaseLabel:quality===1?'乾き飽和蒸気':quality===0?'飽和水':'湿り蒸気'};
}
export const isGas=type=>type==='air'||type==='steam';
export function gasDefaults(type){return {fluidDensityMode:'pt',fluidPressureBasis:'gauge',fluidPressure:0,fluidTemperature:type==='steam'?100:20,...(type==='steam'?{steamState:'superheated',steamQualityPercent:100}:{})};}
export function gasDensity(p){
 if(!isGas(p.fluidType))throw Error('圧力・温度による密度計算はエアー・蒸気のみです。');
 const pressure=p.fluidPressure,basis=p.fluidPressureBasis,steamState=p.steamState??'superheated',saturated=p.fluidType==='steam'&&steamState==='saturated';
 if(p.fluidType==='steam'&&!['saturated','superheated'].includes(steamState))throw Error('蒸気の状態を選択してください。');
 let temperature=p.fluidTemperature;
 if(!['gauge','absolute'].includes(basis))throw Error('圧力の基準を選択してください。');
 if(!Number.isFinite(pressure)||(!saturated&&!Number.isFinite(temperature)))throw Error(saturated?'圧力を数値で入力してください。':'圧力と温度を数値で入力してください。');
 const absolutePressure=pressure+(basis==='gauge'?.101325:0);
 if(absolutePressure<=0)throw Error('絶対圧は0 MPaより大きくしてください（ゲージ圧＋0.101325 MPa）。');
 if(saturated){
  if(absolutePressure<saturationPressure(273.15)||absolutePressure>saturationPressure(623.15))throw Error('飽和蒸気の自動計算範囲は絶対圧0.000611213〜16.529164 MPa（飽和温度0〜350℃）です。範囲外は密度を手入力してください。');
  temperature=saturationTemperature(absolutePressure)-273.15;
 }
 const T=temperature+273.15;
 let density,note,mixture={};
 if(p.fluidType==='air'){
  // Deliberately bounded app scope, not a claimed precision boundary for ideal air.
  if(temperature< -50||temperature>200||absolutePressure>2)throw Error('エアーの自動計算範囲は−50〜200℃・絶対圧2 MPa以下です。範囲外は密度を手入力してください。');
  density=absolutePressure*1e6/(287.05*T);
  note='乾燥空気の理想気体近似：ρ=Pabs/(287.05×T)。湿度・実在気体補正は含みません。本アプリの範囲：−50〜200℃・絶対圧2 MPa以下。';
 }else{
  density=steamDensity(absolutePressure,T);
  if(!saturated&&absolutePressure>=saturationPressure(273.15)&&absolutePressure<=22.064&&T<=saturationTemperature(absolutePressure)+1e-7)throw Error('過熱蒸気は飽和温度より高い温度を入力してください。飽和蒸気の場合は「飽和蒸気」を選択してください。');
  if(saturated){const q=Object.hasOwn(p,'steamQualityPercent')?p.steamQualityPercent:100;if(!Number.isFinite(q))throw Error('乾き度は0〜100％で入力してください。');mixture=saturatedMixture(absolutePressure,q);density=mixture.fluidDensity;}
  note=saturated?'飽和水・蒸気の熱平衡混合物：x=乾き度/100、ρ=1/[(1−x)vf+xvg]。IF97 Region 1・2でvf・vg、Region 4で温度を算定。管内に一様に分布する混合物の平均重量として計算。別途の滞留水・気液の速度差による液体滞留量・水張り試験時の重量は含みません。範囲：絶対圧0.000611213〜16.529164 MPa（0〜350℃）。':'過熱蒸気：入力圧力・温度からIAPWS-IF97 Region 2で密度を計算（0〜800℃の適用域）。湿り蒸気・凝縮水・水張り試験時の重量は含みません。';
 }
 const saturationC=p.fluidType==='steam'&&absolutePressure>=saturationPressure(273.15)&&absolutePressure<=22.064?saturationTemperature(absolutePressure)-273.15:null;
 return {...mixture,fluidDensity:density,fluidDensitySource:'calculated',absolutePressure,temperatureK:T,operatingTemperature:temperature,...(p.fluidType==='steam'?{steamState}:{}),saturationC,note,source:gasSources[p.fluidType],calculationCondition:`${p.fluidType==='steam'?(saturated?`${mixture.phaseLabel}（乾き度 ${mixture.qualityPercent}％ / x=${mixture.quality}） / `:'過熱蒸気 / '):''}${pressure} MPa（${basis==='gauge'?'ゲージ圧':'絶対圧'}） / ${saturated?'自動算定温度 '+temperature.toFixed(6):temperature}℃ / 絶対圧 ${absolutePressure.toFixed(6)} MPa${basis==='gauge'?'（大気圧0.101325 MPaを加算）':''}`};
}
