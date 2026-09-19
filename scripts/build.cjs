const fs=require('node:fs'),path=require('node:path');fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');
const folders=['images','assets','reservation','reservation-eden','espace-chauffeur','mise-a-disposition-chauffeur','tarifs-vtc-marseille','transfert-aeroport-marseille','vtc-aix-en-provence','vtc-gare-saint-charles'];
for(const name of fs.readdirSync('.'))if((fs.statSync(name).isFile()&&/\.(html|jpg|jpeg|png|webp|svg|ico|mp4|txt|xml)$/i.test(name))||folders.includes(name))fs.cpSync(name,path.join('dist',name),{recursive:true});
console.log('Static site built; private server files excluded.');
