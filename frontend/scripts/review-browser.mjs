import { assert, go, evaluate, fill, click, wait, dimensions, screenshot, close, api, send, key, failNext, errors, responses, warnings, requests } from './browser-helper.mjs';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results', { recursive: true });
const run = Date.now();
const email = `review-${run}@example.test`;
const password = 'Review!Strong48';
const check = message => console.log(`PASS ${message}`);
async function body() { return evaluate('document.body.innerText'); }
async function focusText(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  for (const character of text) {
    await send('Input.insertText', { text: character });
    assert.equal(await evaluate('document.activeElement.id'), selector.slice(1));
  }
}
async function chooseInDialog(text) { await wait(`(()=>{const d=document.querySelector('[role="dialog"],dialog');return d && [...d.querySelectorAll('button,a')].some(e=>!e.disabled && e.textContent.trim()===${JSON.stringify(text)})})()`); await evaluate(`(()=>{const e=[...document.querySelector('[role="dialog"],dialog').querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing dialog action');e.focus();e.click()})()`); }
try {
  await dimensions(1440); await go('/register');
  for (const [name, value] of Object.entries({ businessName: 'Disposable review business', businessPhone: '+96171123456', firstName: 'Review', lastName: 'Manager', email, password, confirmPassword: password })) await fill(`[name="${name}"]`, value);
  await click('Create account'); await wait('location.pathname === "/login"');
  assert.equal(await evaluate('document.querySelector("[name=email]").value'),email);
  assert.equal(await evaluate(`fetch('/api/v1/auth/me/').then(r=>r.status)`), 403);
  await go('/dashboard'); await wait('location.pathname === "/login"');
  await fill('[name="email"]', email); await fill('[name="password"]', password); await click('Sign in');
  await wait('document.body.innerText.includes("Collection overview")'); check('registration, no automatic session, login, protected dashboard');
  const today = (await api('dashboard/')).period.today_in_beirut;
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0,10);
  await go('/customers/new'); await wait('document.querySelector("#customer-name")');
  await fill('#customer-name', 'Review Customer with a longer company name'); await fill('#customer-phone', '71123456'); await fill('#customer-follow-up', today); await fill('#customer-notes', 'Review notes: preserve financial history.');
  await click('Add customer'); await wait('location.pathname === "/customers"'); await wait('document.querySelector(".customer-row")');
  const customer = (await api('customers/')).results[0];
  await go(`/customers/${customer.id}/edit`); await wait('document.querySelector("#customer-name")?.value.includes("Review")'); await fill('#customer-email', 'customer@example.test'); await click('Save changes'); await wait('location.pathname === "/customers"');
  await fill('[aria-label="Search customers"]', 'unmatched'); assert((await body()).includes('No customers')); await fill('[aria-label="Search customers"]', 'Review'); check('customer create, edit and search');
  await go('/receivables/new'); await wait('document.querySelector("#receivable-customer")?.options.length > 1'); await fill('#receivable-customer', String(customer.id)); await fill('#receivable-amount', '100'); await fill('#receivable-issue-date', ''); await fill('#receivable-date', yesterday); await fill('#receivable-reference', 'REVIEW-100');
  await click('Save receivable'); await wait('location.pathname === "/receivables"');
  const rec = (await api('receivables/')).results[0]; assert.equal(rec.original_amount, '100.00'); assert.equal(rec.issue_date, null);
  await go(`/receivables/${rec.id}/edit`); await wait('document.querySelector("#receivable-reference")?.value === "REVIEW-100"'); await fill('#receivable-reference', ''); await click('Save changes'); await wait('location.pathname === "/receivables"'); assert.equal((await api(`receivables/${rec.id}/`)).reference, null); check('receivable optional fields, edit and reference clearing');
  await go('/promises/new'); await wait('document.querySelector("#promise-receivable")?.options.length > 1'); await fill('#promise-receivable', String(rec.id)); await fill('#promise-amount','100'); await fill('#promise-date', yesterday); await click('Save promise'); await wait('location.pathname === "/promises"');
  const firstPromise = (await api('promises/')).results[0]; assert.equal(firstPromise.status,'BROKEN');
  async function record(promise, amount, method) {
    await go(`/payments/new?customer=${customer.id}&promise=${promise}`); await wait(`document.querySelector('#payment-promise')?.value === '${promise}'`); await fill('#payment-amount',amount); await fill('#payment-method',method); await click('Save payment'); await wait('location.pathname === "/payments"'); await wait('!document.body.innerText.includes("Loading payments...")');
  }
  await record(firstPromise.id,'40','CASH'); assert.equal((await api(`receivables/${rec.id}/`)).remaining_amount,'60.00'); check('broken promise and partial cash payment through UI/API/database');
  await go('/promises'); await click('View details'); await chooseInDialog('Cancel promise'); await wait('document.querySelector("#cancel-reason")');
  assert.equal(await evaluate('document.activeElement.id'),'cancel-reason');
  await key('Escape'); await wait('!document.querySelector("#cancel-reason")'); await chooseInDialog('Close'); await wait('!document.querySelector("[role=dialog]")');
  assert.equal(await evaluate('document.activeElement.textContent.trim()'),'View details');
  await click('View details'); await chooseInDialog('Cancel promise'); await wait('document.querySelector("#cancel-reason")');
  const sentence='Customer requested a different installment date.'; await focusText('#cancel-reason',sentence);
  await key('Backspace'); assert.equal(await evaluate('document.querySelector("#cancel-reason").value'),sentence.slice(0,-1)); await send('Input.insertText',{text:'.'});
  await evaluate('document.querySelector("#cancel-reason").setSelectionRange(9,9)'); await send('Input.insertText',{text:'has '});
  assert.equal(await evaluate('document.querySelector("#cancel-reason").selectionStart'),13);
  const reason=await evaluate('document.querySelector("#cancel-reason").value'); assert(reason.includes('Customer has requested'));
  await key('Tab'); assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Back'); await key('Tab'); assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Cancel promise'); await key('Tab'); assert.equal(await evaluate('document.activeElement.id'),'cancel-reason'); await key('Tab','Tab',8); assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Cancel promise'); await key('Tab');
  await chooseInDialog('Back'); await wait('!document.querySelector("#cancel-reason")'); await chooseInDialog('Cancel promise'); await wait('document.querySelector("#cancel-reason")'); await fill('#cancel-reason',reason); await chooseInDialog('Cancel promise'); await wait('!document.querySelector("[role=dialog]")');
  assert.equal((await api(`promises/${firstPromise.id}/`)).cancel_reason,reason); assert.equal((await api(`receivables/${rec.id}/`)).paid_amount,'40.00'); check('cancel reason full sentence, spaces, Backspace, middle edit/cursor, Tab wrapping, Back, submit, retained payments');
  const nextPromise=await api('promises/',{method:'POST',body:{receivable:rec.id,amount:'60.00',promised_on:today}});
  await record(nextPromise.id,'60','WHISH'); assert.equal((await api(`promises/${nextPromise.id}/`)).status,'KEPT');
  await click('View'); await chooseInDialog('Void payment'); await focusText('#void-reason','Payment was recorded with the wrong method.'); await chooseInDialog('Cancel'); await chooseInDialog('Close');
  assert.equal((await api('payments/')).results.filter(p=>p.is_voided).length,0);
  await click('View'); await chooseInDialog('Void payment'); await fill('#void-reason','Record replacement with correct method'); await chooseInDialog('Confirm void'); await wait('!document.querySelector("[role=dialog]")');
  assert.equal((await api(`promises/${nextPromise.id}/`)).status,'PENDING'); await wait('document.body.innerText.includes("Voided payment dated")'); await record(nextPromise.id,'60','CASH');
  const active=(await api('payments/')).results.find(p=>!p.is_voided && p.amount==='60.00');
  await go(`/payments/${active.id}/edit`); await wait('document.querySelector("#payment-amount")?.value === "60"'); await fill('#payment-amount','50'); await click('Save changes'); await wait('location.pathname === "/payments"'); assert.equal((await api(`receivables/${rec.id}/`)).remaining_amount,'10.00');
  await go(`/payments/${active.id}/edit`); await wait('document.querySelector("#payment-amount")?.value === "50"'); await fill('#payment-amount','60'); await click('Save changes'); await wait('location.pathname === "/payments"');
  const temporaryRec = await api('receivables/',{method:'POST',body:{customer:customer.id,original_amount:'100.00',due_date:today}});
  const temporaryPromise = await api('promises/',{method:'POST',body:{receivable:temporaryRec.id,amount:'100.00',promised_on:today}});
  await go(`/payments/${active.id}/edit`); await wait(`document.querySelector('#payment-promise')?.value==='${nextPromise.id}'`); await fill('#payment-promise',String(temporaryPromise.id)); await click('Save changes'); await wait('location.pathname === "/payments"'); assert.equal((await api(`receivables/${rec.id}/`)).remaining_amount,'60.00'); assert.equal((await api(`receivables/${temporaryRec.id}/`)).remaining_amount,'40.00');
  await go(`/payments/${active.id}/edit`); await wait(`document.querySelector('#payment-promise')?.value==='${temporaryPromise.id}'`); await fill('#payment-promise',String(nextPromise.id)); await click('Save changes'); await wait('location.pathname === "/payments"'); assert.equal((await api(`receivables/${rec.id}/`)).remaining_amount,'0.00');
  await api(`promises/${temporaryPromise.id}/cancel/`,{method:'POST',body:{cancel_reason:'Finish isolated move check'}});
  await api(`receivables/${temporaryRec.id}/`,{method:'PATCH',body:{original_amount:'40.00'}});
  // Keep the second receivable active: cancelling does not erase its unpaid balance.
  check('payment reallocation through UI validates and recalculates both receivables');
  const summary=await api('dashboard/?period=today'); assert.equal(summary.metrics.total_collected,'100.00'); assert.equal(summary.metrics.total_outstanding,'40.00'); check('completion, void cancellation, permanent void, replacement, active payment edits and dashboard reconciliation');
  await go('/follow-ups/new'); await wait('document.querySelector("#followup-customer")?.options.length > 1'); await fill('#followup-customer',String(customer.id)); await fill('#followup-receivable',String(rec.id)); await fill('#followup-notes','Call to confirm receipt of the installment.'); await fill('#followup-next-date',today); await fill('#followup-promise',String(nextPromise.id)); await click('Record follow-up'); await wait('location.pathname === "/follow-ups"');
  const followup=(await api('followups/')).results[0]; assert.equal((await api(`customers/${customer.id}/`)).next_follow_up_on,today); assert.equal(followup.payment_promise,nextPromise.id); await click('Mark completed'); await wait('document.querySelector(".follow-up-row .record-status")?.textContent === "Completed"'); assert((await api(`followups/${followup.id}/`)).completed_at);
  await go(`/follow-ups/${followup.id}/edit`); await wait('document.querySelector("#followup-notes")?.value.includes("Call")'); await fill('#followup-notes','Customer confirmed the payment was received.'); await fill('#followup-receivable',''); await evaluate(`document.querySelector('.follow-up-clear-schedule input').click()`); await click('Save changes'); await wait('location.pathname === "/follow-ups"'); assert.equal((await api(`followups/${followup.id}/`)).receivable,null); assert.equal((await api(`customers/${customer.id}/`)).next_follow_up_on,null);
  await click('Delete follow-up'); await chooseInDialog('Cancel'); assert.equal((await api('followups/')).count,1);
  for(const status of [500,403]) {await click('Delete follow-up'); await failNext(`/api/v1/followups/${followup.id}/archive/`,status); const before=requests.filter(r=>r.method==='POST'&&r.url.includes(`/followups/${followup.id}/archive/`)).length; await chooseInDialog('Delete follow-up'); await evaluate(`document.querySelector('[role=dialog] button[type=submit]').click()`); await wait('document.querySelector("[role=dialog] [role=alert]")'); await wait('!document.querySelector("[role=dialog] button[type=submit]")?.disabled'); for(let attempt=0;attempt<100 && requests.filter(r=>r.method==='POST'&&r.url.includes(`/followups/${followup.id}/archive/`)).length<before+1;attempt++) await new Promise(resolve=>setTimeout(resolve,50)); assert.equal(requests.filter(r=>r.method==='POST'&&r.url.includes(`/followups/${followup.id}/archive/`)).length,before+1); assert.equal((await api('followups/')).count,1); await chooseInDialog('Cancel');}
  await click('Delete follow-up'); await chooseInDialog('Delete follow-up'); await wait('!document.querySelector("[role=dialog]")'); assert.equal((await api('followups/')).count,0); check('follow-up record, complete, edit/unlink, cancel deletion, 500/403 retry states and confirmed retained removal');
  await go('/staff'); await click('+ Add staff'); await wait('document.querySelector("dialog[open]")');
  assert(await evaluate(`(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<2 && r.top>=15})()`)); await screenshot('test-results/staff-dialog-1440.png'); await dimensions(390,667); assert(await evaluate(`(()=>{const r=document.querySelector('dialog').getBoundingClientRect();return Math.abs((r.left+r.right)/2-innerWidth/2)<2 && r.top>=15})()`)); await screenshot('test-results/staff-dialog-390.png'); assert((await evaluate('document.documentElement.scrollWidth'))<=390); await dimensions(1440);
  await evaluate(`document.querySelector('dialog button[type="submit"]').focus()`); await key('Tab'); assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Close dialog'); await key('Tab','Tab',8); assert.equal(await evaluate('document.activeElement.textContent.trim()'),'Add staff'); await key('Escape'); await wait('!document.querySelector("dialog[open]")'); assert.equal(await evaluate('document.body.style.overflow'),''); await click('+ Add staff'); await wait('document.querySelector("dialog[open]")');
  await focusText('#full_name','Review Staff'); await fill('dialog [name="email"]',`staff-${run}@example.test`); await fill('dialog [name="password"]','password'); await chooseInDialog('Add staff'); await wait('document.querySelector("dialog [role=alert]")');
  await fill('dialog [name="password"]','Staff!Strong48'); await chooseInDialog('Add staff'); await wait('!document.querySelector("dialog[open]")');
  await click('Edit'); await wait('document.querySelector("dialog [name=full_name]")'); await fill('dialog [name="full_name"]','Review Staff Updated'); await chooseInDialog('Save changes'); await wait('!document.querySelector("dialog[open]")');
  await click('Deactivate'); await chooseInDialog('Deactivate'); await wait('!document.querySelector("dialog[open]")'); await click('Reactivate'); await chooseInDialog('Reactivate'); await wait('!document.querySelector("dialog[open]")');
  await click('Reset password'); await wait('document.querySelector("dialog [name=new_password]")'); await fill('dialog [name="new_password"]','Staff!Reset92'); await fill('dialog [name="confirm_password"]','Staff!Reset92'); await chooseInDialog('Reset password'); await wait('!document.querySelector("dialog[open]")'); check('staff validation, create, edit, deactivate/reactivate and password reset');
  await go('/settings/business'); await fill('[name="phone_e164"]','invalid'); await click('Save changes'); await wait('document.querySelector("[aria-invalid=true]")'); await fill('[name="phone_e164"]','stillinvalid'); await click('Save changes'); await wait('document.querySelector("[aria-invalid=true]")'); await fill('[name="phone_e164"]','+96171123456'); await click('Save changes'); await wait('document.querySelector(".workspace-success")'); check('business repeated validation and successful save');
  await go(`/customers/${customer.id}`); await wait('document.body.innerText.includes("Customer history") && !document.body.innerText.includes("Loading history")'); assert((await body()).includes('Void reason:')); assert.equal(await evaluate(`document.querySelector('a[href*="wa.me"]').getAttribute('target')`),'_blank');
  await go('/dashboard'); await fill('[name="period"]','custom'); await fill('[name="from"]',today); await fill('[name="to"]',today); await click('Apply'); await wait('location.search.includes("period=custom")'); assert((await body()).includes('$100.00')); check('customer history, WhatsApp launch link and custom dashboard period');
  await api('followups/',{method:'POST',body:{customer:customer.id,receivable:rec.id,note:'A detailed customer contact note that wraps across mobile cards. '.repeat(5)+'LongReference'+ 'x'.repeat(90)}});
  const completedContact=await api('followups/',{method:'POST',body:{customer:customer.id,note:'Completed contact retained in history.'}}); await api(`followups/${completedContact.id}/complete/`,{method:'POST',body:{}});
  await go('/promises'); await wait('document.querySelector("select[name=status]")');
  assert.deepEqual(await evaluate(`[...document.querySelector('select[name=status]').options].map(o=>o.textContent)`),['All promises','Pending','Broken','Completed','Cancelled']);
  for(const [value,count] of [['pending',0],['broken',0],['kept',1],['cancelled',2],['all',3]]) {await fill('select[name="status"]',value);await wait(`document.querySelectorAll('.promise-item').length === ${count}`);}
  await fill('[aria-label="Search promises"]','unmatched search'); await wait('document.querySelectorAll(".promise-item").length === 0'); await fill('[aria-label="Search promises"]','');
  await go('/payments'); await wait('!document.body.innerText.includes("Loading payments...") && document.querySelector("select[name=method]")');
  for(const [status,methods] of [['all',[3,2,1]],['completed',[2,2,0]],['voided',[1,0,1]]]) {await fill('select[name="status"]',status);for(const [index,method] of ['All','CASH','WHISH'].entries()) {await fill('select[name="method"]',method);await wait(`document.querySelectorAll('.payment-row').length === ${methods[index]}`);}}
  await go('/receivables'); await wait('document.querySelector("select[name=status]")');for(const [status,count] of [['outstanding',1],['partial',0],['overdue',0],['paid',1],['all',2]]) {await fill('select[name="status"]',status);await wait(`document.querySelectorAll('.receivable-row').length === ${count}`);}
  await go('/customers'); await wait('document.querySelector(".customer-status-filter select")');for(const [status,count] of [['archived',0],['all',1],['active',1]]) {await fill('.customer-status-filter select',status);await wait(`document.querySelectorAll('.customer-row').length === ${count}`);}
  await go('/staff'); await wait('document.querySelector(".workspace-filter select")');for(const [status,count] of [['inactive',0],['active',1],['all',1]]) {await fill('.workspace-filter select',status);await wait(`document.querySelectorAll('.workspace-staff-row').length === ${count}`);} await fill('.workspace-search input','unmatched');await wait('document.querySelectorAll(".workspace-staff-row").length === 0');await fill('.workspace-search input','');
  await go('/follow-ups'); await fill('[aria-label="Search follow-ups"]','Completed contact');await wait('document.querySelectorAll(".follow-up-row").length === 1');await fill('[aria-label="Search follow-ups"]','unmatched');await wait('document.querySelectorAll(".follow-up-row").length === 0');await fill('[aria-label="Search follow-ups"]','');
  await go('/dashboard');for(const period of ['today','this_week','this_month']) {await fill('[name="period"]',period);await click('Apply');await wait(`location.search.includes('period=${period}')`);assert((await body()).includes('$100.00'));}
  check('all remaining status/method filters, meaningful empty options, collection searches and dashboard presets');
  const routes=['/','/dashboard','/customers',`/customers/${customer.id}`,`/customers/${customer.id}/edit`,'/customers/new','/receivables',`/receivables/${rec.id}/edit`,'/receivables/new','/promises',`/promises/${nextPromise.id}/edit`,'/promises/new','/payments',`/payments/${active.id}/edit`,'/payments/new','/follow-ups','/follow-ups/new',`/follow-ups/${completedContact.id}/edit`,'/staff','/settings/profile','/settings/business','/login','/register','/missing-page'];
  await failNext('/api/v1/receivables/',503,'GET'); await go('/receivables'); await wait('document.body.innerText.includes("The workspace is unavailable")'); await click('Try again'); await wait('document.querySelector(".receivables-panel")'); check('unavailable route state and recovery');
  await dimensions(390); await go('/customers'); await evaluate(`document.querySelector('[aria-label="Open menu"]').focus();document.querySelector('[aria-label="Open menu"]').click()`); await wait('document.activeElement.closest("aside")'); await key('Escape'); await wait('!document.querySelector(".app-sidebar-open")'); assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Open menu'); check('mobile navigation initial focus, Escape and focus return');
  const overflow=[];
  for(const width of [320,390,768,1440,1920]) {
    await dimensions(width);
    for(const route of routes) {
      await go(route); await new Promise(resolve=>setTimeout(resolve,120));
      const size=await evaluate('({viewport:innerWidth,document:document.documentElement.scrollWidth})'); if(size.document>size.viewport+1)overflow.push({route,width,...size});
      if([390,1440].includes(width) && ['/dashboard','/customers','/promises','/follow-ups','/staff','/login'].includes(route)) await screenshot(`test-results/${route.slice(1)}-${width}.png`);
    }
  }
  assert.deepEqual(overflow,[]); check(`${routes.length} routes at five viewport widths (320 to 1920), no page-level horizontal overflow`);
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(!warnings.some(message=>message.includes('HydrateFallback')),JSON.stringify(warnings));
  await go('/receivables'); await wait('document.querySelector(".receivable-row")');
  await evaluate(`(()=>{const row=[...document.querySelectorAll('.receivable-row')].find(row=>row.querySelector('.record-status')?.textContent==='Paid');const button=row.querySelector('button');button.focus();button.click();})()`);
  await wait('document.querySelector("[role=dialog]")'); assert(!(await body()).includes('Invalid Date')); await chooseInDialog('Archive receivable'); await chooseInDialog('Cancel'); await chooseInDialog('Archive receivable'); await chooseInDialog('Archive receivable'); await wait('!document.querySelector("[role=dialog]")');
  await fill('select[name="archive"]','archived'); await wait('location.search.includes("archive=archived")'); await dimensions(320); await wait('document.querySelector(".receivable-row")'); assert(await evaluate(`document.querySelector('.record-row-actions').getBoundingClientRect().right <= document.querySelector('.receivables-panel').getBoundingClientRect().right`)); await click('Restore'); await wait('!document.querySelector(".receivable-row")'); await dimensions(1440); assert.equal((await api(`receivables/${rec.id}/`)).archived_at,null);
  await go('/customers/new'); await fill('#customer-name','Archive review customer'); await fill('#customer-phone','71123457'); await click('Add customer'); await wait('location.pathname === "/customers"');
  const emptyCustomer=(await api('customers/?search=Archive%20review')).results[0]; await go(`/customers/${emptyCustomer.id}`); await click('Archive customer'); await chooseInDialog('Archive customer'); await wait('location.pathname === "/customers"'); await fill('.customer-status-filter select','archived'); await wait('location.search.includes("status=archived")'); await dimensions(320); await wait('document.querySelector(".customer-row")'); assert(await evaluate(`document.querySelector('.customer-row button').getBoundingClientRect().right <= document.querySelector('.customers-panel').getBoundingClientRect().right`)); await click('Restore'); await wait('!document.querySelector(".customer-row")'); await dimensions(1440); assert.equal((await api(`customers/${emptyCustomer.id}/`)).archived_at,null); check('customer and paid receivable archive, confirmation cancellation, archive filters and restoration');
  await dimensions(1440); await go('/settings/profile'); await fill('[name="old_password"]',password); await fill('[name="new_password"]','Review!Changed92'); await fill('[name="confirm_password"]','Review!Changed92'); await click('Change password'); await wait('document.querySelector(".workspace-success")');
  await click('Sign out'); await wait('location.pathname === "/login" || location.pathname === "/"'); await go('/login'); await fill('[name="email"]',`staff-${run}@example.test`); await fill('[name="password"]','Staff!Reset92'); await click('Sign in'); await wait('document.body.innerText.includes("Collection overview")');
  assert(!await evaluate(`[...document.querySelectorAll('.app-sidebar a')].some(a=>a.getAttribute('href')==='/staff')`));
  await go('/staff'); await wait('document.body.innerText.includes("You cannot open this page")'); check('password change retains session, logout, staff login and forbidden manager route');
  console.log('Real API browser review passed. Test records exist only in the disposable RAM database.');
} catch(error) { console.log("API failures:", responses.filter(response=>response.status>=400)); throw error; } finally { await close(); }
