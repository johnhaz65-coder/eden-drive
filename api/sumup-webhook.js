const db=require('../server/db.cjs');
const payment=require('../server/payment.cjs');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).end();
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(body?.event_type!=='CHECKOUT_STATUS_CHANGED'||!/^[-a-zA-Z0-9]{1,100}$/.test(body.id||''))return res.status(400).end();
  const b=(await db.query('SELECT * FROM eden_bookings WHERE checkout_id=$1',[body.id])).rows[0];
  // Never trust callback payment claims: retrieve and validate directly with SumUp.
  if(b&&!b.paid)await payment.reconcile(db,b);
  return res.status(204).end();
 }catch{return res.status(503).end();}
};
