// AWS版は既存の計算資産にログインを組み合わせる。Sites版のdistは変更しない。
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const args = process.argv.slice(2);
const offline = args.includes('--test');
const stack = offline ? {} : JSON.parse(execFileSync('aws', ['cloudformation', 'describe-stacks',
  '--stack-name', 'pipe-support-studio', '--region', 'ap-northeast-1', '--output', 'json'], {encoding: 'utf8'}));
const out = Object.fromEntries((stack.Stacks?.[0]?.Outputs || []).map(x => [x.OutputKey, x.OutputValue]));
const config = offline ? {region:'ap-northeast-1',clientId:'test-client',apiUrl:'/test-api'} :
  {region:'ap-northeast-1',clientId:out.UserPoolClientId,apiUrl:out.ApiUrl};
if (!config.clientId || !config.apiUrl) throw Error('AWSの接続設定が不足しています');
await mkdir('build/aws-web', {recursive:true});
await cp('dist', 'build/aws-web', {recursive:true});
await cp('web', 'build/aws-web', {recursive:true});
await writeFile('build/aws-web/auth-config.json', JSON.stringify(config));
const html = (await readFile('dist/index.html','utf8')).replace('<div id="app">',
  '<section id="access-screen" aria-live="polite"></section><div id="account-bar" hidden></div><div id="app" hidden>')
  .replace('src="app.mjs"','src="auth.mjs"').replace('</head>', '<link rel="stylesheet" href="auth.css"></head>');
await writeFile('build/aws-web/index.html', html);
// Browser-local saved data is isolated by company and user in the managed app.
const app = (await readFile('dist/app.mjs','utf8')).replaceAll("'support-studio-v1'", 'globalThis.supportStudioStorageKey');
await writeFile('build/aws-web/app.mjs',app);
await writeFile('build/aws-web/version.json', JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}));
console.log('AWS版を build/aws-web に作成しました');
