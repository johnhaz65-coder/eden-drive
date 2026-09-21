const PDFDocument=require('pdfkit');const {legalReady,fail,amounts}=require('./domain.cjs');
const euro=n=>(n/100).toFixed(2).replace('.',',')+' EUR';
const date=s=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(s));
function pdf(b,type,p,{demo=false}={}){return new Promise((resolve,reject)=>{
 if(type==='invoice'&&!b.invoice_snapshot)return reject(Object.assign(new Error('La facture n’a pas encore été émise.'),{status:409}));
 if(type==='voucher'&&!['confirmed','completed'].includes(b.status))return reject(Object.assign(new Error('Le bon sera disponible après confirmation.'),{status:409}));
 if(!demo&&!legalReady(p))return reject(Object.assign(new Error('Informations entreprise incomplètes.'),{status:503}));
 if(type==='voucher'&&!demo){require('./voucher.cjs')(b,p).then(resolve,reject);return;}
 const inv=type==='invoice',snapshot=b.invoice_snapshot; if(inv)p=snapshot.company;
 const data=inv?snapshot.booking.data:b.data,price=inv?snapshot.booking.amount:b.amount;
 const d=new PDFDocument({size:'A4',margin:46,info:{Title:inv?'Facture EdenDrive':'Bon de réservation EdenDrive',CreationDate:new Date(inv?snapshot.issuedAt:b.created_at)}}),chunks=[];d.on('data',c=>chunks.push(c));d.on('end',()=>resolve(Buffer.concat(chunks)));d.on('error',reject);
 d.rect(0,0,595,106).fill('#191b19');d.fillColor('#c9a84c').font('Times-Roman').fontSize(25).text('E D E N  D R I V E',46,32);d.fillColor('#ffffff').font('Helvetica').fontSize(10).text(inv?'FACTURE':'BON DE RÉSERVATION',46,72);
 d.y=125;d.fillColor('#292b29');if(demo)d.fontSize(16).fillColor('#b14835').text('DÉMONSTRATION — SANS VALEUR COMMERCIALE').moveDown().fillColor('#292b29');
 d.fontSize(10).text('Référence : '+(inv?snapshot.number:b.ref));d.text('Émis le : '+date(inv?snapshot.issuedAt:b.created_at));if(!inv)d.text('Réservation préalable enregistrée le : '+date(b.created_at));d.moveDown();
 function section(title,lines){if(d.y>645)d.addPage();d.font('Helvetica-Bold').fontSize(11).fillColor('#93712c').text(title).moveDown(.4);d.font('Helvetica').fontSize(10).fillColor('#292b29');for(const line of lines.filter(Boolean))d.text(String(line),{width:500,lineGap:3});d.moveDown();}
 section('PRISE EN CHARGE',[date(data.pickupAt)+' (heure de Paris)','Départ : '+data.pickup,'Arrivée : '+data.dropoff,`${data.passengers} passager(s) · ${data.bags} bagage(s)`,data.flight&&'Vol / train : '+data.flight,data.sign&&'Pancarte : '+data.sign]);
 section('EXPLOITANT',[p.legalName,p.address,'SIRET : '+p.siret,p.registration,p.email+' · '+p.phone,p.vatMode==='taxable'&&'N° TVA : '+p.vatNumber]);
 const driver=data.driver||{name:p.driverName,card:p.driverCard,phone:p.phone,vehicle:p.vehicle,plate:p.plate};
 section('CHAUFFEUR ET VÉHICULE',[driver.name+' · '+driver.phone,'Carte professionnelle : '+driver.card,driver.vehicle+' · '+driver.plate]);
 section('CLIENT',[data.company,data.name,data.billingAddress,data.company&&data.siren&&'SIREN client : '+data.siren,data.email+' · '+data.phone]);
 if(data.notes&&!inv)section('INSTRUCTIONS',[data.notes]);
 const t=inv?snapshot.totals:amounts(price,p);section('TRANSPORT PRIVÉ — 1 PRESTATION',[`HT : ${euro(t.ht)} · TVA ${t.rate}% : ${euro(t.tax)}`,'TOTAL TTC : '+euro(t.ttc),b.paid?'Règlement enregistré le '+date(b.paid_at)+' · '+b.payment_method:data.paymentPreference==='cash'?'À régler en espèces à la fin de la course — non encaissé':'À régler — paiement non enregistré',p.vatMode==='exempt'?'TVA non applicable, art. 293 B du CGI.':'']);
 if(inv)section('CONDITIONS',['Échéance : à réception. Escompte pour paiement anticipé : néant.',data.company?p.latePaymentTerms+' Indemnité forfaitaire de recouvrement : 40 EUR (clients professionnels).':'']);
 d.fontSize(8).fillColor('#6a6a63').text('EdenDrive · edendrive.fr · Document à conserver.');d.end();
});}
module.exports={pdf};
