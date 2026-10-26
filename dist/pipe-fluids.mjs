import {isGas,gasDefaults,gasDensity} from './gas-density.mjs';
// Reference inputs, not universal design densities. Verified 2026-10-26.
// Oil initial values are app-selected examples within the cited SDS range.
export const fluidCatalog={
 water:{label:'水',density:1000,note:'常温水の丸めた入力初期値。温水などは使用温度の密度へ変更してください。'},
 heavyOil:{label:'重油',density:900,note:'A重油の入力例 900 kg/m³。参考SDSは15℃で820〜900 kg/m³。B・C重油や加熱時は実製品・使用温度の密度を入力してください。',source:{label:'ENEOS A重油一般品 SDS',url:'https://www.eneos.co.jp/business/sds/gasoline/pdf/a_heavy_oil_r.pdf',page:'2024-02-01版・7頁・密度'}},
 gasoline:{label:'ガソリン',density:750,note:'入力例 750 kg/m³。参考SDSは15℃で700〜780 kg/m³。採用品・使用温度の値へ変更できます。',source:{label:'ENEOS レギュラーガソリン SDS',url:'https://www.eneos.co.jp/business/sds/gasoline/pdf/00102_r.pdf',page:'2024-02-01版・8頁・密度'}},
 kerosene:{label:'灯油',density:800,note:'入力例 800 kg/m³。参考SDSは15℃で760〜830 kg/m³。採用品・使用温度の値へ変更できます。',source:{label:'ENEOS 灯油 SDS',url:'https://www.eneos.co.jp/business/sds/gasoline/pdf/01102_r.pdf',page:'2024-02-01版・7頁・密度'}},
 air:{label:'エアー（空気）',density:1.20479,note:'乾燥空気・海面付近の参考密度。圧縮空気はこの値を使わず、運転時の圧力・温度に対応する密度を入力してください。',source:{label:'NIST：AIR, DRY (NEAR SEA LEVEL)',url:'https://pml.nist.gov/cgi-bin/Star/compos.pl?matno=104&mode=text&refer=ap',page:'密度 1.20479E-03 g/cm³ を kg/m³ に換算'}},
 steam:{label:'蒸気',density:0.5977,note:'100℃・0 MPa（ゲージ圧）の飽和蒸気の参考値。運転時の圧力・温度・乾き度に対応する密度へ変更してください。凝縮水や水張り試験時の荷重は、この密度には含みません。',source:{label:'ミヤワキ：蒸気入門・飽和蒸気表',url:'https://www.miyawaki-inc.com/technical/basic03',page:'表1.2・ゲージ圧0.0 MPa・100℃'}},
 empty:{label:'空管（内容物なし）',density:0,note:'内容物の質量を0として計算します。'},
 custom:{label:'その他（密度を入力）',density:1000,note:'1000 kg/m³は入力例です。実際の内容物の密度へ変更してください。'}
};
export function fluidInput(p={}){
 if(Object.hasOwn(p,'fluidType'))return {fluidType:p.fluidType,fluidDensity:p.fluidDensity,fluidDensitySource:p.fluidDensitySource||'manual',fluidCondition:p.fluidCondition||'',...(isGas(p.fluidType)?{fluidDensityMode:p.fluidDensityMode||'manual',...(p.fluidType==='steam'?{steamState:p.steamState??'superheated',steamQualityPercent:Object.hasOwn(p,'steamQualityPercent')?p.steamQualityPercent:100}:{}),fluidPressureBasis:p.fluidDensityMode==='pt'?p.fluidPressureBasis:(p.fluidPressureBasis??'gauge'),fluidPressure:p.fluidDensityMode==='pt'?p.fluidPressure:(p.fluidPressure??0),fluidTemperature:p.fluidDensityMode==='pt'?p.fluidTemperature:(p.fluidTemperature??(p.fluidType==='steam'?100:20))}:{})};
 if(p.water!==undefined&&typeof p.water!=='boolean')throw Error('保存された満水条件が不正です。');
 const empty=p.water===false;
 return {fluidType:empty?'empty':'water',fluidDensity:empty?0:(Object.hasOwn(p,'waterDensity')?p.waterDensity:1000),fluidDensitySource:'legacy',fluidCondition:''};
}
export function chooseFluid(type){const f=Object.hasOwn(fluidCatalog,type)&&fluidCatalog[type];if(!f)throw Error('配管内容物の種類が不正です。');return {fluidType:type,fluidDensity:f.density,fluidDensitySource:'preset',fluidCondition:'',fluidDensityMode:isGas(type)?'pt':'manual',...(isGas(type)?gasDefaults(type):{})};}
export function fluidProperties(p){const f=fluidInput(p);if(!Object.hasOwn(fluidCatalog,f.fluidType))throw Error('配管内容物の種類が不正です。');if(isGas(f.fluidType)){if(!['pt','manual'].includes(f.fluidDensityMode))throw Error('密度の算出方法が不正です。');if(f.fluidDensityMode==='pt')return {...f,...fluidCatalog[f.fluidType],...gasDensity(f)};}if(!Number.isFinite(f.fluidDensity)||f.fluidDensity<0||(f.fluidType!=='empty'&&f.fluidDensity===0))throw Error('内容物の密度は正の値で入力してください。');if(f.fluidType==='empty'&&f.fluidDensity!==0)throw Error('空管の内容物密度は0です。');return {...f,...fluidCatalog[f.fluidType]};}
