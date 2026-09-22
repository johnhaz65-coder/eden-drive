const {createHash,timingSafeEqual}=require('node:crypto');
const expected='e82fb209a2090395825c07ddcfe669d2ba50ab3d28e531533a8149a605ce210a';
module.exports=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)&&timingSafeEqual(createHash('sha256').update(value).digest(),Buffer.from(expected,'hex'));
