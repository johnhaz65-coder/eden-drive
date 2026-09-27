// Commercial service zones, not municipal boundaries. Coordinates are [longitude, latitude].
// Endpoints come exclusively from the server-side Google Routes response.
const zones={
 marseille:{label:'Marseille centre',polygon:[[5.358,43.3135],[5.373,43.3135],[5.384,43.307],[5.390,43.300],[5.391,43.285],[5.384,43.284],[5.373,43.289],[5.359,43.291]]},
 aix:{label:'Aix centre',polygon:[[5.439,43.533],[5.443,43.523],[5.450,43.522],[5.458,43.524],[5.456,43.534],[5.447,43.537]]},
 cassis:{label:'Cassis centre et port',polygon:[[5.531,43.218],[5.533,43.210],[5.543,43.210],[5.547,43.215],[5.544,43.221],[5.535,43.222]]},
 airport:{label:'Aéroport Marseille-Provence',polygon:[[5.208,43.448],[5.230,43.448],[5.230,43.441],[5.224,43.435],[5.214,43.432],[5.208,43.437]]},
 charles:{label:'Gare Saint-Charles',polygon:[[5.3775,43.3008],[5.378,43.3047],[5.383,43.306],[5.383,43.301]]},
 tgv:{label:'Gare Aix TGV',polygon:[[5.313,43.458],[5.313,43.452],[5.321,43.451],[5.322,43.457]]}
};
// Airport catchments are independent of the smaller station/city forfait zones.
// Commercial boundaries checked against Google road endpoints, not arrondissement names.
// Base-area catchment: centre and accessible southern neighbourhoods near the driver's base.
// Far northern/eastern pickups remain in the extended catchment; Goudes/Callelongue stay outside.
zones.airport50={label:'Marseille centre et secteur proche',polygon:[[5.345,43.317],[5.397,43.317],[5.411,43.288],[5.420,43.265],[5.415,43.242],[5.390,43.232],[5.365,43.232],[5.354,43.250],[5.345,43.279]]};
zones.airport60={label:'Marseille secteurs éloignés et Allauch',polygon:[[5.354,43.230],[5.400,43.230],[5.432,43.250],[5.510,43.285],[5.520,43.340],[5.460,43.380],[5.370,43.385],[5.305,43.375],[5.305,43.350],[5.345,43.320]]};
// Local outer catchment: avoids imposing a Marseille minimum on Aix or other towns.
zones.airportOuter={label:'Marseille et périphérie — accès particuliers',polygon:[[5.300,43.205],[5.435,43.205],[5.550,43.280],[5.550,43.385],[5.300,43.395]]};
const fares=[['marseille','charles',2500],['airport50','airport',5000],['airport60','airport',6000],['marseille','aix',6000],['marseille','cassis',5500],['aix','airport',5000],['aix','tgv',3500]];
function inside(point,polygon){const x=point.longitude,y=point.latitude;let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if(Math.abs((y-yi)*(xj-xi)-(x-xi)*(yj-yi))<1e-12&&x>=Math.min(xi,xj)&&x<=Math.max(xi,xj)&&y>=Math.min(yi,yj)&&y<=Math.max(yi,yj))return true;if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;}
function memberships(point){if(!point||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180)throw Error('Coordonnées du trajet indisponibles. Veuillez demander un devis.');return Object.keys(zones).filter(k=>inside(point,zones[k].polygon));}
function nightSupplement(pickupAt){
 if(pickupAt===undefined)return 0;
 const date=new Date(pickupAt);if(!Number.isFinite(date.getTime()))throw Error('Horaire invalide.');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(date));
 return hour>=22||hour<6?1000:0;
}
function tariff(meters,start,end,pickupAt){if(!Number.isFinite(meters)||meters<=0)throw Error('Distance invalide.');const from=memberships(start),to=memberships(end);const fare=fares.find(([a,b])=>(from.includes(a)&&to.includes(b))||(from.includes(b)&&to.includes(a)));const localAirport=(from.includes('airport')&&to.includes('airportOuter'))||(to.includes('airport')&&from.includes('airportOuter'));const minimum=localAirport?6000:2500;const baseAmount=fare?fare[2]:Math.max(minimum,Math.round(meters*170/1000));const nightSurcharge=nightSupplement(pickupAt);return {version:'zones-2026-09-v4',baseAmount,nightSurcharge,amount:baseAmount+nightSurcharge,kind:fare?'fixed':'distance',label:fare?`Forfait ${zones[fare[0]].label} ↔ ${zones[fare[1]].label}`:`Tarif trajet · minimum ${minimum/100} €`,fromZones:from,toZones:to,waitingMinutes:from.includes('airport')?45:10,waitingBlockMinutes:15,waitingBlockCents:1000};}
module.exports={tariff,memberships,zones,nightSupplement};
