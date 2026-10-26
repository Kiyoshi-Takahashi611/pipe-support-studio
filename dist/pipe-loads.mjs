import {pipeCatalog,pipeSources} from './pipe-catalog.mjs';
export {pipeCatalog,pipeSources};
export const gravity=9.80665;
export const pipeDefaults={loadMode:'auto',pipeType:'sgp',nominal:50,span:3,supportCase:'interior',tributary:3,water:true,waterDensity:1000,insulation:'none',insulationThickness:25,insulationDensity:80,extraMass:0,customOuter:60.5,customWall:3.8,customDensity:7850,customMass:5.31,customMassMode:'geometry',customMaterial:'任意配管'};
export function newPipe(x){return {x,diameter:60.5,load:0,...pipeDefaults};}
export function normalizePipe(p){return {...pipeDefaults,...p,loadMode:p.loadMode||'manual'};}
export function pipeWeight(p){
 if(!p||p.loadMode===undefined||p.loadMode==='manual'){if(!p||!Number.isFinite(p.diameter)||p.diameter<=0||!Number.isFinite(p.load)||p.load<0)throw Error('配管の外径・手入力荷重を確認してください。');return {mode:'manual',diameter:p.diameter,outerWithInsulation:p.diameter,load:p.load,pipeMass:null,waterMass:null,insulationMass:null,extraMass:null,totalMass:null,tributary:null,supportedMass:null,label:'荷重を手入力',source:null};}
 if(p.loadMode!=='auto')throw Error('配管荷重の設定方法が不正です。');
 let od,wall,pipeMass,label,source;
 if(p.pipeType==='custom'){
  if(![p.customOuter,p.customWall,p.customDensity].every(Number.isFinite)||p.customOuter<=0||p.customWall<=0||p.customWall*2>=p.customOuter||p.customDensity<=0)throw Error('任意配管の外径・肉厚・密度を確認してください。');
  od=p.customOuter;wall=p.customWall;label=p.customMaterial||'任意配管';source=null;
  if(p.customMassMode==='geometry')pipeMass=Math.PI/4*(od**2-(od-2*wall)**2)*1e-6*p.customDensity;
  else if(p.customMassMode==='mass'&&Number.isFinite(p.customMass)&&p.customMass>0)pipeMass=p.customMass;
  else throw Error('任意配管の単位質量を確認してください。');
 }else{
  const catalog=pipeCatalog[p.pipeType],row=catalog?.rows.find(r=>r.nominal===p.nominal);if(!row)throw Error('選択した材質・口径の管寸法は未登録です。');
  od=row.od;wall=row.wall;pipeMass=row.mass;label=catalog.label+' '+p.nominal+'A';source=pipeSources[catalog.source];
 }
 if(!Number.isFinite(p.span)||p.span<=0||!Number.isFinite(p.tributary)||p.tributary<=0||!['interior','end','custom'].includes(p.supportCase))throw Error('支持間隔・負担長を正の値で指定してください。');
 if(typeof p.water!=='boolean'||!Number.isFinite(p.waterDensity)||p.waterDensity<=0)throw Error('満水条件・水の密度を確認してください。');
 if(!['none','custom','nichias'].includes(p.insulation)||![p.insulationThickness,p.insulationDensity,p.extraMass].every(Number.isFinite)||p.insulationThickness<0||p.insulationDensity<=0||p.extraMass<0)throw Error('保温厚さ・密度・追加単位質量を確認してください。');
 const id=od-2*wall,waterMass=p.water?Math.PI/4*(id/1000)**2*p.waterDensity:0,t=p.insulation==='none'?0:p.insulationThickness,outerWithInsulation=od+2*t,insulationMass=Math.PI/4*(outerWithInsulation**2-od**2)*1e-6*p.insulationDensity;
 const totalMass=pipeMass+waterMass+insulationMass+p.extraMass,tributary=p.supportCase==='interior'?p.span:p.supportCase==='end'?p.span/2:p.tributary,supportedMass=totalMass*tributary,load=supportedMass*gravity/1000;
 if(![totalMass,load].every(Number.isFinite))throw Error('配管荷重が計算範囲を超えています。');
 return {mode:'auto',diameter:od,wall,id,outerWithInsulation,pipeMass,waterMass,insulationMass,extraMass:p.extraMass,totalMass,tributary,supportedMass,load,label,source};
}
export function tierWeights(t){const pipes=t.pipes.map(pipeWeight);return {pipes,load:pipes.reduce((s,p)=>s+p.load,0),automatic:pipes.every(p=>p.mode==='auto'),pipeKg:pipes.reduce((s,p)=>s+(p.pipeMass||0)*(p.tributary||0),0),waterKg:pipes.reduce((s,p)=>s+(p.waterMass||0)*(p.tributary||0),0),insulationKg:pipes.reduce((s,p)=>s+(p.insulationMass||0)*(p.tributary||0),0),extraKg:pipes.reduce((s,p)=>s+(p.extraMass||0)*(p.tributary||0),0)};}

export function hasPipeDeadLoad(s){return (s.geometryMode==='dimensions'&&s.rack?.tiers?.some(t=>t.pipes?.some(p=>p.loadMode==='auto')))||s.loads?.some(l=>l.sustained===true)||false;}
