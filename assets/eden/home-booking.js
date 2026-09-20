/* Keep the original home form and send its trip to the booking service. */
(()=>{
 const el=id=>document.getElementById(id);
 function trip(){return {pickup:el('bk-dep').value.trim(),dropoff:el('bk-arr').value.trim(),date:el('bk-date').value,time:el('bk-h').value,passengers:Math.max(1,_bkCnt.adt+_bkCnt.kid),bags:_bkCnt.bag,service:'city'};}
 window.edenContinue=()=>{sessionStorage.setItem('eden_trip',JSON.stringify(trip()));location.assign('/reservation-eden/');};
 window.bkStep2=()=>{if(_bkType==='dispo'){location.href='tel:+33687392632';return;}const d=trip();if(!d.pickup||!d.dropoff||!d.date||!d.time){el('edenHomeStatus').textContent='Indiquez vos deux adresses, la date et l’heure.';return;}if(d.passengers>4||d.bags>4){el('edenHomeStatus').textContent='Pour plus de 4 passagers ou bagages, appelez EdenDrive.';return;}window.edenContinue();};
})();
