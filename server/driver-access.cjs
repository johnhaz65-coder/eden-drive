const {token,hash}=require('./security.cjs');
const linkHash=key=>hash('driver-login:'+key);
async function request(db){
 if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID)throw Object.assign(new Error('Accès Telegram indisponible. Utilisez votre lien privé habituel.'),{status:503});
 const key=token(),digest=linkHash(key);
 await db.query("INSERT INTO eden_sessions VALUES($1,now()+interval '10 minutes')",[digest]);
 try{
  const response=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:process.env.TELEGRAM_CHAT_ID,text:'🔐 Votre accès chauffeur EdenDrive. Ce lien est valable 10 minutes et utilisable une seule fois. Si vous ne l’avez pas demandé, ignorez ce message.',link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'Ouvrir mon espace chauffeur',url:process.env.APP_ORIGIN+'/espace-chauffeur/#login='+key}]]}}),signal:AbortSignal.timeout(5000)});
  if(!response.ok||!(await response.json()).ok)throw Error('delivery');
 }catch{await db.query('DELETE FROM eden_sessions WHERE token_hash=$1',[digest]);throw Object.assign(new Error('Le lien n’a pas pu être envoyé sur Telegram. Réessayez.'),{status:502});}
 return {ok:true};
}
async function consume(db,key){
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))return false;
 return !!(await db.query('DELETE FROM eden_sessions WHERE token_hash=$1 AND expires_at>now() RETURNING token_hash',[linkHash(key)])).rows.length;
}
module.exports={request,consume};
