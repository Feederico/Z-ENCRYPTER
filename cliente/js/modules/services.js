const blobToBuffer = require('blob-to-buffer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const {ipcRenderer} = require("electron");
const crypto = require('./encrypt-module.js');
const hashM = require('./hash-module.js');


//Servicio con la API para subir el fichero cifrado y su json respectivo
function sendFile(fileName){
    return new Promise((resolve, reject) => {
        let pathToToken = path.join(__dirname,"../../token.tk");
        let token = fs.readFileSync(pathToToken);
        let user = hashM.userNameFromToken();

        let pathToFile = path.join(__dirname,"../../encriptado/"+ user + "/" + fileName +".enc");
        let pathToSignature = path.join(__dirname,"../../encriptado/"+ user + "/" + fileName +".sign");
        let pathToKey = path.join(__dirname,"../../encriptado/"+ user + "/" + fileName +".json");
    
        let fileFormData = new FormData();  //Objeto con los files enviado en el body
        let buffer = fs.readFileSync(pathToFile);
        let buffer2 = fs.readFileSync(pathToSignature);
        let keyJSON = JSON.parse(fs.readFileSync(pathToKey));
        

        //Ciframos la clave del archivo que vamos a subir con la clave de datos del usuario
        keyJSON.key = crypto.encryptKeys(keyJSON.key);

        fileFormData.append("fileData",new Blob([buffer]),fileName + ".enc");
        fileFormData.append("fileKey",new Blob([JSON.stringify(keyJSON)]),fileName + ".json");
        fileFormData.append("fileSignature", new Blob([buffer2]), fileName + ".sign");
    
        console.log("Enviando...");
        fetch("https://localhost:8443/upload", {
            method:"POST",
            headers:{
            "Authorization":"Bearer " + token,
            //"Content-Type":"multipart/form-data"
            },
            body: fileFormData
        })
        .then(response => response.json()).then((response) => {
            if(response.ok){
                resolve("Fino");
            }
            else{
                //throw new Error(response.msg);
                reject(response.msg);
            }
        })
        .catch((error) => console.log("Ha sucedido un error" + error));
    })
}

//Petición a la API para listar ficheros cifrados en el servidor
async function listFiles(){
    let url = "https://localhost:8443/list";

    let rutaToken = path.join(__dirname, "../../token.tk");
    let token = "Bearer " + fs.readFileSync(rutaToken,{encoding:'utf8',flag:'r'}).replace(/["']/g, "");

    let opciones = {
        headers: {
            authorization: token,
        }
    };

    return await fetch(url, opciones);
}

async function listUsers(){
    let url = "https://localhost:8443/userList";

    let rutaToken = path.join(__dirname, "../../token.tk");
    let token = "Bearer " + fs.readFileSync(rutaToken,{encoding:'utf8',flag:'r'}).replace(/["']/g, "");

    let opciones = {
        headers: {
            authorization: token,
        }
    };
    
    return fetch(url, opciones).then((res)=>res.json()).then((resJson)=>{
        if(resJson.ok){
            return resJson.users;
        } else {
            return "error occurred";
        }
   });
}


/**
 * 
 * @param {*} archivo 
 * @param {*} nombreUsuario 
 * @param {*} fileName 
 * Funcion de apoyo para la descarga del fichero
 */
function writeEncFile (archivo, nombreUsuario, fileName) {
    let rutaDescarga = path.join(__dirname, '../../encriptado');

    if (!fs.existsSync(rutaDescarga))
        fs.mkdirSync(rutaDescarga);

    if (!fs.existsSync(rutaDescarga+`/${nombreUsuario}`))
        fs.mkdirSync(rutaDescarga+`/${nombreUsuario}`);

    fs.writeFileSync(rutaDescarga+`/${nombreUsuario}/${fileName}`, archivo);
}

function writeJsonEncFile(response, fileName, nombreUsuario, isSharedFile) {
    let keyDecrypt = crypto.decryptKeys(response.key);
    let keyIv = {key: keyDecrypt, iv: response.iv};
    
    //Le cambiamos la extension a json (este archivo contendra la key e iv)
    fileName = fileName.replace('.enc', '.json');
    
    let rutaDescarga = isSharedFile ? path.join(__dirname, `../../encriptado/${nombreUsuario}/compartidos/${fileName}`):
                                      path.join(__dirname, `../../encriptado/${nombreUsuario}/${fileName}`);
    fs.writeFileSync(rutaDescarga, JSON.stringify(keyIv));

    //Actualizamos la página principal
    window.alert('Archivo descargado satisfactoriamente');
    ipcRenderer.send('refreshMainPage');
}

/**
 * 
 * @param {Nombre del archivo a descargar} fileName 
 */
function downloadFile (fileName) {
    let url = "https://localhost:8443/download";
    let rutaToken = path.join(__dirname, '../../token.tk');

    return new Promise((resolve, reject) => {
        fs.readFile(rutaToken, (err, token) => {
            if (err)
                throw err;
            
            let nombreArchivo = JSON.stringify({file: fileName});
            let decoded = jwt.decode(token);
            let nombreUsuario = decoded.user;
            let opciones = {
                method: 'POST',
                body: nombreArchivo,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            }
            fetch(url+'/file', opciones)
            .then(res => res.blob())
            .then(responseBlob => {
                blobToBuffer(responseBlob, (err, archivo) => {
                    if (err) throw err;
                    
                    //Escribimos el archivo en disco
                    writeEncFile(archivo, nombreUsuario, fileName);

                    fetch(url+'/key', opciones)
                    .then(res => res.json())
                    .then(response => {writeJsonEncFile(response, fileName, nombreUsuario, false);})
                    .catch(error => console.log('Error ' + error))
                });
            })
            .catch(error => console.log('Error ' + error));
        });
    });
}

//Petición a la API para obtener la publicKey de un usuario en el servidor
async function getPublicKey(user){
    let url = "https://localhost:8443/getpublickey";

    let rutaToken = path.join(__dirname, "../../token.tk");
    let token = "Bearer " + fs.readFileSync(rutaToken,{encoding:'utf8',flag:'r'}).replace(/["']/g, "");
    let usernameJson = JSON.stringify({username: user});
    let opciones = {
        method: 'POST',
        headers: {
            authorization: token,
            "Content-Type": "application/json"
        },
        body: usernameJson
    };

    return await fetch("https://localhost:8443/getpublickey", opciones);
}

/**
 * Obtiene la firma y la almacena en local
 * @param {*} fileName 
 * @param {*} owner 
 * @returns 
 */
function downloadSignature(filename, owner){
    let url = "https://localhost:8443/getSignature";
    let rutaToken = path.join(__dirname, '../../token.tk');

    return new Promise((resolve, reject) => {
        fs.readFile(rutaToken, (err, token) => {
            if (err)
                throw err;
            
            let fileAndOwner = JSON.stringify({file: fileName, user: owner});
            let decoded = jwt.decode(token);
            let nombreUsuarioSesion = decoded.user;
            let opciones = {
                method: 'POST',
                body: fileAndOwner,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            }
            fetch(url, opciones)
            .then(res => res.blob())
            .then(responseBlob => {
                blobToBuffer(responseBlob, (err, archivo) => {
                    if (err) throw err;
                    
                    //Escribimos la firma en disco
                    let rutaDescarga = path.join(__dirname, '../../desencriptado');
                    fs.writeFileSync(rutaDescarga+`/${nombreUsuarioSesion}/` + fileName.replace('enc', 'sign'), archivo);
            })
            }).catch(error => console.log('Error ' + error));;
        });
    });
}

/**
 * Escribe en local la Kpub y la firma dado un nombre de fichero compartido y su propietario
 * @param {Nombre del archivo a descargar} fileName 
 * @param {Nombre del usuario del archivo a descartar} owner
 */
 function downloadSignatureOfOwner (fileName, owner) {
    let url = "https://localhost:8443/getSignature";
    let rutaToken = path.join(__dirname, '../../token.tk');

    return new Promise((resolve, reject) => {
        fs.readFile(rutaToken, (err, token) => {
            if (err)
                throw err;
            
            let fileAndOwner = JSON.stringify({file: fileName, user: owner});
            let decoded = jwt.decode(token);
            let nombreUsuarioSesion = decoded.user;
            let opciones = {
                method: 'POST',
                body: fileAndOwner,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                }
            }
            fetch(url, opciones)
            .then(res => res.blob())
            .then(responseBlob => {
                blobToBuffer(responseBlob, (err, archivo) => {
                    if (err) throw err;
                    
                    //Escribimos la firma en disco
                    let rutaDescarga = path.join(__dirname, '../../desencriptado');
                    fs.writeFileSync(rutaDescarga+`/${nombreUsuarioSesion}/compartidos/` + fileName.replace('enc', 'sign'), archivo);

                    getPublicKey(owner).then(res=> res.json())
                    .then(response=>{
                        if (response["ok"] == true){
                            var pK = response["publicKey"];
                            //Escribimos la clave publica en disco
                            fs.writeFileSync(path.join(__dirname,'../../desencriptado/' + nombreUsuarioSesion + '/compartidos/' + fileName.replace('enc', 'pubKey')), pK);
                        } else {
                            console.log("Error al escribir el public key del archivo compartido");
                        }
                    })
                    .catch(error => console.log('Error: ', error));
                    
            })
            }).catch(error => console.log('Error ' + error));;
        });
    });
}

//Petición a la API para saber si el usuario está loggeado
function isLogged(){
    let url = "https://localhost:8443/checkToken/";
    let ruta = path.join(__dirname, '../../token.tk');
    
    return new Promise(function(resolve,reject){
        fs.readFile(ruta, (err, data) => {
            if (err) {
                reject();
            } else {
                //Quitamos las comillas al token
                let token = data.toString();
                let opciones = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                };
    
                fetch(url, opciones)
                .then(res => res.json())
                .then(response => {
                    if(response["ok"]) {
                        resolve();
                    } else {
                        reject();
                    }
                })
                .catch(error => console.log('Error: ', error));
            }
        });
    })
}

async function deleteFile(fileName){
    let url = "https://localhost:8443/delete";

    let rutaToken = path.join(__dirname, "../../token.tk");
    let token = "Bearer " + fs.readFileSync(rutaToken,{encoding:'utf8',flag:'r'}).replace(/["']/g, "");
    let decoded = jwt.decode(token.split(' ')[1]);
    let user = decoded.user;
    
    let trouble = false; 
    if(fs.existsSync(path.join(__dirname,`../../encriptado/${user}/${fileName}`))){
        try{
            fs.rmSync(path.join(__dirname,`../../encriptado/${user}/${fileName}`));
            fs.rmSync(path.join(__dirname,`../../encriptado/${user}/${fileName.replace("enc","json")}`));
            fs.rmSync(path.join(__dirname,`../../encriptado/${user}/${fileName.replace("enc","sign")}`));
        } catch(e){
            trouble=true;
        }
    }

    let opciones = {
        body: JSON.stringify({file:fileName}),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        }        
    };
    return await fetch(url, opciones).then(res=>res.json()).then(response=>{
        if(trouble){
            return "Problema borrando el archivo de manera local, revise de manera manual el fichero en la carpeta encriptado";
        } else{
            return response.msg;
        }
    }).catch((e)=>e);
}

exports.isLogged = isLogged;
exports.listFiles = listFiles;
exports.sendFile = sendFile;
exports.downloadFile = downloadFile;
exports.listUsers = listUsers;
exports.getPublicKey = getPublicKey;
exports.downloadSignatureOfOwner = downloadSignatureOfOwner;
exports.writeJsonEncFile = writeJsonEncFile;
exports.deleteFile = deleteFile;
exports.downloadSignature = downloadSignature;
