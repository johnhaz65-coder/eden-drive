const {emailContent}=require('./email-content.cjs');
const {pdf}=require('./documents.cjs');
const resendConfigured=()=>!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
const configured=()=>true;
function browserEmails(b,access,type){
 const link=process.env.APP_ORIGIN+'/reservation-eden/#'+b.id+'.'+access;
 const content=emailContent(b,link,type),driverContent=emailContent(b,process.env.APP_ORIGIN+'/espace-chauffeur/',type,true);const d=b.data,date=new Date(d.pickupAt);
 const params={client_name:d.name,client_email:d.email,client_phone:d.phone,type_trajet:(type.startsWith('payment-choice')||type==='payment-received'?content.title:type==='invoice'?'Facture disponible':b.status==='requested'?'Demande à confirmer':'Réservation confirmée')+' — '+b.ref,depart:d.pickup,arrivee:d.dropoff,date_trajet:new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris'}).format(date),heure:new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(date),passagers:String(d.passengers),bagages:String(d.bags),prix:b.amount==null?'À confirmer':(b.amount/100).toFixed(2)+' €',notes:[content.cta+' :',link,'',content.note,d.notes].filter(x=>x!==undefined).join('\n'),email_subject:content.subject,email_html:content.html,booking_url:link,button_label:content.cta};
 return {sent:false,provider:'emailjs',jobs:(!(type==='reservation'||type==='confirmation'||type.startsWith('payment-choice')||type==='payment-received')?[['client','template_c2wsbae']]:[['driver','template_v7s6t29'],['client','template_c2wsbae']]).map(([recipient,template])=>({recipient,service_id:'service_jebbd83',template_id:template,user_id:'BM6wporc9EBwplhGn',template_params:{...params,...(recipient==='driver'?{email_subject:driverContent.subject+' — '+b.ref,email_html:driverContent.html,booking_url:process.env.APP_ORIGIN+'/espace-chauffeur/',button_label:driverContent.cta,notes:driverContent.text}:{})}}))};
}
async function send(db,b,p,access,type='reservation'){
 if(!resendConfigured()){if(!access)return {sent:false,reason:'private_link_required'};const result=browserEmails(b,access,type);if(type.startsWith('payment-')){const done=(await db.query('SELECT action FROM eden_events WHERE booking_id=$1',[b.id])).rows.map(x=>x.action);result.jobs=result.jobs.map(job=>({...job,noticeId:'emailjs:'+type+':'+job.recipient})).filter(job=>!done.includes(job.noticeId));result.ack={id:b.id,token:access};}return result;}
 try{return await db.transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['mail:'+b.id]);
 const origin=process.env.APP_ORIGIN,link=access?origin+'/reservation-eden/#'+b.id+'.'+access:origin+'/espace-chauffeur/';
 const content=emailContent(b,link,type),driverContent=emailContent(b,origin+'/espace-chauffeur/',type,true);
 const when=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(b.data.pickupAt));
 const text=`${b.ref}\n${when}\n${b.data.pickup} → ${b.data.dropoff}\n${b.amount==null?'Tarif à confirmer':(b.amount/100).toFixed(2)+' EUR'}\n${b.data.name} · ${b.data.phone}\n${b.paid?'Paiement reçu':'Paiement non enregistré'}`;
 const items=[{to:b.data.email,key:'client',subject:content.subject,body:content.text,html:content.html}];
 if(type==='reservation'||type==='confirmation'||type.startsWith('payment-choice')||type==='payment-received')items.push({to:process.env.NOTIFICATION_EMAIL||p.email,key:'driver',subject:driverContent.title,body:driverContent.text,html:driverContent.html});
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
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':b.id+'-'+event},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[item.to],subject:item.key==='client'?item.subject:item.subject+' EdenDrive — '+b.ref,text:item.body,html:item.html,attachments}),signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('delivery');
 await c.query('INSERT INTO eden_events(booking_id,action) VALUES($1,$2)',[b.id,event]);
 }catch{success=false;}
 }
 return {sent:success,reason:success?undefined:'delivery_failed'};
 });}catch{return {sent:false,reason:'delivery_failed'};}
}
module.exports={send,configured};
