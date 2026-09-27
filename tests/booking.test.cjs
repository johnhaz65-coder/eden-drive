const {test,before,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');const {validate,createService,legalReady,amounts,paymentMatches,publicBooking}=require('../server/domain.cjs');const {passwordHash,passwordOK}=require('../server/security.cjs');const {pdf}=require('../server/documents.cjs');
let engine,db,service;const profile={legalName:'Entreprise de test EI',address:'Adresse fictive',siret:'00000000000000',phone:'+33000000000',email:'test@example.invalid',driverName:'Chauffeur test',driverCard:'TEST',vehicle:'Tesla Model 3',plate:'TEST',vatMode:'exempt'};
let day=10;const input=()=>({name:'Client Test',email:'client@example.invalid',phone:'+33000000000',pickup:'Aéroport Marseille-Provence',dropoff:'Centre de Marseille',pickupAt:new Date(Date.now()+(day++)*86400000).toISOString(),service:'airport',passengers:2,bags:1,billingAddress:'Adresse fictive',consent:true,amount:1,paid:true,status:'confirmed'});
before(async()=>{engine=new PGlite();await engine.exec(fs.readFileSync('server/schema.sql','utf8'));db={query:(...a)=>engine.query(...a),transaction:fn=>engine.transaction(c=>fn({query:(sql,args)=>sql.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):c.query(sql,args)}))};service=createService(db);});after(()=>engine.close());
test('Public requests cannot set prices, payment or confirmation',async()=>{const b=await service.create(input());const saved=await service.get(b.id,b.token);assert.equal(saved.amount,null);assert.equal(saved.paid,false);assert.equal(saved.status,'requested');assert.equal(saved.data.paid,undefined);assert.equal(publicBooking(saved).token_hash,undefined);await assert.rejects(()=>service.get(b.id,'wrong'),/introuvable/);});
test('Invalid dates, passenger counts and missing consent are rejected',()=>{assert.throws(()=>validate({...input(),pickupAt:new Date(0).toISOString()}));assert.throws(()=>validate({...input(),pickupAt:'2026-12-01T12:00'}));assert.throws(()=>validate({...input(),passengers:5}));assert.throws(()=>validate({...input(),consent:false}));});
test('Password hash validates only the correct password',()=>{const h=passwordHash('long-test-password-123');assert(passwordOK('long-test-password-123',h));assert(!passwordOK('wrong',h));assert(!passwordOK('anything',''));});
test('Company identity and VAT are required before confirmation',async()=>{assert(!legalReady({}));assert(legalReady(profile));const b=await service.create(input());await assert.rejects(()=>service.change(b.id,'confirm',{amount:5500},{}),/entreprise/);});
test('Booking lifecycle, immutable sequential invoices and PDF generation',async()=>{const b=await service.create(input());await assert.rejects(()=>service.change(b.id,'invoice',{},profile),/après/);let confirmed=await service.change(b.id,'confirm',{amount:5500},profile);assert.equal(confirmed.amount,5500);await assert.rejects(()=>service.change(b.id,'complete',{},profile),/avant/);const voucher=await pdf(confirmed,'voucher',profile);assert.equal(voucher.subarray(0,4).toString(),'%PDF');await service.change(b.id,'paid',{method:'cash'},profile);await assert.rejects(()=>service.change(b.id,'cancel',{},profile),/manuel/);confirmed.data.pickupAt=new Date(Date.now()-3600000).toISOString();await db.query('UPDATE eden_bookings SET data=$2 WHERE id=$1',[b.id,JSON.stringify(confirmed.data)]);await service.change(b.id,'complete',{},profile);const inv=await service.change(b.id,'invoice',{},profile);assert.equal(inv.invoice_no,'ED-F-000001');const again=await service.change(b.id,'invoice',{},profile);assert.equal(again.invoice_no,inv.invoice_no);assert.deepEqual(again.invoice_snapshot,inv.invoice_snapshot);const doc=await pdf(inv,'invoice',profile);fs.writeFileSync('/tmp/edendrive-test-invoice.pdf',doc);assert(doc.length>1000);await assert.rejects(()=>service.change(b.id,'assign',{name:'other'},profile),/clôturée/);});
test('SumUp requires matching status, merchant, amount, currency and reference',()=>{const b={id:'reservation-id',checkout_id:'checkout-id',amount:5500};const c={id:'checkout-id',checkout_reference:'reservation-id',status:'PAID',merchant_code:'MTEST',currency:'EUR',amount:55};assert(paymentMatches(c,b,'MTEST'));for(const patch of [{status:'PENDING'},{amount:1},{merchant_code:'OTHER'},{currency:'USD'},{checkout_reference:'OTHER'}])assert(!paymentMatches({...c,...patch},b,'MTEST'));});
test('VAT rounding remains exact in cents',()=>{assert.deepEqual(amounts(5000,{vatMode:'taxable',vatRate:10}),{ht:4545,ttc:5000,tax:455,rate:10});assert.deepEqual(amounts(5000,profile),{ht:5000,ttc:5000,tax:0,rate:0});});
test('Unconfirmed booking cannot produce a voucher',async()=>{const b=await service.create(input());await assert.rejects(()=>pdf({},'invoice',profile));await assert.rejects(()=>pdf({...b,created_at:new Date().toISOString()},'voucher',profile),/confirmation/);});
test('Verified quote persists through driver review, payment gate and confirmation without repricing',async()=>{
 const data=input();const q={id:require('node:crypto').randomUUID(),amount:6000,distanceMeters:30470,durationSeconds:1860,pricing:{kind:'fixed',label:'Forfait aéroport',baseAmount:5000,nightSurcharge:1000,amount:6000}};
 const b=await service.createQuoted({...data,amount:1},q,'private-test-token');assert.equal(b.amount,6000);assert.equal(b.status,'requested');
 const saved=await service.get(b.id,b.token);assert.equal(saved.data.pricing.distanceKm,30.47);assert.equal(saved.data.pricing.nightSurcharge,1000);assert.equal((await service.list()).find(x=>x.id===b.id).amount,6000);
 assert.equal((await service.createQuoted(data,q,b.token)).id,b.id);
 await assert.rejects(()=>require('../server/payment.cjs').checkout(db,saved),/réglée/);
 await assert.rejects(()=>pdf(saved,'voucher',profile),/confirmation/);
 await assert.rejects(()=>service.change(b.id,'confirm',{amount:5180},profile),/prix présenté/);
 const second=await service.createQuoted(data,{...q,id:require('node:crypto').randomUUID()},'second-token');
 const confirmed=await service.change(b.id,'confirm',{},profile);assert.equal(confirmed.status,'confirmed');assert.equal(confirmed.amount,6000);assert.deepEqual(confirmed.data.pricing,saved.data.pricing);
 assert.equal((await service.get(b.id,b.token)).amount,6000);assert((await pdf(confirmed,'voucher',profile)).length>1000);
 await assert.rejects(()=>service.change(second.id,'confirm',{},profile),/chevauche/);
 await assert.rejects(()=>service.createQuoted(data,{...q,id:require('node:crypto').randomUUID()},'third-token'),/créneau/);
 await assert.rejects(()=>service.change(b.id,'confirm',{},profile),/déjà/);
});
test('Choosing cash preserves unpaid status until driver records receipt',async()=>{
 const b=await service.create(input());await service.change(b.id,'confirm',{amount:5500},profile);
 const cash=await service.change(b.id,'cash-preference',{},profile);assert.equal(cash.data.paymentPreference,'cash');assert.equal(cash.paid,false);assert.equal(cash.status,'confirmed');
 const paid=await service.change(b.id,'paid',{method:'cash'},profile);assert.equal(paid.paid,true);assert.equal(paid.payment_method,'cash');await assert.rejects(()=>service.change(b.id,'cash-preference',{},profile));
});
test('Billing address is optional to book and collected only when issuing invoice',async()=>{
 const b=await service.create({...input(),billingAddress:''});await service.change(b.id,'confirm',{amount:3000},profile);
 const saved=await service.get(b.id,b.token);saved.data.pickupAt=new Date(Date.now()-3600000).toISOString();await db.query('UPDATE eden_bookings SET data=$2 WHERE id=$1',[b.id,JSON.stringify(saved.data)]);await service.change(b.id,'complete',{},profile);
 await assert.rejects(()=>service.change(b.id,'invoice',{},profile),/adresse/);
 const inv=await service.change(b.id,'invoice',{billingAddress:'Adresse client fictive, Marseille'},profile);assert.equal(inv.invoice_snapshot.booking.data.billingAddress,'Adresse client fictive, Marseille');
});

