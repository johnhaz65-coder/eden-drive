const {randomBytes,createHash,scryptSync,timingSafeEqual}=require('node:crypto');
const token=()=>randomBytes(32).toString('base64url');
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
function passwordHash(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex');}
function passwordOK(p,stored){if(typeof p!=='string'||p.length>256||!stored)return false;const [salt,hex]=stored.split(':');if(!/^[a-f0-9]{128}$/.test(hex||''))return false;return timingSafeEqual(scryptSync(p,salt,64),Buffer.from(hex,'hex'));}
async function limit(db,key,max){const r=await db.query(`INSERT INTO eden_rate_limits(key,hits,expires_at) VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN eden_rate_limits.expires_at<now() THEN 1 ELSE eden_rate_limits.hits+1 END,expires_at=CASE WHEN eden_rate_limits.expires_at<now() THEN now()+interval '15 minutes' ELSE eden_rate_limits.expires_at END RETURNING hits`,[key]);if(r.rows[0].hits>max)throw Object.assign(new Error('Trop de tentatives. Réessayez dans 15 minutes.'),{status:429});}
module.exports={token,hash,passwordHash,passwordOK,limit};
