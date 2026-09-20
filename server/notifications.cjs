const {pdf}=require('./documents.cjs');
const configured=()=>!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
async function send(db,b,p,access,type='reservation'){
 if(!configured())return {sent:false,reason:'not_configured'};
 try{return await db.transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['mail:'+b.id]);
 const origin=process.env.APP_ORIGIN,link=access?origin+'/reservation-eden/#'+b.id+'.'+access:origin+'/espace-chauffeur/';
 const when=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(b.data.pickupAt));
 const text=`${b.ref}\n${when}\n${b.data.pickup} → ${b.data.dropoff}\n${b.amount==null?'Tarif à confirmer':(b.amount/100).toFixed(2)+' EUR'}\n${b.data.name} · ${b.data.phone}\n${b.paid?'Paiement reçu':'Paiement non enregistré'}`;
 const items=[{to:b.data.email,key:'client',subject:type==='invoice'?'Votre facture':b.status==='requested'?'Votre demande de trajet':'Votre bon de réservation',body:text+'\n\nSuivi privé, documents et paiement :\n'+link}];
 if(type==='reservation')items.push({to:process.env.NOTIFICATION_EMAIL||p.email,key:'driver',subject:'Nouvelle réservation',body:text+'\n\nEspace chauffeur : '+origin+'/espace-chauffeur/'});
 let success=true;
 for(const item of items){
 const event='email:'+type+':'+(b.status==='requested'?'request:':'confirmed:')+item.key;
 if((await c.query('SELECT 1 FROM eden_events WHERE booking_id=$1 AND action=$2',[b.id,event])).rows.length)continue;
 let attachments;
 if(item.key==='client'&&b.status!=='requested'){
 const file=await pdf(b,type==='invoice'?'invoice':'voucher',p);
 attachments=[{filename:`EdenDrive-${type}-${b.ref}.pdf`,content:file.toString('base64')}];
 }
 try{
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':b.id+'-'+event},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[item.to],subject:item.subject+' EdenDrive — '+b.ref,text:item.body,attachments}),signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('delivery');
 await c.query('INSERT INTO eden_events(booking_id,action) VALUES($1,$2)',[b.id,event]);
 }catch{success=false;}
 }
 return {sent:success,reason:success?undefined:'delivery_failed'};
 });}catch{return {sent:false,reason:'delivery_failed'};}
}
module.exports={send,configured};
