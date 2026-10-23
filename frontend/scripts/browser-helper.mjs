import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const reviewBase = process.env.COLLECTFLOW_REVIEW_URL ?? 'http://localhost:5174';
assert(/^http:\/\/localhost:(5174|5175)$/.test(reviewBase),'Use a dedicated local review origin.');
const guard = await (await fetch(`${reviewBase}/api/v1/__review__/`)).json();
assert.equal(guard.disposable_database, true, 'Browser tests require the disposable review API on port 8011.');
const endpoint = await (await fetch('http://localhost:9223/json/version')).json();
export const socket = new WebSocket(endpoint.webSocketDebuggerUrl);
await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0, session;
const pending=new Map();
export const errors=[];
export const warnings=[];
export const responses=[];
export const requests=[];
let failure;
export async function failNext(path, status=500, method="POST") {
 failure={path,status,method};
 await send('Fetch.enable',{patterns:[{urlPattern:'*/api/v1/*'}]});
}
socket.addEventListener('message',async ({data})=>{
 const event=JSON.parse(data);
 if(event.method!=='Fetch.requestPaused')return;
 const {requestId,request}=event.params;
 if(failure && new URL(request.url).pathname===failure.path && request.method===failure.method) {
  const status=failure.status; failure=null;
  await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({detail:'Controlled review failure'})).toString('base64')});
 }else await send('Fetch.continueRequest',{requestId});
});
export async function api(path, options={}) {
 return evaluate(`(async()=>{
   const path=${JSON.stringify(path)}, options=${JSON.stringify(options)};
   const method=options.method??'GET', headers={Accept:'application/json'};
   if(method!=='GET') {
     await fetch('/api/v1/auth/csrf/',{credentials:'include'});
     const token=document.cookie.split(';').map(value=>value.trim()).find(value=>value.startsWith('csrftoken='))?.slice(10);
     headers['X-CSRFToken']=decodeURIComponent(token??'');headers['Content-Type']='application/json';
   }
   const response=await fetch('/api/v1/'+path,{method,headers,credentials:'include',body:options.body===undefined?undefined:JSON.stringify(options.body)});
   if(!response.ok)throw new Error('Review API request failed: '+response.status+' '+path);
   return response.status===204?null:response.json();
 })()`);
}
export async function key(key,code=key,modifiers=0) {
 const virtualKey={Tab:9,Escape:27,Backspace:8,Enter:13,ArrowLeft:37,ArrowRight:39,Home:36,End:35}[key]??0;
 await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode:virtualKey,nativeVirtualKeyCode:virtualKey});
}

socket.addEventListener('message',({data})=>{const e=JSON.parse(data);if(e.id){const p=pending.get(e.id);pending.delete(e.id);if(e.error)p?.reject(new Error(JSON.stringify(e.error)));else p?.resolve(e.result);}if(e.method==='Runtime.consoleAPICalled'&&e.params.type==='warning')warnings.push(e.params.args.map(a=>a.value).join(' '));if(e.method==='Runtime.exceptionThrown')errors.push(e.params.exceptionDetails);if(e.method==='Network.requestWillBeSent'&&e.params.request.url.includes('/api/'))requests.push({url:e.params.request.url,method:e.params.request.method});if(e.method==='Network.responseReceived'&&e.params.response.url.includes('/api/'))responses.push({url:e.params.response.url,status:e.params.response.status});});
export function send(method,params={},sid=session){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params,...(sid?{sessionId:sid}:{})}));});}
const context=await send('Target.createBrowserContext',{},null);
const target=await send('Target.createTarget',{url:'about:blank',browserContextId:context.browserContextId},null);
session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
export async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value;}
export async function wait(expression){for(let n=0;n<150;n++){if(await evaluate(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,100));}throw new Error(`Timed out: ${expression}; page: ${await evaluate('document.body.innerText')}`);}
export async function go(path){await send('Page.navigate',{url:`${reviewBase}${path}`});await wait('document.readyState === "complete"');await wait('!document.body.innerText.includes("Loading CollectFlow")');}
export async function click(text){await wait(`[...document.querySelectorAll("button,a")].some(e=>!e.disabled&&!e.closest("[inert]")&&e.textContent.trim()===${JSON.stringify(text)})`);await evaluate(`(()=>{const el=[...document.querySelectorAll('button,a')].find(e=>!e.disabled&&!e.closest("[inert]")&&e.textContent.trim()===${JSON.stringify(text)});if(!el)throw Error('Missing control: '+${JSON.stringify(text)});el.focus();el.click()})()`);}
export async function fill(selector,value){await wait(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});return e&&!e.disabled})()`);await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing input: '+${JSON.stringify(selector)});if(el instanceof HTMLSelectElement && el.value===${JSON.stringify(value)})return;const setter=Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement?HTMLSelectElement.prototype:el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));})()`);}
export async function dimensions(width,height=1000){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});await new Promise(resolve=>setTimeout(resolve,250));}
export async function screenshot(path){const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path,Buffer.from(result.data,'base64'));}
export async function close(){await send('Target.closeTarget',{targetId:target.targetId},null);await send('Target.disposeBrowserContext',{browserContextId:context.browserContextId},null);socket.close();}
export {assert};
