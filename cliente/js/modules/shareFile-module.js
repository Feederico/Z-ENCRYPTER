'use strict'

const fs = require("fs");
const blobToBuffer = require('blob-to-buffer');
const path = require("path");
const hashM = require("./hash-module.js");
const services = require("./services");
const rsa = require("js-crypto-rsa");
const { file } = require("jszip");

const urlBase = "https://localhost:8443";

/**
 * @returns Devuelve los usuarios con la kFile encriptada con su clave pública
 * Este array: [{
 *  userName: "____",
 *  kFile: "____" -> encriptada con la clave pública del usuario
 * }, ]
 */
async function encryptKeysRSA(usersSharedWith, file) {
    //Json que contiene la kfile del archivo
    let fileOwner = hashM.userNameFromToken(); 
    let fileJson = require(path.join(__dirname, `../../encriptado/${fileOwner}/${file}`));

    //Clave aleatoria del archivo a compartir
    let keyFile = fileJson.key;
    let keyFileUint8Array = new TextEncoder("utf-8").encode(keyFile);

    //Array devuelto en el método
    let users = [];

    //Encriptamos las kFile con cada una de las claves públicas    
    for (var i = 0; i < usersSharedWith.length; i++) {
        let publicK = JSON.parse(usersSharedWith[i].publicKey);
    
        let encrypted = await rsa.encrypt(keyFileUint8Array, publicK, 'SHA-256');
        users.push({
            "userName": usersSharedWith[i].user,
            "kFile": encrypted
        });
    }

    return users;
}

/**
 * @param {Array de json que tiene la siguiente estructura:
 *         [{
 *              publicKey: "_______"
 *              user: "_______",
 *         }, ]
 * } usersSharedWith
 * @param {Nombre del archivo a compartir} file 
 */
async function shareFile (usersSharedWith, file) {
    let users = await encryptKeysRSA(usersSharedWith, file+".json");
    let token = fs.readFileSync(path.join(__dirname, '../../token.tk'));

    let opciones = {
        method: 'POST',
        body: JSON.stringify({users, file}),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    };

    return new Promise((resolve,reject)=>{
        fetch(urlBase+'/shareFile', opciones).then((res)=>res.json()).then((resJson)=>{
            if(resJson.ok)
                resolve("Campartición realizada con éxito");
            else
                reject("Error compartiendo los archivos"); 
        });
    });
}

/**
 * @returns Devuelve los archivos compartidos con el usuario que está logeado
 */
async function listSharedFiles () {
    let userLogged = hashM.userNameFromToken();
    let token = fs.readFileSync(path.join(__dirname, '../../token.tk'));
    let op = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };
    let res = await (await fetch(urlBase+`/sharedFileList/${userLogged}`, op)).json();

    if (res.ok) {
        if (res.sharedFiles.length !== 0) {
            return res.sharedFiles;
        } else {
            return [];
        }
    } else {
        window.alert(res.msg);
        return [];
    }
}

/**
 * @param {Archivo y propiertario, separado por -} fileAndOwner
 */
async function downloadSharedFile (file, fileOwner) {
    let token = fs.readFileSync(path.join(__dirname, '../../token.tk'));
    let userLogged = hashM.userNameFromToken();

    //Opciones para pasar al fecth
    let opciones = {
        method: 'POST',
        body: JSON.stringify({file, fileOwner}),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    let response = await (await fetch(`${urlBase}/downloadSharedFile`, opciones)).blob();
    let resToWriteJSON = await (await fetch(`${urlBase}/downloadSharedFile/key`, opciones)).json();
    blobToBuffer(response, (err, fileBuffer) => {
        if (err) {
            window.alert(err);
        }
        
        let ruta = path.join(__dirname, `../../encriptado/${userLogged}/compartidos`);
        if (!fs.existsSync(ruta)) {
            fs.mkdirSync(ruta, {recursive: true});
        }        
        fs.writeFileSync(`${ruta}/${file}`, fileBuffer);

        //Descargamos la key e iv necesarias para la desencriptación
        services.writeJsonEncFile(resToWriteJSON, file, userLogged, true);

    });
}

exports.shareFile = shareFile;
exports.listSharedFiles = listSharedFiles;
exports.downloadSharedFile = downloadSharedFile;