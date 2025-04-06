const {ipcRenderer} = require('electron');
const {remote} = require("electron");
const crypto = require('../js/modules/encrypt-module.js');
const zipLib = require('../js/modules/compress-module.js');
const path = require('path');
const hashModule = require('../js/modules/hash-module.js');
const signify = require('../js/modules/sign-verify-module');
const shareM = require('../js/modules/shareFile-module.js');
const services = require('../js/modules/services');
const fs = require('fs');
const { file } = require('jszip');

var fileName = '';
var user = '';

function goToFirstWindow(){
  remote.getCurrentWindow().close();
};

//Comprueba si el archivo es compartido, devolviendo el dueño original en caso positivo y una cadena vacia en caso negativo
async function getOwnerIfShared (fileName) {
  let archivosCompartidos = await shareM.listSharedFiles();
  var ownerWhoShared = "";
  for (var i = 0; i < archivosCompartidos.length; i++) {
    if(archivosCompartidos[i].file == fileName){
      ownerWhoShared = archivosCompartidos[i].fileOwner;
    }
  }
  return ownerWhoShared;
}

function holdBeforeBothFilesExists(filePath1, filePath2, timeout) {
  timeout = timeout < 1000 ? 1000 : timeout;
  return new Promise((resolve)=>{  
      var timer = setTimeout(function () {
          resolve();
      },timeout);

      var inter = setInterval(function () {
      if(fs.existsSync(filePath1) && fs.lstatSync(filePath1).isFile() && fs.existsSync(filePath2) && fs.lstatSync(filePath2).isFile()){
          clearInterval(inter);
          clearTimeout(timer);
          resolve();
      }
    }, 100);
 });
}

function holdBeforeThreeFilesExists(filePath1, filePath2, filePath3, timeout) {
  timeout = timeout < 1000 ? 1000 : timeout;
  return new Promise((resolve)=>{  
      var timer = setTimeout(function () {
          resolve();
      },timeout);

      var inter = setInterval(function () {
      if(fs.existsSync(filePath1) && fs.lstatSync(filePath1).isFile() && fs.existsSync(filePath2) && fs.lstatSync(filePath2).isFile() 
      && fs.existsSync(filePath3) && fs.lstatSync(filePath3).isFile()){
          clearInterval(inter);
          clearTimeout(timer);
          resolve();
      }
    }, 100);
 });
}

async function verifyFile(){
  fileName = document.getElementById("nombreMeta").innerText + ".enc";
  user = hashModule.userNameFromToken();
  //Compruebo si el archivo es compartido, en cuyo caso obtengo el nombre del autor original
  getOwnerIfShared(fileName.replace(".enc", "")).then(owner => {
    var ruta = path.join(__dirname,`../encriptado/${user}`);
    var pathSignToCheck = "";
    var pathKeyToCheck = "";
    let rutaCheck = path.join(__dirname,`../desencriptado/${user}`);
    var pathZipToCheck = `${rutaCheck}/${fileName.replace('.enc','.zip')}`;

    if(owner.length != 0){                                          //Es compartido
      //Obtengo la clave publica y la firma
      services.downloadSignatureOfOwner(fileName, owner);
      ruta = path.join(__dirname,`../encriptado/${user}/compartidos`);  //la ruta de los files compartidos estan en /compartidos
      pathSignToCheck = `${rutaCheck}/compartidos/${fileName.replace('.enc','.sign')}`;
      pathKeyToCheck = `${rutaCheck}/compartidos/${fileName.replace('.enc','.pubKey')}`;
      pathZipToCheck = `${rutaCheck}/compartidos/${fileName.replace('.enc','.zip')}`;
    }
    else{
      services.downloadSignature(fileName, user);
      pathSignToCheck = `${rutaCheck}/${fileName.replace('.enc','.sign')}`;
    }
    
    //Checkeo si se ha descomprimido el archivo no compartido
    if(owner.length == 0 && !fs.existsSync(`${rutaCheck}/${fileName.replace('.enc','.zip')}`)){
      crypto.decryptZip(`${ruta}/${fileName}`,`${ruta}/${fileName.replace('.enc','.json')}`,fileName.replace('.enc','')).then(response =>{
      });
    }
    //Verifico
    if(pathKeyToCheck.length != 0){
      holdBeforeThreeFilesExists(pathKeyToCheck, pathSignToCheck, pathZipToCheck, 100).then(result => {
        signify.verifySignature(fileName);
      });
    }else{
      holdBeforeBothFilesExists(pathSignToCheck, pathZipToCheck, 100).then(result => {
        signify.verifySignature(fileName);
      });
    }
  }).catch(error => console.log('Error ' + error));
}

function parseDate(date){
  var fecha = new Date(date);
  var dd = String(fecha.getDate()).padStart(2, '0');
  var mm = String(fecha.getMonth() + 1).padStart(2, '0');
  var yyyy = fecha.getFullYear();
  fecha = dd + '/' + mm + '/' + yyyy;
  return fecha;
}

ipcRenderer.on('actualizarVentana', async (event, args) => {
  fileName = args['nameFile'];
  let keyName = args['nameFile'].replace('.enc','.json');
  user = hashModule.userNameFromToken();

  var ruta = path.join(__dirname,`../encriptado/${user}`);
  var rutaDes = path.join(__dirname, "../desencriptado/" + user);
  //comprobamos si el archivo es compartido
  var isShared = false;
  getOwnerIfShared(fileName.replace(".enc", "")).then(owner => {
    if(owner.length != 0){ //Es compartido
      isShared = true;
      ruta = ruta + "/compartidos";
      rutaDes = rutaDes + "/compartidos";
    }

    crypto.decryptZip(ruta + "/" + fileName, ruta + "/" + keyName , fileName.replace(".enc", ""), isShared).then(response => {
      let data = fs.readFileSync(rutaDes + `/${fileName.replace('.enc','.zip')}`);
      zipLib.readMetadata(data).then(metadatos => {    
        document.getElementById('nombreArchivo').innerText = fileName;
        document.getElementById('nombreMeta').innerText = metadatos.nombre;
        document.getElementById('fechaMeta').innerText = parseDate(metadatos.fecha.toString());
        document.getElementById('descripcionMeta').innerText = metadatos.descripcion;

        let tabla = document.getElementById('tabla').querySelector('tbody');
        for(let key in metadatos){
          if(key !== 'nombre' && key !== 'fecha' && key !== 'descripcion'){
            tabla.innerHTML += `<tr>
            <td class="tipo">${key}</td>
            <td>${metadatos[key]}</td>
            </tr>`
          }
        }
    
        if(owner.length == 0)
          fs.unlinkSync(path.join(__dirname,`../desencriptado/${user}/${fileName.replace('.enc','.zip')}`));
      });
    });
  });
});