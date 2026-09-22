// Commercial service zones, not municipal boundaries. Coordinates are [longitude, latitude].
// Endpoints come exclusively from the server-side Google Routes response.
const zones={
 marseille:{label:'Marseille centre',polygon:[[5.358,43.3135],[5.373,43.3135],[5.384,43.307],[5.390,43.300],[5.391,43.285],[5.384,43.284],[5.373,43.289],[5.359,43.291]]},
 aix:{label:'Aix centre',polygon:[[5.439,43.533],[5.443,43.523],[5.450,43.522],[5.458,43.524],[5.456,43.534],[5.447,43.537]]},
 cassis:{label:'Cassis centre et port',polygon:[[5.531,43.218],[5.533,43.210],[5.543,43.210],[5.547,43.215],[5.544,43.221],[5.535,43.222]]},
 airport:{label:'Aéroport Marseille-Provence',polygon:[[5.208,43.444],[5.224,43.444],[5.227,43.435],[5.214,43.432],[5.208,43.437]]},
 charles:{label:'Gare Saint-Charles',polygon:[[5.378,43.3015],[5.378,43.3047],[5.383,43.306],[5.383,43.302]]},
 tgv:{label:'Gare Aix TGV',polygon:[[5.313,43.458],[5.313,43.452],[5.321,43.451],[5.322,43.457]]}
};
const fares=[['marseille','charles',2500],['marseille','airport',5000],['marseille','aix',6000],['marseille','cassis',5500],['aix','airport',5000],['aix','tgv',3500]];
function inside(point,polygon){const x=point.longitude,y=point.latitude;let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if(Math.abs((y-yi)*(xj-xi)-(x-xi)*(yj-yi))<1e-12&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;}
function memberships(point){if(!point||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180)throw Error('Coordonnées du trajet indisponibles. Veuillez demander un devis.');return Object.keys(zones).filter(k=>inside(point,zones[k].polygon));}
function tariff(meters,start,end){if(!Number.isFinite(meters)||meters<=0)throw Error('Distance invalide.');const from=memberships(start),to=memberships(end);const fare=fares.find(([a,b])=>(from.includes(a)&&to.includes(b))||(from.includes(b)&&to.includes(a)));return {version:'zones-2026-09-v1',amount:fare?fare[2]:Math.max(2500,Math.round(meters*170/1000)),kind:fare?'fixed':'distance',label:fare?`Forfait ${zones[fare[0]].label} ↔ ${zones[fare[1]].label}`:'Tarif trajet · minimum 25 €',fromZones:from,toZones:to,waitingMinutes:from.includes('airport')?45:10,waitingBlockMinutes:15,waitingBlockCents:1000};}
module.exports={tariff,memberships,zones};
