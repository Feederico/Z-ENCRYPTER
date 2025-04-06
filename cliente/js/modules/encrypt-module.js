const { Hash } = require("crypto");
var encrypt = require("cryptojs");
const fs = require("fs");
const toBuffer = require("blob-to-buffer");
const path = require('path');
const hashM = require('./hash-module.js');


//Función para convertir de WordArray con contenido binario a String tipificado
function convertWordArrayToUint8Array(wordArray) {
    var arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : [];
    var length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4;
    var uInt8Array = new Uint8Array(length), index=0, word, i;
    for (i=0; i<length; i++) {
        word = arrayOfWords[i];
        uInt8Array[index++] = word >> 24;
        uInt8Array[index++] = (word >> 16) & 0xff;
        uInt8Array[index++] = (word >> 8) & 0xff;
        uInt8Array[index++] = word & 0xff;
    }
    return uInt8Array;
}

//https://stackoverflow.com/questions/60520526/aes-encryption-and-decryption-of-files-using-crypto-js
//Ruta del zip a encriptar, luego se procede a borrar el zip no encriptado


/**
 * Función para el cifrado de un fichero tipo zip 
 * @param zip Ruta absoluta del fichero zip que se leera del disco y se procederá a cifrar
 * @param name Nombre del fichero resultante del cifrado
 * @returns Promesa que se resolverá si se ha realizado de manera correcta el cifrado
 */
function encryptZip(zip, name = "encrypted"){
    return new Promise(function (resolve,reject){
        try{
            let buffer = fs.readFileSync(zip, function(err, data) {
                if (err) {
                    return console.log(err);
                }
            });

            //Generamos la key y el iv aleatorio con dígitos hexadecimales
            let key = "";
            let hex = "0123456789abcdef";   //Dígitos hexadecimales posibles
            for(let i=0;i<32;i++){  //key
                let randomPos = Math.floor(Math.random()*hex.length);
                key += hex.charAt(randomPos);
            }
            let IV = "";
            for(let i=0;i<32;i++){  //iv
                let randomPos = Math.floor(Math.random()*hex.length);
                IV += hex.charAt(randomPos);
            }
            IV = CryptoJS.enc.Hex.parse(IV);
            key = CryptoJS.enc.Hex.parse(key);

            let reader = new FileReader();
            reader.onload = () => {
                //Cifrado del zip con la key e iv generados
                let wArray = CryptoJS.lib.WordArray.create(reader.result);
                let encrypted = CryptoJS.AES.encrypt(wArray,key,{iv:IV,mode:CryptoJS.mode.CBC,format:CryptoJS.format.Hex});
                let fileResult = new Blob([encrypted]);

                //Pasamos a buffer el cifrado para escribir en disco
                toBuffer(fileResult, function(err,buffer){
                    if(err)
                        console.log(err);
                    //JSON con la key y el iv (Usado para la función de descifrado)
                    let user =  hashM.userNameFromToken();
                    let propJSON = `{"key":"${encrypted.key}","iv":"${encrypted.iv}", "salt":"${encrypted.salt}"}`;

                    if(!fs.existsSync(path.join(__dirname,"../../encriptado/"+user))) //Si no existe la carpeta la crea
                        fs.mkdirSync(path.join(__dirname,"../../encriptado/"+user),true);
                    
                    fs.writeFileSync(path.join(__dirname,`../../encriptado/${user}/${name}.enc`),buffer);
                    fs.writeFileSync(path.join(__dirname,`../../encriptado/${user}/${name}.json`),propJSON);
                    resolve();
                });
            };
            reader.readAsArrayBuffer(new Blob([buffer]));
        }catch(error){
            reject(error);
        }
    })
}

/**
 * Función para descifrado de un fichero tipo .enc
 * @param enc Ruta absoluta del fichero cifrado que se leera del disco 
 * @param keyFile Ruta absoluta del fichero tipo JSON que contendrá la key y el iv 
 * @param name Nombre con el que se guardará el fichero descifrado en formato zip
 * @param isSharedFile Booleano que nos indica si el archivo a desencriptar es uno compartido (necesario para porder poner correctamente la ruta de guardado)
 * @returns Promesa que se resolverá cuando se haya realizado de manera correcta el descifrado
 */
