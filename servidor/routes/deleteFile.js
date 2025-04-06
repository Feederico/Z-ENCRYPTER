'use strict'
require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));
const sharedDB= new JsonDB(new Config('sharedFiles',true,true,'/'));

const router = express.Router();

router.post('/', (req,res)=>{
    //Cojo info del body
    let body = req.body;
    //Si no está el campo 'file' doy error
    if(!body.file){
        res.json({
            ok: false,
            msg: 'No file provided'
        });
    }else{
        db.reload();
        sharedDB.reload();
        //Cojo el token para utilizar el usuario
        let token = req.headers.authorization;
        //Uso verify para obtener la información del token
        let decoded = jwt.decode(token.split(' ')[1]);
        let user = decoded.user; //El usuario, que viene del token
        
        let files = db.getData(`/${user}/archivos`); //Recupero sus archivos de la BD
        let found = files.findIndex(element => element.file === body.file); //Busco el archivo en la lista
        
        //Si el archivo existe, lo borro
        if(found !== -1){
            files.splice(found,1);
            db.push(`/${user}/archivos`,files);
            db.reload();
            fs.unlinkSync(path.join(__dirname,`../files/${decoded.user}/${body.file}`));

            //Eliminar el registro compartición del file con todos los usuarios
            let shared = sharedDB.getData("/sharedFiles");
            for(let i=0;i<shared.length;i++){
                if(shared[i].file == body.file.split(".enc")[0] && shared[i].fileOwner == user){
                    shared.splice(i,1);
                    i--;
                }
            }
            sharedDB.push("/sharedFiles",shared);
            sharedDB.reload();

            res.json({
                ok: true,
                msg: `Borrado: ${body.file}`
            });
        }else{ //Si no existe, doy un error
            res.json({
                ok: false,
                msg: 'Inexistent file'
            });
        }
    }
});

module.exports = router;