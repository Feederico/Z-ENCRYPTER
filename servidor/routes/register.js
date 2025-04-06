'use strict'
require('../config/config');

const express = require('express');
const bcrypt = require('bcrypt');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));

const router = express.Router();

function checkExists(user){
    try{
        let data = db.getData(`/${user}`); //Intento obtener datos del usuario
        if(data)
            return true;
    }
    catch(err){ //La exepción salta si NO hay datos
        //console.log(err);
        return false;
    }
};

router.post('/',(req,res)=>{
    let body = req.body; //Extraigo información del body
    db.reload();
    
    if(body.user && body.pass){ //Compruebo que el body tiene usuario + contraseña
        if(!checkExists(body.user)){
            let salt = bcrypt.genSaltSync(10); //Genero la sal
            let hashP = bcrypt.hashSync(body.pass,salt) //Hasheo usando la sal
            
            //Guardo el usuario
            db.push(`/${body.user}/pass`,hashP); //Contraseña hasheada con sal
            db.push(`/${body.user}/salt`,salt); //Sal
            db.push(`/${body.user}/archivos`,[]); //Creo la lista de archivos
            db.push(`/${body.user}/publicKey`,body.publicKey);
            db.push(`/${body.user}/privateKey`,body.privateKey);

            //Actualizamos la base de datos
            db.reload();

            res.json({
                ok: true,
                user: body.user
            });
        }
        else{
            res.json({
                ok: false,
                msg: 'Usuario ya existente'
            });
        }
    }else{
        res.json({
            ok: false,
            msg: 'Faltan datos'
        });
    }
});

module.exports = router;