const { Pool } = require('pg');
let pool;
function db(){ if(!process.env.DATABASE_URL) throw Object.assign(new Error('Le service de réservation est en cours de configuration.'),{status:503}); return pool ||= new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:10000}); }
async function transaction(fn){const c=await db().connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
module.exports={query:(...a)=>db().query(...a),transaction};
