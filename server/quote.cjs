const {createHmac,timingSafeEqual,randomUUID}=require('node:crypto');
const {fail}=require('./domain.cjs');
const {tariff}=require('./tariffs.cjs');
const secret=()=>process.env.QUOTE_SECRET||process.env.ADMIN_PASSWORD_HASH;
function sign(value){if(!secret())fail('Calcul du tarif indisponible.',503);return createHmac('sha256',secret()).update(value).digest('base64url');}
function verifyQuote(token,input){
 const [payload,sig,...rest]=String(token||'').split('.');
 const expected=sign(payload||'');if(rest.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))fail('Veuillez recalculer votre tarif.',409);
 let q;try{q=JSON.parse(Buffer.from(payload,'base64url'));}catch{fail('Tarif invalide.');}
 if(q.expires<Date.now()||q.pickup!==String(input.pickup||'').trim()||q.dropoff!==String(input.dropoff||'').trim()||q.pickupAt!==input.pickupAt||q.service!==input.service)fail('Votre trajet a changé ou le tarif a expiré. Recalculez-le.',409);
 return q;
}
async function quote(input){
 if(!process.env.GOOGLE_ROUTES_API_KEY)fail('Le calcul automatique est en cours d’activation. Appelez le 06 87 39 26 32 pour votre tarif.',503);
 const pickup=String(input.pickup||'').trim(),dropoff=String(input.dropoff||'').trim();
 if(pickup.length<5||dropoff.length<5||pickup.length>300||dropoff.length>300||pickup===dropoff)fail('Choisissez deux adresses complètes différentes.');
 if(!['airport','station','city'].includes(input.service))fail('Pour une mise à disposition, contactez votre chauffeur.');
 const at=Date.parse(input.pickupAt);if(!Number.isFinite(at)||at<Date.now()+15*60000||at>Date.now()+366*86400000)fail('Choisissez un horaire au moins 15 minutes à l’avance.');
 const r=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_ROUTES_API_KEY,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation'},body:JSON.stringify({origin:{address:pickup},destination:{address:dropoff},travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE',languageCode:'fr-FR',units:'METRIC',routeModifiers:{avoidFerries:true}}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)fail('Google Maps ne peut pas calculer ce trajet pour le moment. Contactez EdenDrive.',502);
 const route=(await r.json()).routes?.[0];if(!route||!Number.isFinite(route.distanceMeters)||route.distanceMeters<600||route.distanceMeters>1500000||!Number.isFinite(parseFloat(route.duration))||parseFloat(route.duration)<=0)fail('Trajet non disponible en réservation automatique. Contactez EdenDrive.');
 let pricing;try{pricing=tariff(route.distanceMeters,route.legs?.[0]?.startLocation?.latLng,route.legs?.at(-1)?.endLocation?.latLng);}catch(e){fail(e.message,502);}
 const q={id:randomUUID(),pickup,dropoff,pickupAt:input.pickupAt,service:input.service,distanceMeters:route.distanceMeters,durationSeconds:Math.ceil(parseFloat(route.duration)),pricing,amount:pricing.amount,expires:Date.now()+15*60000};
 const payload=Buffer.from(JSON.stringify(q)).toString('base64url');return {...q,polyline:route.polyline?.encodedPolyline,token:payload+'.'+sign(payload)};
}
module.exports={quote,verifyQuote,accessFor:q=>sign('customer:'+q.id)};
