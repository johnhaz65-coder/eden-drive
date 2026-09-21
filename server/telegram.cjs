const configured=()=>!!(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID);
async function notify(db,b){
 if(!configured())return {sent:false,reason:'not_configured'};
 try{return await db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['telegram:'+b.id]);
  const event='telegram:reservation';
  if((await c.query('SELECT 1 FROM eden_events WHERE booking_id=$1 AND action=$2',[b.id,event])).rows.length)return {sent:true};
  const when=new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(b.data.pickupAt));
  const short=v=>String(v||'').slice(0,500);
  const text=[b.status==='requested'?'🚘 Nouvelle demande EdenDrive':'🚘 Nouvelle réservation EdenDrive',b.ref,when+' (heure de Paris)','Départ : '+short(b.data.pickup),'Arrivée : '+short(b.data.dropoff),'Prix : '+(b.amount==null?'à confirmer':(b.amount/100).toFixed(2)+' €'),short(b.data.name)+' · '+short(b.data.phone),b.data.passengers+' passager(s) · '+b.data.bags+' bagage(s)',b.paid?'Paiement enregistré':'Paiement non enregistré'].join('\n');
  const r=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text,link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'Ouvrir mon espace chauffeur',url:process.env.APP_ORIGIN+'/espace-chauffeur/'}]]}}),signal:AbortSignal.timeout(5000)});
  if(!r.ok||!(await r.json()).ok)return {sent:false,reason:'delivery_failed'};
  await c.query('INSERT INTO eden_events(booking_id,action) VALUES($1,$2)',[b.id,event]);
  return {sent:true};
 });}catch{return {sent:false,reason:'delivery_failed'};}
}
module.exports={notify,configured};
