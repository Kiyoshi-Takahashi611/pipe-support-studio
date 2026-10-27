export function validActor(actor) {
  return actor?.appId === 'pipesupport' && typeof actor.companyId === 'string' && !!actor.companyId
    && typeof actor.userId === 'string' && !!actor.userId && typeof actor.email === 'string' && !!actor.email;
}
export function storageKey(actor) {
  if (!validActor(actor)) throw Error('利用権限を確認できません');
  return `support-studio-v1:${encodeURIComponent(actor.companyId)}:${encodeURIComponent(actor.userId)}`;
}
export function createClient(config, fetcher = fetch) {
  async function cognito(action, body) {
    const response = await fetcher(`https://cognito-idp.${config.region}.amazonaws.com/`, {
      method:'POST', headers:{'Content-Type':'application/x-amz-json-1.1',
        'X-Amz-Target':`AWSCognitoIdentityProviderService.${action}`}, body:JSON.stringify(body),
      signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) {const e = Error(data.message || 'ログインできませんでした'); e.code = data.__type?.split('#').pop(); throw e;}
    return data;
  }
  return {
    login:(email,password) => cognito('InitiateAuth',{ClientId:config.clientId,AuthFlow:'USER_PASSWORD_AUTH',AuthParameters:{USERNAME:email,PASSWORD:password}}),
    password:(username,password,session) => cognito('RespondToAuthChallenge',{ClientId:config.clientId,ChallengeName:'NEW_PASSWORD_REQUIRED',Session:session,ChallengeResponses:{USERNAME:username,NEW_PASSWORD:password}}),
    forgot:email => cognito('ForgotPassword',{ClientId:config.clientId,Username:email}),
    reset:(email,code,password) => cognito('ConfirmForgotPassword',{ClientId:config.clientId,Username:email,ConfirmationCode:code,Password:password}),
    refresh:token => cognito('InitiateAuth',{ClientId:config.clientId,AuthFlow:'REFRESH_TOKEN_AUTH',AuthParameters:{REFRESH_TOKEN:token}}),
    revoke:token => cognito('RevokeToken',{ClientId:config.clientId,Token:token}),
    async me(token) {
      const response=await fetcher(`${config.apiUrl}/me`,{headers:{Authorization:token},cache:'no-store',signal:AbortSignal.timeout(15000)});
      const actor=await response.json();
      if (!response.ok || !validActor(actor)) {const e=Error(actor.message || '利用権限を確認できません'); e.status=response.status; throw e;}
      return actor;
    },
  };
}