function decryptZip(enc, keyFile, name, isSharedFile){
    return new Promise(function (resolve,reject){
        try{
            //Leemos el fichero cifrado
            let buffer = fs.readFileSync(enc, function(err, data) {
                if (err) {
                    return console.log(err);
                }
            });
            //Leemos el fichero .json con la key y el iv
            let keyBuffer = fs.readFileSync(keyFile, function(err, data) {
                if (err) {
                    return console.log(err);
                }
            });
            
            let reader = new FileReader();
            reader.onload = () => {
                //Parseamos a formato json y nos quedamos la key y el iv en wordArray hexadecimal
                let keyJSON = JSON.parse(keyBuffer);
                let key = CryptoJS.enc.Hex.parse(keyJSON.key);
                let iv = CryptoJS.enc.Hex.parse(keyJSON.iv);
                //Desciframos el zip y lo guardamos como array tipificado
                let decrypted = CryptoJS.AES.decrypt(reader.result,key,{iv:iv,mode:CryptoJS.mode.CBC,format:CryptoJS.format.Hex});
                let decoded = convertWordArrayToUint8Array(decrypted);
                let fileResult = new Blob([decoded]);
                
                //El zip lo escribimos como buffer en el destino
                toBuffer(fileResult, function(err,buffer){
                    if(err)
                        console.log(err);
                    
                    let user = hashM.userNameFromToken();
                    let ruta = isSharedFile ? path.join(__dirname, `../../desencriptado/${user}/compartidos`):
                                              path.join(__dirname, `../../desencriptado/${user}`);
                    if(!fs.existsSync(ruta)) {
                        fs.mkdirSync(ruta, {recursive:true});

                    } //Crea la carpeta desencriptado si no existe
                    
                    fs.writeFileSync(ruta + "/" + name + ".zip", buffer);
                    resolve();
                });
            };
            reader.readAsText(new Blob ([buffer]));
        } catch(error){
            reject(error);
        }
    });
}

/**
 * Cifrado de la clave del archivo con la clave del usuario
 * @param {String} key Clave del archivo en formato JSON
 */
function encryptKeys(key){
    let userDataKey = fs.readFileSync(path.join(__dirname,"../../keys/encryptFiles.key"),{encoding:'utf-8'});
    let encrypted = CryptoJS.AES.encrypt(key, userDataKey);  //Utilizar la key del usuario como una passphrase
    return encrypted.toString();
}

/**
 * Descifrado de la clave del archivo con la clave del usuario
 * @param {String} key Claves del archivo en formato JSON
 */
function decryptKeys(key){
    let userDataKey = fs.readFileSync(path.join(__dirname,"../../keys/encryptFiles.key"),{encoding:'utf-8'});
    let decrypted = CryptoJS.AES.decrypt(key, userDataKey);
    return CryptoJS.enc.Utf8.stringify(decrypted);
}

function encryptText(key,text){
    let encrypted = CryptoJS.AES.encrypt(text,key);
    return encrypted.toString();
}

function decryptText(key,text){
    let decrypted = CryptoJS.AES.decrypt(text,key);
    return CryptoJS.enc.Utf8.stringify(decrypted);
}

exports.encryptZip = encryptZip;
exports.decryptZip = decryptZip;
exports.encryptKeys = encryptKeys;
exports.decryptKeys = decryptKeys;
exports.encryptText = encryptText;
exports.decryptText = decryptText;

/*
function init(){
    let cifrar = document.querySelector("button#enc");
    let descifrar = document.querySelector("button#desenc");
    cifrar.addEventListener("click",function(ev){encryptZip("hola.zip","123412341234")});
    descifrar.addEventListener("click",function(ev){decryptZip("encrypted.enc","123412341234")});
}

document.addEventListener("DOMContentLoaded",init,false);
*/