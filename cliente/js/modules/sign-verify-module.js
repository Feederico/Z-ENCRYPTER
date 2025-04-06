const rsa = require('js-crypto-rsa');
const fs = require('fs');
const { Console } = require('console');
const hashM = require('./hash-module.js');
const path = require('path');
const pathPrivateKey = '../../keys/privateKey.key';
const pathPublicKey = '../../keys/publicKey.key';

/**
 * signFile realiza la firma del zip después del proceso de creación del mismo, guardando la firma en la carpeta del usuario en sesión
 * @param {Nombre del zip sin extension que se va a firmar} file 
 */
function signFile(file){
  return new Promise((resolve, reject) => {
    //Hasheamos el zip
    var mensaje = hashM.hashZip(file + ".zip", "../../encriptado/");
    var contentPrivateKey = fs.readFileSync(path.join(__dirname, pathPrivateKey),{encoding:'utf-8'});
    var privateJwk = JSON.parse(contentPrivateKey);

    //Obtenemos el nombre del usuario del token
    let userName = hashM.userNameFromToken();
    
    //Realizamos la firma del file hasheado
    rsa.sign(
        mensaje,
        privateJwk,
        'SHA-256',
        {
          name: 'RSA-PSS', 
          saltLength: 64
        }
        ).then( (signature) => {
            if(!fs.existsSync(path.join(__dirname,"../../encriptado/"+userName))) //Si no existe la carpeta la crea
              fs.mkdirSync(path.join(__dirname,"../../encriptado/"+userName),true);
              
            var signatureName = file + '.sign';
            fs.appendFileSync(path.join(__dirname, '../../encriptado/' + userName + '/' + signatureName), Buffer.from(signature));     //Almaceno en /encriptado la firma de forma temporal
            resolve();
        }).catch((e)=> {
          //console.log("Ha sucedido un error al crear la firma: " + e);
          reject( "He fallado dentro de signFile, error: " + e);
        });
  });
}

/**
 * Funcion que realiza la validacion del archivo zip descargado despues de descifrar el archivo que lo contiene.
 * @param {Nombre del archivo zip que se va a validar, este debería encontrarse en /desencriptado/usuario/} file 
 */
function verifySignature(file){
    let userName = hashM.userNameFromToken();                                                               //Obtenemos el nombre del usuario del token
    var pathFolder = "../../desencriptado/" + userName + "/";
    var pathKey = "";
    var isFileShared = fs.existsSync(path.join(__dirname, pathFolder + "compartidos/" + file.replace(".enc", ".pubKey")));                                          //Si la clave pública esta en /desencriptado/usuario/ el fichero ha sido compartido
    if(isFileShared){                                                         
      pathKey = path.join(__dirname, pathFolder + "compartidos/" + file.replace(".enc", ".pubKey"));
      pathFolder = pathFolder + "compartidos/";
    }
    else{
      pathKey = path.join(__dirname, pathPublicKey);
    }
    var mensaje = hashM.hashZip(file.replace(".enc", ".zip"), pathFolder);                                                                //Hasheamos el zip "file"
    var signatureName = file.replace(".enc", '.sign');
    var signature = fs.readFileSync(path.join(__dirname, pathFolder + signatureName), null);  //Devuelve un array en Uint8array
    var publicJwk = JSON.parse(fs.readFileSync(pathKey, {encoding:'utf-8'}));   //obtenemos public key

    //verificamos el file con la clave publica y la signatura
    return rsa.verify(
        mensaje,
        signature,
        publicJwk,
        'SHA-256',
          { 
            name: 'RSA-PSS', 
            saltLength: 64                                                                                  // default is the same as hash length
          }
        ).then( (valid) => {
            if(valid){
                window.alert('El archivo zip descomprimido ha sido validado satisfactoriamente.');
            }
            else{
                window.alert('Atención, el archivo zip descomprimido diverge del zip original, firmado por el servidor.');
            }
    }).catch((e) => console.log("Ha sucedido un error al validar la firma: " + e));
}

exports.signFile = signFile;
exports.verifySignature = verifySignature;