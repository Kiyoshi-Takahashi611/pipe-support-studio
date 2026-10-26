// IAPWS R7-97(2012), International Association for the Properties of Water and Steam.
// Region 2: Tables 11–14, Eqs. 15–17. Region 4: Table 34, Eqs. 30–31.
// B23: Table 1, Eq. 5. Coefficients reproduced with attribution per release permission.
export const gasSources={
 steam:{label:'IAPWS-IF97（IAPWS）',url:'https://iapws.org/technical-guidance/release/IF97-Rev',page:'Region 2 / Region 4・表11〜15、34〜36'},
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
export const isGas=type=>type==='air'||type==='steam';
export function gasDefaults(type){return {fluidDensityMode:'pt',fluidPressureBasis:'gauge',fluidPressure:0,fluidTemperature:type==='steam'?100:20};}
export function gasDensity(p){
 if(!isGas(p.fluidType))throw Error('圧力・温度による密度計算はエアー・蒸気のみです。');
 const pressure=p.fluidPressure,temperature=p.fluidTemperature,basis=p.fluidPressureBasis;
 if(!['gauge','absolute'].includes(basis))throw Error('圧力の基準を選択してください。');
 if(!Number.isFinite(pressure)||!Number.isFinite(temperature))throw Error('圧力と温度を数値で入力してください。');
 const absolutePressure=pressure+(basis==='gauge'?.101325:0),T=temperature+273.15;
 if(absolutePressure<=0)throw Error('絶対圧は0 MPaより大きくしてください（ゲージ圧＋0.101325 MPa）。');
 let density,note;
 if(p.fluidType==='air'){
  // Deliberately bounded app scope, not a claimed precision boundary for ideal air.
  if(temperature< -50||temperature>200||absolutePressure>2)throw Error('エアーの自動計算範囲は−50〜200℃・絶対圧2 MPa以下です。範囲外は密度を手入力してください。');
  density=absolutePressure*1e6/(287.05*T);
  note='乾燥空気の理想気体近似：ρ=Pabs/(287.05×T)。湿度・実在気体補正は含みません。本アプリの範囲：−50〜200℃・絶対圧2 MPa以下。';
 }else{
  density=steamDensity(absolutePressure,T);
  note='IAPWS-IF97 Region 2（0〜800℃・蒸気域）の単相蒸気。飽和線上は乾き飽和蒸気（乾き度1）として計算。湿り蒸気・凝縮水・水張り試験時の重量は含みません。';
 }
 const saturationC=p.fluidType==='steam'&&absolutePressure>=saturationPressure(273.15)&&absolutePressure<=22.064?saturationTemperature(absolutePressure)-273.15:null;
 return {fluidDensity:density,fluidDensitySource:'calculated',absolutePressure,temperatureK:T,saturationC,note,source:gasSources[p.fluidType],calculationCondition:`${pressure} MPa（${basis==='gauge'?'ゲージ圧':'絶対圧'}） / ${temperature}℃ / 絶対圧 ${absolutePressure.toFixed(6)} MPa${basis==='gauge'?'（大気圧0.101325 MPaを加算）':''}`};
}
