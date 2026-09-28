const {test}=require('node:test');const assert=require('node:assert/strict');const {hash}=require('../server/security.cjs');const access=require('../server/driver-access.cjs');
test('Driver link is sent only to configured Telegram, single use, and never returned to caller',async()=>{
 const oldFetch=global.fetch;const old={...process.env};const rows=new Set();let payload;
 process.env.TELEGRAM_BOT_TOKEN='test';process.env.TELEGRAM_CHAT_ID='owner';process.env.APP_ORIGIN='https://www.edendrive.fr';
 const db={query:async(sql,args)=>{if(sql.startsWith('INSERT'))rows.add(args[0]);else if(sql.startsWith('DELETE')){const exists=rows.delete(args[0]);return {rows:exists?[{}]:[]};}return {rows:[]};}};
 global.fetch=async(url,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({ok:true})};};
 try{const result=await access.request(db);assert.deepEqual(result,{ok:true});assert.equal(payload.chat_id,'owner');const key=payload.reply_markup.inline_keyboard[0][0].url.split('#login=')[1];assert(!rows.has(hash(key)));assert.equal(await access.consume(db,key),true);assert.equal(await access.consume(db,key),false);assert.equal(await access.consume(db,'invalid'),false);
 global.fetch=async()=>({ok:false});await assert.rejects(()=>access.request(db),/envoyé/);assert.equal(rows.size,0);
 }finally{global.fetch=oldFetch;for(const k of ['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID','APP_ORIGIN']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
