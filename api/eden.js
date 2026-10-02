const telegram=require('../server/telegram.cjs');
const quotes=require('../server/quote.cjs');const notifications=require('../server/notifications.cjs');
const db=require('../server/db.cjs');const {token,hash,passwordOK,limit}=require('../server/security.cjs');const {createService,profile,legalReady,fail,publicBooking}=require('../server/domain.cjs');const {pdf}=require('../server/documents.cjs');const payment=require('../server/payment.cjs');
const service=createService(db);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 try{
 const p=profile();const ready=!!(process.env.DATABASE_URL&&process.env.ADMIN_PASSWORD_HASH&&process.env.APP_ORIGIN&&legalReady(p)&&process.env.EDEN_BOOKING_ENABLED==='true');
 if(req.method==='GET'){return res.status(200).json({ready,payment:ready&&!!process.env.SUMUP_API_KEY&&!!process.env.SUMUP_MERCHANT_CODE,instantPricing:!!process.env.GOOGLE_ROUTES_API_KEY,email:notifications.configured(),phone:p.phone||'+33687392632'});}
 if(req.method!=='POST')fail('Méthode non autorisée.',405);
 if(!ready)fail('Les réservations en ligne seront bientôt disponibles. Contactez EdenDrive par téléphone.',503);
 if(req.headers.origin!==process.env.APP_ORIGIN)fail('Origine non autorisée.',403);
 if(!String(req.headers['content-type']).startsWith('application/json'))fail('Format invalide.',415);
 let body=req.body;if(typeof body==='string')body=JSON.parse(body);if(!body||JSON.stringify(body).length>16000)fail('Demande trop volumineuse.',413);
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];await limit(db,'all:'+hash(ip),150);
 const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)eden_session=([A-Za-z0-9_-]+)/)?.[1];let admin=false;
 if(cookie)admin=!!(await db.query('SELECT 1 FROM eden_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(cookie)])).rows.length;
 const secure=process.env.APP_ORIGIN.startsWith('https:')?'; Secure':'';
 if(body.action==='request-driver-access'){await limit(db,'driver-access:'+hash(ip),3);await limit(db,'driver-access:global',8);return res.status(200).json(await require('../server/driver-access.cjs').request(db));}
 if(body.action==='redeem-driver-access'){await limit(db,'login:'+hash(ip),8);if(!await require('../server/driver-access.cjs').consume(db,body.key))fail('Ce lien a expiré ou a déjà été utilisé. Demandez un nouveau lien sur Telegram.',401);const access=token();await db.query("INSERT INTO eden_sessions VALUES($1,now()+interval '30 days')",[hash(access)]);res.setHeader('Set-Cookie',`eden_session=${access}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='login'){await limit(db,'login:'+hash(ip),8);if(!passwordOK(body.password,process.env.ADMIN_PASSWORD_HASH))fail('Identifiants incorrects.',401);const access=token();await db.query("INSERT INTO eden_sessions VALUES($1,now()+interval '30 days')",[hash(access)]);res.setHeader('Set-Cookie',`eden_session=${access}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='link-login'){await limit(db,'login:'+hash(ip),8);if(!require('../server/driver-link.cjs')(body.key))fail('Lien privé invalide.',401);const access=token();await db.query("INSERT INTO eden_sessions VALUES($1,now()+interval '30 days')",[hash(access)]);res.setHeader('Set-Cookie',`eden_session=${access}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=2592000${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='logout'){if(cookie)await db.query('DELETE FROM eden_sessions WHERE token_hash=$1',[hash(cookie)]);res.setHeader('Set-Cookie',`eden_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='quote'){await limit(db,'quote:'+hash(ip),30);return res.status(200).json(await quotes.quote(body));}
 if(body.action==='create-quoted'){await limit(db,'create:'+hash(ip),6);if(body.website)fail('Demande refusée.');const q=quotes.verifyQuote(body.quoteToken,body),access=quotes.accessFor(q);const b=await service.createQuoted(body,q,access);await telegram.notify(db,b);const notification=await notifications.send(db,b,p,access);return res.status(201).json({...b,notification});}
 if(body.action==='create'){await limit(db,'create:'+hash(ip),6);if(body.website)fail('Demande refusée.');const b=await service.create(body);await telegram.notify(db,b);const notification=await notifications.send(db,b,p,b.token);return res.status(201).json({...b,notification});}
 if(body.action==='list'){if(!admin)fail('Connectez-vous à votre espace chauffeur.',401);return res.status(200).json({bookings:(await service.list()).map(publicBooking)});}
 const b=await service.get(body.id,body.token,admin);
 if(body.action==='calculate-booking'){if(!admin)fail('Connexion requise.',401);await limit(db,'quote:'+hash(ip),30);if(b.status!=='requested'||b.amount!=null)fail('Actualisez cette demande : elle possède déjà un prix ou a été traitée.',409);const q=await quotes.quote(b.data);return res.status(200).json(publicBooking(await service.saveEstimate(b.id,q)));}
 if(body.action==='archive-test'){
  if(!admin)fail('Connexion requise.',401);
  if(body.confirmTest!==b.ref)fail('Confirmez la référence de la réservation d’essai.',400);
  const approvedTests=new Set(['ED-B6D69571','ED-C8A27A39','ED-65DADBC9','ED-ECDDF4DA','ED-5C3832DB','ED-BEFE599D','ED-F4141601','ED-2CB459FC','ED-75FF2464','ED-2F13411E']);
  if(!approvedTests.has(b.ref))fail('Cette réservation ne fait pas partie des essais identifiés.',409);
  await db.transaction(async c=>{
   const current=(await c.query('SELECT * FROM eden_bookings WHERE id=$1 FOR UPDATE',[b.id])).rows[0];
   if(!approvedTests.has(current.ref))fail('Réservation non identifiée comme essai.',409);
   // Hide only: preserve payment, invoice, status and checkout records unchanged.
   await c.query("UPDATE eden_bookings SET data=data || '{\"archived\":true,\"testBooking\":true}'::jsonb,updated_at=now() WHERE id=$1",[b.id]);
   await c.query('INSERT INTO eden_events(booking_id,action) VALUES($1,$2)',[b.id,'archive-test-preserve-payment']);
  });
  return res.status(200).json({ok:true});
 }
 if(body.action==='archive'){if(!admin)fail('Connexion requise.',401);return res.status(200).json(await payment.archive(db,b));}
 if(body.action==='email-delivered'){const allowed=['payment-choice:'+b.data.paymentChoiceRevision,...(b.paid?['payment-received']:[])].flatMap(type=>['client','driver'].map(who=>'emailjs:'+type+':'+who));if(!allowed.includes(body.noticeId))fail('Notification inconnue.');await db.query('INSERT INTO eden_events(booking_id,action) SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM eden_events WHERE booking_id=$1 AND action=$2)',[b.id,body.noticeId]);return res.status(200).json({ok:true});}
 if(body.action==='get'){const kind=b.paid?'payment-received':b.data.paymentChoiceRevision?'payment-choice:'+b.data.paymentChoiceRevision:null;const notification=kind&&body.token?await notifications.send(db,b,p,body.token,kind):undefined;return res.status(200).json({...publicBooking(b),...(notification?{notification}:{})});}
 if(body.action==='send-email'){await limit(db,'mail:'+b.id,5);if(!body.token)fail('Ouvrez le lien privé client pour envoyer les documents.');return res.status(200).json(await notifications.send(db,b,p,body.token));}
 if(body.action==='request-invoice'){await limit(db,'invoice:'+b.id,5);const updated=await service.change(b.id,'invoice',{billingAddress:body.billingAddress},p);const notification=await notifications.send(db,updated,p,body.token,'invoice');return res.status(200).json({...publicBooking(updated),notification});}
 if(['cash-preference','onboard-preference','checkout'].includes(body.action)){await limit(db,'payment-choice:'+b.id,20);const current=await payment.reconcile(db,b);if(current.paid)fail('Ce trajet est déjà réglé.',409);const url=body.action==='checkout'?await payment.checkout(db,current):undefined;const updated=await service.change(b.id,body.action==='checkout'?'online-preference':body.action,{},p);await telegram.notify(db,updated,'payment-choice');const notification=await notifications.send(db,updated,p,body.token,'payment-choice:'+updated.data.paymentChoiceRevision);return res.status(200).json({...publicBooking(updated),notification,...(url?{url}:{})});}
 if(body.action==='payment-status'){const updated=await payment.reconcile(db,b);const notification=body.token&&(updated.paid||updated.data.paymentChoiceRevision)?await notifications.send(db,updated,p,body.token,updated.paid?'payment-received':'payment-choice:'+updated.data.paymentChoiceRevision):undefined;return res.status(200).json({...publicBooking(updated),...(notification?{notification}:{})});}
 if(body.action==='document'){if(!['voucher','invoice'].includes(body.type))fail('Document inconnu.');const file=await pdf(b,body.type,p);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="EdenDrive-${body.type}-${b.ref}.pdf"`);return res.status(200).send(file);}
 if(body.action==='client-link'){if(!admin)fail('Connexion requise.',401);if(b.data.pricing?.source==='quote'){const access=quotes.accessFor(b);if(hash(access)===b.token_hash)return res.status(200).json({url:process.env.APP_ORIGIN+'/reservation-eden/#'+b.id+'.'+access});}const access=token();await db.query('UPDATE eden_bookings SET token_hash=$2 WHERE id=$1',[b.id,hash(access)]);return res.status(200).json({url:process.env.APP_ORIGIN+'/reservation-eden/#'+b.id+'.'+access});}
 if(!admin)fail('Connexion requise.',401);
 if(body.action==='paid'&&b.checkout_id){const current=await payment.reconcile(db,b);if(current.paid)fail('Le paiement SumUp est déjà enregistré.',409);}
 const result=await service.change(body.id,body.action,body,p);let notification;
 if(body.action==='paid')await telegram.notify(db,result,'payment-received');
 if(['confirm','invoice'].includes(body.action)){const access=quotes.accessFor(result);if(hash(access)!==result.token_hash)await db.query("UPDATE eden_bookings SET data=jsonb_set(data,'{confirmationAccessHash}',$2::jsonb) WHERE id=$1",[result.id,JSON.stringify(hash(access))]);notification=await notifications.send(db,result,p,access,body.action==='invoice'?'invoice':'confirmation');}
 return res.status(200).json({...publicBooking(result),...(notification?{notification}:{})});
 }catch(e){const status=e.status||500;return res.status(status).json({error:status===500?'Le service est momentanément indisponible. Réessayez ou contactez EdenDrive.':e.message});}
};
