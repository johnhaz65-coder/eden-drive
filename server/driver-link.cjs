const {createHash,timingSafeEqual}=require('node:crypto');
const expected=['e82fb209a2090395825c07ddcfe669d2ba50ab3d28e531533a8149a605ce210a','f31cabd580a34cbac5ea741341daec1a5f6168f2414f13150fb5b4e16f5f85f2'];
module.exports=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)&&expected.some(digest=>timingSafeEqual(createHash('sha256').update(value).digest(),Buffer.from(digest,'hex')));
