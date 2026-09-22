const {fail,paymentMatches}=require('./domain.cjs');
async function sumup(path,body,method){if(!process.env.SUMUP_API_KEY||!process.env.SUMUP_MERCHANT_CODE)fail('Paiement en ligne non activé. Contactez votre chauffeur.',503);const r=await fetch('https://api.sumup.com/v0.1/checkouts'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:'Bearer '+process.env.SUMUP_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)});if(!r.ok)fail('Le service de paiement est momentanément indisponible.',502);return r.json();}
async function checkout(db,b){return db.transaction(async c=>{b=(await c.query('SELECT * FROM eden_bookings WHERE id=$1 FOR UPDATE',[b.id])).rows[0];if(b.paid||!['confirmed','completed'].includes(b.status)||!b.amount)fail('Cette course ne peut pas être réglée en ligne.',409);if(b.checkout_url)return b.checkout_url;
 const previous=await sumup('?checkout_reference='+encodeURIComponent(b.id));let check=previous.find(x=>x.checkout_reference===b.id);
 if(!check)check=await sumup('',{checkout_reference:b.id,amount:b.amount/100,currency:'EUR',merchant_code:process.env.SUMUP_MERCHANT_CODE,description:'EdenDrive '+b.ref,hosted_checkout:{enabled:true},return_url:process.env.APP_ORIGIN+'/api/sumup-webhook',redirect_url:process.env.APP_ORIGIN+'/reservation-eden/?retour=paiement'});
 if(check.merchant_code!==process.env.SUMUP_MERCHANT_CODE||check.currency!=='EUR'||Math.round(check.amount*100)!==b.amount)fail('Paiement incohérent : contactez votre chauffeur.',409);
 if(!check.hosted_checkout_url||new URL(check.hosted_checkout_url).origin!=='https://checkout.sumup.com')fail('Lien de paiement indisponible.',502);
 await c.query('UPDATE eden_bookings SET checkout_id=$2,checkout_url=$3 WHERE id=$1',[b.id,check.id,check.hosted_checkout_url]);return check.hosted_checkout_url;});}
async function reconcile(db,b){if(!b.checkout_id)return b;const check=await sumup('/'+encodeURIComponent(b.checkout_id));if(paymentMatches(check,b,process.env.SUMUP_MERCHANT_CODE))await db.query("UPDATE eden_bookings SET paid=true,paid_at=COALESCE(paid_at,now()),payment_method='sumup',updated_at=now() WHERE id=$1",[b.id]);return (await db.query('SELECT * FROM eden_bookings WHERE id=$1',[b.id])).rows[0];}
async function archive(db,b){return db.transaction(async c=>{
 b=(await c.query('SELECT * FROM eden_bookings WHERE id=$1 FOR UPDATE',[b.id])).rows[0];
 if(b.paid||b.invoice_no||b.status==='completed')fail('Une course réglée, facturée ou terminée doit être conservée.',409);
 if(b.checkout_id){
  const path='/'+encodeURIComponent(b.checkout_id);let check=await sumup(path);
  const valid=x=>x.id===b.checkout_id&&x.checkout_reference===b.id&&x.merchant_code===process.env.SUMUP_MERCHANT_CODE&&x.currency==='EUR'&&Math.round(x.amount*100)===b.amount;
  const noPayment=x=>['PENDING','FAILED','EXPIRED'].includes(x.status)&&(x.transactions||[]).every(t=>['FAILED','CANCELLED'].includes(t.status));
  if(!valid(check)||!noPayment(check))fail('Paiement effectué ou en cours : suppression refusée.',409);
  if(check.status!=='EXPIRED')check=await sumup(path,undefined,'DELETE');
  if(!valid(check)||check.status!=='EXPIRED'||!noPayment(check))fail('Le lien de paiement ne peut pas être désactivé.',409);
 }
 await c.query("UPDATE eden_bookings SET status='cancelled',data=jsonb_set(data,'{archived}','true'::jsonb),updated_at=now() WHERE id=$1",[b.id]);
 await c.query('INSERT INTO eden_events(booking_id,action) VALUES($1,$2)',[b.id,'archive']);
 return {ok:true};
});}
module.exports={checkout,reconcile,archive};
