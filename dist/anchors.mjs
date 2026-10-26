// Product identity and official reference links only. No design capacities are inferred.
const hilti='https://www.hilti.co.jp/c/CLS_FASTENER_7135/';
const sanko='https://sanko-techno.co.jp/products/metal/anchor20/';
const hyManual='https://www.hilti.co.jp/medias/sys_master/documents/h66/hd9/10117760024606/Technical-information-ASSET-DOC-LOC-22006755.pdf';
export const anchorProducts={
 'hilti-hy200r-v3':{maker:'HILTI',name:'HIT-HY 200-R V3',type:'chemical',material:'注入式樹脂 + 指定アンカーロッド（別途指定）',url:hilti+'CLS_CHEMICAL_ANCHORS_7135/r11219549',technical:hyManual,note:'使用するロッド・材質強度区分・径・埋込み・穿孔方法を特定してください。R V3とA V3の施工・硬化条件を区別し、母材温度と上向き施工の条件を資料で確認してください。'},
 'hilti-hy200a-v3':{maker:'HILTI',name:'HIT-HY 200-A V3',type:'chemical',material:'注入式樹脂 + 指定アンカーロッド（別途指定）',url:hilti+'CLS_CHEMICAL_ANCHORS_7135/r14406294',technical:hyManual,note:'高速硬化タイプ。使用するロッド・材質強度区分・径・埋込み・穿孔方法を特定してください。母材温度ごとの可使時間・硬化時間と上向き施工の条件を資料で確認してください。'},
 'hilti-hst4':{maker:'HILTI',name:'HST4',type:'metal',material:'カーボンスチール',diameters:[8,10,12,16,20],url:hilti+'CLS_MECHANICAL_ANCHORS_7135/r18476739',note:'ウェッジ式。径・全長・埋込み条件を製品品番で特定してください。対象のひび割れ条件、へりあき、群効果、施工トルクを製品資料に照合してください。'},
 'hilti-hst4r':{maker:'HILTI',name:'HST4-R',type:'metal',material:'ステンレス鋼（詳細鋼種は製品資料で確認）',diameters:[8,10,12,16,20],url:hilti+'CLS_MECHANICAL_ANCHORS_7135/r18476741',note:'ステンレス鋼ウェッジ式。架台のSUS304設定とは独立したアンカー材質です。HST4の耐力を流用せず、HST4-Rの品番・施工条件に対応する資料を使用してください。'},
 'sanko-tcw':{maker:'サンコーテクノ',name:'トルコンアンカー TCW',type:'metal',material:'スチール・三価クロメート処理',diameters:[6,8,10,12,16],url:sanko,note:'ウェッジ式。カタログの最大荷重（Fc=21 N/mm²）は許容荷重・保証値ではありません。M12の1280品番と1290以降では有効埋込み条件が異なるため、品番まで特定してください。'},
 'sanko-stcw':{maker:'サンコーテクノ',name:'トルコンアンカー STCW',type:'metal',material:'ステンレス・SUS304系',diameters:[8,10,12,16],url:sanko,note:'ウェッジ式。カタログの最大荷重は許容荷重・保証値ではありません。品番・母材条件に適合する許容耐力計算書等から採用値を指定してください。'},
 'sanko-tcwd':{maker:'サンコーテクノ',name:'トルコンアンカー TCW-D',type:'metal',material:'本体：スチール・溶融亜鉛めっき / スリーブ：SUS304',diameters:[8,10,12,16],url:sanko,note:'ウェッジ式。最大荷重を許容耐力に転記しないでください。TCW-Dの品番・母材条件に適合する許容耐力を指定してください。'}
};
export const anchorExtraDefaults={catalogId:'custom',spec:'',basis:'',source:'',crack:'unknown',duration:'unknown',installation:''};
export function normalizeAnchor(a){return {...anchorExtraDefaults,...a};}
export function chooseAnchorProduct(a,id){if(id!=='custom'&&!Object.hasOwn(anchorProducts,id))throw Error('未登録のアンカー製品です。');const p=anchorProducts[id];return {...normalizeAnchor(a),catalogId:id,type:p?.type||a.type,product:p?p.maker+' / '+p.name:'',spec:'',basis:'',source:'',installation:'',nt:0,vt:0,confirmed:false};}
export function anchorMissing(a){const missing=[];const id=a.catalogId||'custom';if(id!=='custom'){
 const p=Object.hasOwn(anchorProducts,id)?anchorProducts[id]:null;if(!p)return ['未登録の製品'];
 if(a.type!==p.type||a.product!==p.maker+' / '+p.name)missing.push('製品と種類の整合');
 if(p.diameters&&!p.diameters.includes(a.diameter))missing.push('製品の対応径');
 for(const [k,label] of [['spec',p.type==='chemical'?'ロッド形式・材質強度区分':'製品品番・全長'],['basis','設計基準・荷重区分'],['source','許容耐力の根拠資料']])if(typeof a[k]!=='string'||!a[k].trim())missing.push(label);
 if(!['cracked','uncracked'].includes(a.crack))missing.push('ひび割れ条件');
 if(!['long','short','seismic'].includes(a.duration))missing.push('荷重区分');
 }
 if(!a.product?.trim())missing.push('製品名');if(!(a.nt>0&&a.vt>0))missing.push('許容耐力');if(!a.confirmed)missing.push('条件確認');return missing;}
export function anchorCapacityReady(a){return anchorMissing(a).length===0;}
