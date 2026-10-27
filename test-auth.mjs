import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,validActor,storageKey} from './web/auth-client.mjs';
const actor={appId:'pipesupport',companyId:'2',userId:'u1',email:'user@example.test'};
test('利用者・会社別の保存先',()=>{
  assert.notEqual(storageKey(actor),storageKey({...actor,userId:'u2'}));
  assert.notEqual(storageKey(actor),storageKey({...actor,companyId:'3'}));
  assert.throws(()=>storageKey({...actor,companyId:''}));
  assert.equal(validActor({...actor,appId:'kouzou'}),false);
});
test('未登録・停止・障害時には入れない',async()=>{
  for(const status of [401,403,503]){
    const client=createClient({apiUrl:'/api'},async()=>new Response(JSON.stringify({message:'denied'}),{status}));
    await assert.rejects(()=>client.me('token'),error=>error.status===status);
  }
  const client=createClient({apiUrl:'/api'},async()=>new Response('{}'));
  await assert.rejects(()=>client.me('token'));
});
test('所属は署名済みトークンでAPIに照会する',async()=>{
  const client=createClient({apiUrl:'/api'},async(url,options)=>{
    assert.equal(url,'/api/me');assert.equal(options.headers.Authorization,'verified-id-token');
    assert.equal(options.cache,'no-store');return new Response(JSON.stringify(actor));
  });
  assert.deepEqual(await client.me('verified-id-token'),actor);
});
test('ログイン・初回パスワード変更・更新・失効の送信先',async()=>{
  const calls=[];
  const client=createClient({region:'ap-northeast-1',clientId:'client'},async(url,options)=>{
    assert.equal(url,'https://cognito-idp.ap-northeast-1.amazonaws.com/');
    calls.push({action:options.headers['X-Amz-Target'].split('.').pop(),body:JSON.parse(options.body)});
    return new Response('{}');
  });
  await client.login('user@example.test','test-password');
  await client.password('user-id','new-password','challenge-session');
  await client.refresh('refresh-token');await client.revoke('refresh-token');
  assert.deepEqual(calls.map(x=>x.action),['InitiateAuth','RespondToAuthChallenge','InitiateAuth','RevokeToken']);
  assert.equal(calls[0].body.AuthFlow,'USER_PASSWORD_AUTH');
  assert.equal(calls[1].body.ChallengeResponses.USERNAME,'user-id');
});
