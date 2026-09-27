const {test}=require('node:test');const assert=require('node:assert/strict');
const notifications=require('../server/notifications.cjs');
test('Existing EmailJS templates receive reservation details and private document link',async()=>{
 delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;process.env.APP_ORIGIN='https://www.edendrive.fr';
 const b={id:'test-id',ref:'ED-TEST',status:'confirmed',amount:5000,paid:false,data:{name:'Test',email:'test@example.invalid',phone:'0000000000',pickupAt:new Date().toISOString(),pickup:'Départ',dropoff:'Arrivée',passengers:1,bags:0}};
 const result=await notifications.send(null,b,{},'private-test-token');assert.equal(result.sent,false);assert.equal(result.provider,'emailjs');assert.equal(result.jobs.length,2);assert.equal(result.jobs[1].template_id,'template_c2wsbae');assert.match(result.jobs[1].template_params.notes,/#test-id.private-test-token/);assert.equal(result.jobs[1].template_params.prix,'50.00 €');
 const invoice=await notifications.send(null,b,{},'private-test-token','invoice');assert.equal(invoice.jobs.length,1);assert.match(invoice.jobs[0].template_params.type_trajet,/Facture/);
});
test('Client email distinguishes a request from confirmation and escapes submitted content',()=>{
 const {emailContent}=require('../server/email-content.cjs');const b={ref:'ED-TEST',status:'requested',amount:6000,data:{name:'<img src=x>',pickupAt:new Date().toISOString(),pickup:'Marseille',dropoff:'Aéroport'}};
 const pending=emailContent(b,'https://www.edendrive.fr/reservation-eden/#test');assert.match(pending.subject,/demande/);assert.match(pending.text,/Rien à payer/);assert(!pending.html.includes('<img src=x>'));assert(pending.html.includes('&lt;img src=x&gt;'));
 const confirmed=emailContent({...b,status:'confirmed'},'https://www.edendrive.fr/reservation-eden/#test');assert.match(confirmed.html,/Voir ma réservation et payer/);assert.match(confirmed.text,/espèces ou par carte/);
});
