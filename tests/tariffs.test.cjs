const {test}=require('node:test'),assert=require('node:assert/strict');
const {tariff,memberships}=require('../server/tariffs.cjs');
const p=(latitude,longitude)=>({latitude,longitude});
const port=p(43.295,5.374),station=p(43.303,5.381),airport=p(43.438,5.215),aix=p(43.526,5.447),tgv=p(43.455,5.317),cassis=p(43.214,5.539);
test('Approved fixed prices apply in both directions regardless of road distance',()=>{for(const [a,b,cents] of [[port,station,2500],[port,airport,5000],[port,aix,6000],[port,cassis,5500],[aix,airport,5000],[aix,tgv,3500]])for(const [start,end] of [[a,b],[b,a]]){assert.equal(tariff(42000,start,end).amount,cents);assert.equal(tariff(42000,start,end).kind,'fixed');}});
test('Airport catchments leave station and other town fares independent',()=>{for(const point of [p(43.272,5.391),p(43.215,5.344),p(43.352,5.439),p(43.503,5.387),p(43.478,5.416),p(43.577,5.415)]){assert.ok(!memberships(point).includes('marseille'));assert.equal(tariff(40000,point,station).amount,6800);assert.equal(tariff(1600,point,station).amount,2500);}});
test('Named central areas and station areas are included; no unverified airport-TGV forfait',()=>{for(const point of [port,p(43.307,5.365),p(43.286,5.384),station])assert.ok(memberships(point).includes('marseille'));assert.equal(tariff(15000,tgv,airport).kind,'distance');assert.equal(tariff(15000,tgv,airport).amount,2550);assert.throws(()=>tariff(15000,null,airport),/Coordonnées/);assert.throws(()=>tariff(15000,p(NaN,5),airport),/Coordonnées/);assert.equal(tariff(20000,airport,port).waitingMinutes,45);assert.equal(tariff(20000,port,airport).waitingMinutes,10);});

test('Google road access points belong to airport and station zones',()=>{const a=p(43.44424,5.22607),s=p(43.3014,5.38014);assert.ok(memberships(a).includes('airport'));assert.ok(memberships(s).includes('charles'));assert.equal(tariff(28400,a,port).amount,5000);assert.equal(tariff(1600,port,s).kind,'fixed');assert.equal(tariff(28400,a,port).waitingMinutes,45);});

test('Verified Google road endpoints receive their airport forfait in both directions',()=>{
 const rows=[[5.38301,43.2787,5000],[5.39155,43.27259,5000],[5.37379,43.2666,6000],[5.38134,43.25426,6000],[5.40506,43.25065,6000],[5.37445,43.24066,6000],[5.48261,43.29992,6000],[5.44045,43.35109,6000],[5.48227,43.33556,6000],[5.43441,43.27799,6000],[5.36596,43.30362,5000],[5.36317,43.37146,5000],[5.31693,43.36165,5000]];
 for(const [lon,lat,cents] of rows)for(const [a,b] of [[p(lat,lon),airport],[airport,p(lat,lon)]]){assert.equal(tariff(48000,a,b).amount,cents);assert.equal(tariff(48000,a,b).kind,'fixed');}
});
test('Special access uses distance with 60 euro floor, without affecting Aix TGV',()=>{for(const q of [p(43.21554,5.34708),p(43.21287,5.35437)])for(const [a,b] of [[q,airport],[airport,q]]){assert.equal(tariff(30000,a,b).amount,6000);assert.equal(tariff(45000,a,b).amount,7650);assert.equal(tariff(30000,a,b).kind,'distance');}assert.equal(tariff(15000,tgv,airport).amount,2550);});
test('Prado southern boundary is deterministic and airport only',()=>{assert.equal(tariff(30000,p(43.271,5.39),airport).amount,5000);assert.equal(tariff(30000,p(43.27099,5.39),airport).amount,6000);assert.equal(tariff(30000,p(43.27101,5.39),airport).amount,5000);assert.equal(tariff(20000,p(43.271,5.39),station).kind,'distance');});

test('Night supplement follows Paris winter/summer time and exact 22h/6h limits',()=>{
 for(const [date,extra] of [['2026-09-29T19:59:00Z',0],['2026-09-29T20:00:00Z',1000],['2026-09-30T03:59:00Z',1000],['2026-09-30T04:00:00Z',0],['2026-12-01T21:00:00Z',1000],['2026-12-02T05:00:00Z',0],['2026-10-25T00:30:00Z',1000],['2026-10-25T01:30:00Z',1000]]){
  const q=tariff(30000,port,airport,date);assert.equal(q.nightSurcharge,extra);assert.equal(q.amount,5000+extra);assert.equal(q.baseAmount,5000);
 }
 const at='2026-09-30T02:00:00Z';assert.equal(tariff(40000,p(43.25426,5.38134),airport,at).amount,7000);assert.equal(tariff(2000,port,station,at).amount,3500);assert.equal(tariff(45000,p(43.21554,5.34708),airport,at).amount,8650);
});
