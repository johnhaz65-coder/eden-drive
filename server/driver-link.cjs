const {createHash,timingSafeEqual}=require('node:crypto');
const expected=['e82fb209a2090395825c07ddcfe669d2ba50ab3d28e531533a8149a605ce210a','b774b9eda0d72e16358c62a48b68b0f3ab108f2aee2b84318008502190845570'];
module.exports=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)&&expected.some(digest=>timingSafeEqual(createHash('sha256').update(value).digest(),Buffer.from(digest,'hex')));
