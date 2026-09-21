const {test}=require('node:test');const assert=require('node:assert/strict');
const notifications=require('../server/notifications.cjs');
test('Existing EmailJS templates receive reservation details and private document link',async()=>{
 delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;process.env.APP_ORIGIN='https://www.edendrive.fr';
 const b={id:'test-id',ref:'ED-TEST',status:'confirmed',amount:5000,paid:false,data:{name:'Test',email:'test@example.invalid',phone:'0000000000',pickupAt:new Date().toISOString(),pickup:'Départ',dropoff:'Arrivée',passengers:1,bags:0}};
 const result=await notifications.send(null,b,{},'private-test-token');assert.equal(result.sent,false);assert.equal(result.provider,'emailjs');assert.equal(result.jobs.length,2);assert.equal(result.jobs[1].template_id,'template_c2wsbae');assert.match(result.jobs[1].template_params.notes,/#test-id.private-test-token/);assert.equal(result.jobs[1].template_params.prix,'50.00 €');
 const invoice=await notifications.send(null,b,{},'private-test-token','invoice');assert.equal(invoice.jobs.length,1);assert.match(invoice.jobs[0].template_params.type_trajet,/Facture/);
});
