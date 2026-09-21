const {test}=require('node:test');const assert=require('node:assert/strict');const telegram=require('../server/telegram.cjs');
test('Telegram is optional, records accepted delivery and suppresses duplicate reservation alerts',async()=>{
 const oldFetch=global.fetch,oldToken=process.env.TELEGRAM_BOT_TOKEN,oldChat=process.env.TELEGRAM_CHAT_ID;let sent=0,recorded=false;
 const db={transaction:fn=>fn({query:async(sql)=>{if(sql.startsWith('SELECT 1'))return {rows:recorded?[{}]:[]};if(sql.startsWith('INSERT'))recorded=true;return {rows:[]};}})};
 const b={id:'test',ref:'TEST',status:'confirmed',amount:5174,data:{pickupAt:'2026-10-01T10:00:00Z',pickup:'Marseille',dropoff:'Aéroport',name:'Test',phone:'',passengers:1,bags:0}};
 try{
 delete process.env.TELEGRAM_BOT_TOKEN;assert.equal((await telegram.notify(db,b)).reason,'not_configured');
 process.env.TELEGRAM_BOT_TOKEN='test';process.env.TELEGRAM_CHAT_ID='123';
 global.fetch=async(u,o)=>{sent++;assert.match(JSON.parse(o.body).text,/51.74/);return {ok:false}};
 assert.equal((await telegram.notify(db,b)).sent,false);assert.equal(recorded,false);
 global.fetch=async()=>{sent++;return {ok:true,json:async()=>({ok:true})}};
 assert.equal((await telegram.notify(db,b)).sent,true);assert.equal((await telegram.notify(db,b)).sent,true);assert.equal(sent,2);
 }finally{global.fetch=oldFetch;for(const [k,v]of Object.entries({TELEGRAM_BOT_TOKEN:oldToken,TELEGRAM_CHAT_ID:oldChat})){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
