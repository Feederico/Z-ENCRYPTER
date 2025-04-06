//Me traigo las dependencias
var jszip = require('jszip');
var fs = require('fs');
var path = require('path');
var toBuffer = require('blob-to-buffer');

//Función para comprimir sin metadatos
function createZip(files,name){
    return new Promise(function(resolve,reject){
        let zip = new jszip();
    
        for(let f of files){
            zip.file(f.name,f);
        }
    
        zip.generateAsync({type:'blob'}).then((blobdata)=>{
            let blobicus = new Blob([blobdata]);
            toBuffer(blobicus,(err,buffer)=>{
                if(err){
                    console.log(`${err}`);
                    return;
                }
    
                fs.writeFileSync(path.join(__dirname,`../../encriptado/${name}.zip`),buffer);
            })
        })
        resolve();
    })
}

//Función para comprimir con metadatos
function createZipMeta(files,name,meta){
    return new Promise(function(resolve,reject){

        let zip = new jszip();
    
        for(let f of files){
            zip.file(f.name,f);
        }
    
        zip.file(`${name}_metadatos.json`,JSON.stringify(meta));
    
        zip.generateAsync({type:'blob'}).then((blobdata)=>{
            let blobicus = new Blob([blobdata]);
            toBuffer(blobicus,(err,buffer)=>{
                if(err) {
                    console.log(`${err}`);
                    return;
                }
                if(!fs.existsSync(path.join(__dirname,"../../encriptado")))
                    fs.mkdirSync(path.join(__dirname,"../../encriptado"));
                
                fs.writeFileSync(path.join(__dirname,`../../encriptado/${name}.zip`),buffer);
                resolve();
            })
        })
    })
}

function decompressZip(file){
    jszip.loadAsync(file).then((zip)=>{
        zip.forEach((ruta,object)=>{
            zip.file(ruta).async('blob').then((blob)=>{
                toBuffer(blob,(err,buff)=>{
                    fs.writeFileSync(path.join(__dirname,`../../desencriptado/${object.name}`),buff);
                });
            });
        });
    });
};

function readMetadata(file){
    return new Promise(function(resolve,reject){
        let regex = /^.*metadatos\.json$/
        jszip.loadAsync(file).then((zip)=>{
            zip.forEach((ruta,object)=>{
                let match = object.name.match(regex);
                if(match){
                    zip.file(match[0]).async('string').then((str)=>{
                        let result = JSON.parse(str);
                        resolve(result);
                    })
                }
            });
        });
    })
}

exports.createZip = createZip;
exports.createZipMeta = createZipMeta;
exports.decompressZip = decompressZip;
exports.readMetadata = readMetadata;