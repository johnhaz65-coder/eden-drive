function initEdenQuote(){
 if(document.body.dataset.page!=='booking'||new URLSearchParams(location.search).get('demo')==='1')return;
 let sequence=0,map,renderer;
 const el=id=>document.getElementById(id);
 function showDetails(on){const box=el('customerFields');box.hidden=!on;box.disabled=!on;}
 function reset(){window.edenManual=false;el('bookSubmit').textContent='Confirmer ma réservation →';showDetails(false);sequence++;window.edenQuote=null;el('quotePrice').textContent='';el('quoteStatus').textContent='Calculez le prix de votre trajet.';el('routeMap').hidden=true;}
 async function calculate(){const current=++sequence;showDetails(false);window.edenManual=false;window.edenQuote=null;el('quotePrice').textContent='';el('quoteStatus').textContent='Calcul du trajet…';try{
 const pickup=el('pickup').value,dropoff=el('dropoff').value,pickupAt=parisISO(el('date').value,el('time').value),service=document.querySelector('[name=service]:checked').value;
 const q=await api({action:'quote',pickup,dropoff,pickupAt,service});if(current!==sequence)return;window.edenManual=false;window.edenQuote=q;el('bookSubmit').textContent='Confirmer ma réservation →';el('submitNote').textContent='Paiement par carte ou en espèces à la fin de la course. Votre bon est disponible après réservation.';showDetails(true);el('quotePrice').textContent=money(q.amount);el('quoteStatus').textContent=`${(q.distanceMeters/1000).toLocaleString('fr-FR',{maximumFractionDigits:2})} km · environ ${Math.ceil(q.durationSeconds/60)} min`;
 if(window.google?.maps&&q.polyline){el('routeMap').hidden=false;map ||=new google.maps.Map(el('routeMap'),{zoom:10,center:{lat:43.3,lng:5.37},disableDefaultUI:true});if(renderer)renderer.setMap(null);const path=google.maps.geometry.encoding.decodePath(q.polyline);renderer=new google.maps.Polyline({path,map,strokeColor:'#b58c35',strokeWeight:5});const bounds=new google.maps.LatLngBounds();path.forEach(x=>bounds.extend(x));map.fitBounds(bounds,24);}
 }catch(e){if(current===sequence)el('quoteStatus').textContent=e.message;}}
 showDetails(false);el('calculatePrice').onclick=calculate;
 el('manualRequest').onclick=()=>{sequence++;window.edenQuote=null;window.edenManual=true;showDetails(true);el('bookSubmit').textContent='Envoyer ma demande de devis →';el('submitNote').textContent='Votre chauffeur vous communiquera le tarif avant confirmation.';};
 for(const id of ['pickup','dropoff','date','time'])el(id).addEventListener('input',reset);
 document.querySelectorAll('[name=service]').forEach(x=>x.addEventListener('change',reset));
 window.edenMapsReady=()=>{for(const id of ['pickup','dropoff']){const ac=new google.maps.places.Autocomplete(el(id),{componentRestrictions:{country:'fr'},fields:['formatted_address','place_id']});ac.addListener('place_changed',()=>{const place=ac.getPlace();if(place.formatted_address)el(id).value=place.formatted_address;reset();if(el('pickup').value&&el('dropoff').value)calculate();});}};
 const script=document.createElement('script');script.src='https://maps.googleapis.com/maps/api/js?key=AIzaSyCUSwZh2BhHu9XUYET-4_F4Ajaw-kNB534&libraries=places,geometry&callback=edenMapsReady';script.async=true;document.head.append(script);
 const saved=sessionStorage.getItem('eden_trip');if(saved){try{const d=JSON.parse(saved);for(const k of ['pickup','dropoff','date','time','passengers','bags'])if(d[k])el(k).value=d[k];}catch{}sessionStorage.removeItem('eden_trip');if(el('pickup').value&&el('dropoff').value)calculate();}
}
if(window.edenBookingReady)initEdenQuote();else window.addEventListener("eden-booking-ready",initEdenQuote,{once:true});
