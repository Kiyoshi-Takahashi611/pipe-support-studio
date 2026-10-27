import {createClient,storageKey} from './auth-client.mjs';
const screen=document.querySelector('#access-screen'),app=document.querySelector('#app'),bar=document.querySelector('#account-bar');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='support-studio-session';
let client,session,challenge,username='',mode='login',loaded=false,checking=false,actorKey='',generation=0;
function lock(){app.hidden=true;bar.hidden=true;screen.hidden=false;document.body.classList.add('access-locked');}
function form(message=''){
  lock();
  screen.innerHTML=`<div class="login-card"><span class="eyebrow">MEBITEQ / SUPPORT STUDIO</span><h1>配管サポート構造計算</h1><p>${mode==='new'?'初回ログイン：新しいパスワードを設定してください。':mode==='reset'?'メールの確認コードと新しいパスワードを入力してください。':mode==='forgot'?'登録されたメールアドレスに確認コードを送ります。':'運営管理ポータルで登録されたアカウントでログインしてください。'}</p><form>${mode==='new'?'':`<label>メールアドレス<input name="email" type="email" autocomplete="username" required value="${esc(username)}"></label>`}${mode==='reset'?'<label>確認コード<input name="code" inputmode="numeric" autocomplete="one-time-code" required></label>':''}${mode==='forgot'?'':`<label>${mode==='login'?'パスワード':'新しいパスワード'}<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" required ${mode==='login'?'':'minlength="8"'}></label>`}${mode==='new'||mode==='reset'?'<label>新しいパスワード（確認）<input name="confirm" type="password" autocomplete="new-password" required minlength="8"></label><small>8文字以上・英大文字・英小文字・数字を含めてください。</small>':''}<p class="login-error" role="alert">${esc(message)}</p><button class="primary" type="submit">${mode==='forgot'?'確認コードを送る':mode==='new'||mode==='reset'?'パスワードを設定':'ログイン'}</button></form><div class="links"><button type="button" id="switch-mode">${mode==='login'?'パスワードを忘れた場合':'ログインへ戻る'}</button></div><p><small>ほかのMTQアプリとは別のパスワードです。利用者の追加・利用停止は運営管理ポータルで行います。</small></p></div>`;
  screen.querySelector('#switch-mode').onclick=()=>{username=screen.querySelector('[name=email]')?.value||username;mode=mode==='login'?'forgot':'login';challenge=null;form();};
  screen.querySelector('form').onsubmit=submit;
}
function errorText(e){return ({NotAuthorizedException:'メールアドレスまたはパスワードを確認してください。',UserNotFoundException:'メールアドレスまたはパスワードを確認してください。',InvalidPasswordException:'パスワードは8文字以上・英大文字・英小文字・数字を含めてください。',CodeMismatchException:'確認コードが一致しません。',ExpiredCodeException:'確認コードの期限が切れています。再送してください。',TooManyRequestsException:'操作が集中しています。少し待ってから再度お試しください。',LimitExceededException:'操作が集中しています。少し待ってから再度お試しください。'})[e.code]|| (e.status?e.message:'通信または認証に失敗しました。時間をおいて再度お試しください。');}
function keep(result){if(!result?.IdToken||!result?.AccessToken)throw Error('Invalid authentication response');session={...result,RefreshToken:result.RefreshToken||session?.RefreshToken,expires:Date.now()+(result.ExpiresIn||3600)*1000};sessionStorage.setItem(KEY,JSON.stringify(session));}
async function submit(event){
  event.preventDefault();const fields=new FormData(event.target);username=String(fields.get('email')||username).trim().toLowerCase();
  const password=String(fields.get('password')||'');
  if((mode==='new'||mode==='reset') && password!==fields.get('confirm')){screen.querySelector('[role=alert]').textContent='確認用のパスワードが一致しません。';return;}
  const button=event.target.querySelector('[type=submit]');button.disabled=true;
  try{
    if(mode==='forgot'){await client.forgot(username);mode='reset';form();return;}
    if(mode==='reset'){await client.reset(username,fields.get('code'),password);mode='login';form('パスワードを更新しました。ログインしてください。');return;}
    const result=mode==='new'?await client.password(challenge.username,password,challenge.session):await client.login(username,password);
    if(result.ChallengeName==='NEW_PASSWORD_REQUIRED'){challenge={session:result.Session,username:result.ChallengeParameters?.USER_ID_FOR_SRP||username};mode='new';form();return;}
    if(result.ChallengeName)throw Error('Unsupported challenge');
    keep(result.AuthenticationResult);mode='login';challenge=null;await check();
  }catch(e){screen.querySelector('[role=alert]').textContent=errorText(e);}
  finally{button.disabled=false;}
}
function denied(message){lock();screen.innerHTML=`<div class="login-card"><span class="eyebrow">SUPPORT STUDIO</span><h1>利用状況の確認</h1><p role="alert">${esc(message)}</p><p>入力中の内容はこの画面を閉じるまでは保持します。</p><div class="links"><button id="retry">再確認</button><button id="logout">ログアウト</button></div></div>`;screen.querySelector('#retry').onclick=check;screen.querySelector('#logout').onclick=logout;}
async function logout(){generation++;lock();const refresh=session?.RefreshToken;session=null;sessionStorage.removeItem(KEY);if(refresh){try{await client.revoke(refresh);}catch{}}location.reload();}
async function check(){
  if(checking)return;checking=true;const run=generation;
  try{
    if(!session?.IdToken){form();return;}
    if(session.expires<Date.now()+60000){if(!session.RefreshToken)throw Object.assign(Error('ログインし直してください。'),{status:401});keep((await client.refresh(session.RefreshToken)).AuthenticationResult);}
    const actor=await client.me(session.IdToken);if(run!==generation)return;
    const nextKey=storageKey(actor);
    if(loaded&&nextKey!==actorKey){location.reload();return;}
    actorKey=nextKey;globalThis.supportStudioStorageKey=actorKey;
    if(!loaded){await import('./app.mjs');loaded=true;}
    if(run!==generation)return;
    screen.hidden=true;app.hidden=false;bar.hidden=false;document.body.classList.remove('access-locked');
    bar.innerHTML=`<span>${esc(actor.name||actor.email)} / 会社 ${esc(actor.companyId)}</span><button id="session-logout">ログアウト</button>`;
    bar.querySelector('button').onclick=logout;
  }catch(e){if(run!==generation)return;if(e.status===401||e.code==='NotAuthorizedException'){sessionStorage.removeItem(KEY);session=null;}
    denied(errorText(e));
  }finally{checking=false;}
}
lock();screen.innerHTML='<div class="login-card"><h1>ログイン情報を確認しています</h1></div>';
try{
  const response=await fetch('./auth-config.json',{cache:'no-store'});if(!response.ok)throw Error();
  const config=await response.json();if(!config.clientId||!config.apiUrl||!config.region)throw Error();client=createClient(config);
  try{session=JSON.parse(sessionStorage.getItem(KEY));}catch{session=null;}
  await check();setInterval(()=>{if(session)check();},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session){lock();check();}});
}catch{screen.innerHTML='<div class="login-card"><h1>接続設定を読み込めません</h1><p>時間をおいてページを開き直してください。</p></div>';}