test('Missing quote can be calculated once, confirmed and followed from either private link',async()=>{
 const b=await service.create(input());const q={amount:6000,distanceMeters:30470,durationSeconds:1860,pricing:{baseAmount:5000,nightSurcharge:1000,kind:'fixed'}};
 const priced=await service.saveEstimate(b.id,q);assert.equal(priced.amount,6000);assert.equal(priced.status,'requested');assert.equal(priced.data.pricing.source,'driver-estimate');
 await assert.rejects(()=>service.saveEstimate(b.id,{...q,amount:7000}),/déjà/);
 const confirmed=await service.change(b.id,'confirm',{},profile);assert.equal(confirmed.amount,6000);assert.equal(confirmed.status,'confirmed');
 const {hash}=require('../server/security.cjs');await db.query("UPDATE eden_bookings SET data=jsonb_set(data,'{confirmationAccessHash}',$2::jsonb) WHERE id=$1",[b.id,JSON.stringify(hash('second-private-token'))]);
 assert.equal((await service.get(b.id,b.token)).id,b.id);const second=await service.get(b.id,'second-private-token');assert.equal(second.id,b.id);assert.equal(publicBooking(second).data.confirmationAccessHash,undefined);await assert.rejects(()=>service.get(b.id,'wrong-token'),/introuvable/);
});
test('Choosing onboard payment accepts cash or terminal card without marking it paid',async()=>{
 const b=await service.create(input());await service.change(b.id,'confirm',{amount:6000},profile);
 const onboard=await service.change(b.id,'onboard-preference',{},profile);assert.equal(onboard.data.paymentPreference,'onboard');assert.equal(onboard.paid,false);
 const paid=await service.change(b.id,'paid',{method:'card'},profile);assert.equal(paid.paid,true);assert.equal(paid.payment_method,'card');
});
