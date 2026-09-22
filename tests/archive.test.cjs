const {test}=require('node:test'),assert=require('node:assert/strict'),{archive}=require('../server/payment.cjs');
test('Archive deactivates unpaid checkout and rejects successful or pending transactions',async()=>{
 const original=global.fetch;process.env.SUMUP_API_KEY='test';process.env.SUMUP_MERCHANT_CODE='M';let writes=0,calls=[];
 const b={id:'booking',checkout_id:'checkout',amount:100,status:'confirmed',paid:false};const db={transaction:fn=>fn({query:async sql=>{if(sql.startsWith('SELECT'))return {rows:[b]};writes++;return {rows:[]};}})};
 const response={id:'checkout',checkout_reference:'booking',merchant_code:'M',currency:'EUR',amount:1,status:'PENDING',transactions:[]};
 try{
 global.fetch=async(u,o)=>{calls.push(o.method);return {ok:true,json:async()=>({...response,status:o.method==='DELETE'?'EXPIRED':response.status})}};
 await archive(db,b);assert.deepEqual(calls,['GET','DELETE']);assert.equal(writes,2);
 for(const status of ['SUCCESSFUL','PENDING','REFUNDED']){writes=0;calls=[];response.transactions=[{status}];await assert.rejects(archive(db,b));assert.equal(writes,0);assert.deepEqual(calls,['GET']);}
 }finally{global.fetch=original;delete process.env.SUMUP_API_KEY;delete process.env.SUMUP_MERCHANT_CODE;}
});
