'use strict'
require('../config/config.js');

const express = require('express');
const fileUpload = require('express-fileupload'); //Librería para realizar uploads fáciles
const jwt = require('jsonwebtoken'); //JWT para poder coger el usuario del token
//const bodyParser = require("body-parser"); //Para que el POST acepte JSON
const fs = require("fs");   //Para escribir en disco
const logmodule = require("../modules/log-module.js");
//DB config
const {JsonDB} = require('node-json-db'); //Librería de json-db
const {Config} = require('node-json-db/dist/lib/JsonDBConfig'); //Configuración de json-db
const db = new JsonDB(new Config('newDb',true,true,'/')); //Creación de la db

const router = express.Router(); //Creo la ruta
router.use(fileUpload({
    limits: {fileSize:100*1024*1024},   //Límite de 100 MBytes
    createParentPath: true //Hago que express-fileupload cree la carpeta si no existe
}));
//router.use(bodyParser.json());  //Configuramos para que se acepten JSON


const DEBUG_MODE = false;    //PONER A FALSE PARA QUITAR LOS CONSOLE.LOGS DEL SERVIDOR

router.post('/', (req,res)=>{
    let token = req.headers.authorization.split(' ')[1]; //Cojo el token, para conseguir el usuario
    let decoded = jwt.decode(token);
    try{
        if(!req.files){ //Si no hay ficheros doy un error
            logmodule.writeIntoLog(decoded.user, 'POST /upload/', "No files uploaded");
            res.json({
                ok: false,
                msg: 'No files uploaded'
            });
        }else{
            let fileEnc = req.files.fileData; //Usar nombre del input para subir archivos
            let fileKey = req.files.fileKey;
            let fileSignature = req.files.fileSignature;

            //let token = req.headers.authorization.split(' ')[1]; //Cojo el token, para conseguir el usuario
            //let decoded = jwt.decode(token);

            //Guardamos el .enc en el disco
            if(DEBUG_MODE)
                console.log(`Guardando nuevo fichero para el usuario ${decoded.user}...`);
            fileEnc.mv("./files/" + decoded.user + "/" + fileEnc.name);
            let jsonKey = JSON.parse(fileKey.data);
            //Guardamos el .sign en el disco
            if(DEBUG_MODE)
                console.log(`Guardando la firma del nuevo fichero para el usuario ${decoded.user}...`);
            fileSignature.mv("./files/" + decoded.user + "/" + fileSignature.name);


            //Registramos el nuevo file en el json con su key e iv, y su firma
            if(DEBUG_MODE)
                console.log("Registrando...");
            db.reload();    //Si hay cambio en el jsonBD se actualiza
            let archivos = db.getData(`/${decoded.user}/archivos`); //Cojo la lista de archivos del usuario
            let json = {"file":fileEnc.name,"key":jsonKey.key,"iv":jsonKey.iv, "signature":fileSignature.name}; //nueva entrada

            //Si hay un fichero con el mismo nombre, actualiza este por el nuevo
            let change = false;
            for(let i=0;i<archivos.length;i++){
                if(archivos[i].file == fileEnc.name){
                    archivos[i] = json;
                    change = true;
                    break;
                }
            }
            if(!change) //Si es nuevo se agrega al final del array
                archivos.push(json);

            db.push(`/${decoded.user}/archivos`,archivos); //Guardo los cambios
            db.reload();
            logmodule.writeIntoLog(decoded.user, 'POST /upload/', "Ficheros: " + fileEnc.name + ", " + fileKey.name + ", " + fileSignature.name + ". Fichero subido con éxito!");
            res.send({
                ok: true,   
                msg: 'File uploaded'
            });
            if(DEBUG_MODE)
                console.log("Fichero subido con éxito!\n");
        }
    }catch(err){ //Si pasa algo raro, devuelvo el error
        logmodule.writeIntoLog(decoded.user, 'POST /upload/', "Error: " + err);
        res.json({
            ok: false,
            msg: err
        });
    }
});

module.exports = router;