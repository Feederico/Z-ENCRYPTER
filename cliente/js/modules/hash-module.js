'use-strict'
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');

//Función para rescatar el nombre del usuario del token
function userNameFromToken(){
    return jwt.decode(fs.readFileSync(path.join(__dirname,"../../token.tk"),{encoding:'utf-8'})).user;
}

async function hashPassAndObtainKeys (pass) {
    let hash = crypto.createHash('sha512');
    let dataPass = hash.update(pass, 'utf-8');
    let hashPass = dataPass.digest('hex');
   
   /*
       Al servidor mandamos la primera mitad de la constraseña hasheada, 
       la otra se usará para encriptar los arhivos.
   */
    let keyLogin = hashPass.slice(0, hashPass.length/2);
    let keyEncrypt = hashPass.slice(hashPass.length/2, hashPass.length);

    return [keyLogin, keyEncrypt];
}

/**
 * Función que hace un hash SHA256 del zip pasado por parámetro
 * @param {String con el nombre del zip a hashear} zip 
 * @param {String con la ruta a la carpeta que contiene el zip} pathFolder
 */
function hashZip(zip, pathFolder){
    let pathZip = path.join(__dirname, pathFolder + zip);
    
    let fileBuffer = fs.readFileSync(pathZip);
    let hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    const hex = hash.digest('hex');
    var hashedZip = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
    }))
    return hashedZip;
}

exports.hashPassAndObtainKeys = hashPassAndObtainKeys;
exports.userNameFromToken = userNameFromToken;
exports.hashZip = hashZip;