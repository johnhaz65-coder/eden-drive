const db=require('../server/db.cjs');const {token,hash,passwordOK,limit}=require('../server/security.cjs');const {createService,profile,legalReady,fail,publicBooking}=require('../server/domain.cjs');const {pdf}=require('../server/documents.cjs');const payment=require('../server/payment.cjs');
const service=createService(db);
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 try{
 const p=profile();const ready=!!(process.env.DATABASE_URL&&process.env.ADMIN_PASSWORD_HASH&&process.env.APP_ORIGIN&&legalReady(p)&&process.env.EDEN_BOOKING_ENABLED==='true');
 if(req.method==='GET'){return res.status(200).json({ready,payment:ready&&!!process.env.SUMUP_API_KEY&&!!process.env.SUMUP_MERCHANT_CODE,phone:p.phone||'+33687392632'});}
 if(req.method!=='POST')fail('Méthode non autorisée.',405);
 if(!ready)fail('Les réservations en ligne seront bientôt disponibles. Contactez EdenDrive par téléphone.',503);
 if(req.headers.origin!==process.env.APP_ORIGIN)fail('Origine non autorisée.',403);
 if(!String(req.headers['content-type']).startsWith('application/json'))fail('Format invalide.',415);
 let body=req.body;if(typeof body==='string')body=JSON.parse(body);if(!body||JSON.stringify(body).length>16000)fail('Demande trop volumineuse.',413);
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];await limit(db,'all:'+hash(ip),150);
 const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)eden_session=([A-Za-z0-9_-]+)/)?.[1];let admin=false;
 if(cookie)admin=!!(await db.query('SELECT 1 FROM eden_sessions WHERE token_hash=$1 AND expires_at>now()',[hash(cookie)])).rows.length;
 const secure=process.env.APP_ORIGIN.startsWith('https:')?'; Secure':'';
 if(body.action==='login'){await limit(db,'login:'+hash(ip),8);if(!passwordOK(body.password,process.env.ADMIN_PASSWORD_HASH))fail('Identifiants incorrects.',401);const access=token();await db.query("INSERT INTO eden_sessions VALUES($1,now()+interval '12 hours')",[hash(access)]);res.setHeader('Set-Cookie',`eden_session=${access}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=43200${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='logout'){if(cookie)await db.query('DELETE FROM eden_sessions WHERE token_hash=$1',[hash(cookie)]);res.setHeader('Set-Cookie',`eden_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`);return res.status(200).json({ok:true});}
 if(body.action==='create'){await limit(db,'create:'+hash(ip),6);if(body.website)fail('Demande refusée.');const b=await service.create(body);return res.status(201).json(b);}
 if(body.action==='list'){if(!admin)fail('Connectez-vous à votre espace chauffeur.',401);return res.status(200).json({bookings:(await service.list()).map(publicBooking)});}
 const b=await service.get(body.id,body.token,admin);
 if(body.action==='get')return res.status(200).json(publicBooking(b));
 if(body.action==='checkout')return res.status(200).json({url:await payment.checkout(db,b)});
 if(body.action==='payment-status')return res.status(200).json(publicBooking(await payment.reconcile(db,b)));
 if(body.action==='document'){if(!['voucher','invoice'].includes(body.type))fail('Document inconnu.');const file=await pdf(b,body.type,p);res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="EdenDrive-${body.type}-${b.ref}.pdf"`);return res.status(200).send(file);}
 if(body.action==='client-link'){if(!admin)fail('Connexion requise.',401);const access=token();await db.query('UPDATE eden_bookings SET token_hash=$2 WHERE id=$1',[b.id,hash(access)]);return res.status(200).json({url:process.env.APP_ORIGIN+'/reservation-eden/#'+b.id+'.'+access});}
 if(!admin)fail('Connexion requise.',401);
 const result=await service.change(body.id,body.action,body,p);return res.status(200).json(publicBooking(result));
 }catch(e){const status=e.status||500;return res.status(status).json({error:status===500?'Le service est momentanément indisponible. Réessayez ou contactez EdenDrive.':e.message});}
};
