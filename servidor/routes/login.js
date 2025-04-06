'use strict'
require('../config/config');

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));
const logmodule = require('../modules/log-module.js');

const router = express.Router();

/*
    El json que hay que pasarle es:
    {
        user: ,
        pass:
    }
*/
router.post('/',(req,res)=>{
    let body = req.body; //Guardo la info del body
    db.reload();
    if(body.user && body.pass){
        try{
            let datos = db.getData(`/${body.user}`);
            if(bcrypt.compareSync(body.pass,datos.pass)){

                //Creación del token
                let token = jwt.sign({
                    user: body.user //En el token metemos el usuario
                },process.env.JWT_SECRET, //Usamos el 'secreto'
                {
                    expiresIn: process.env.CADUCIDAD_TOKEN //Le añadimos una caducidad
                });

                logmodule.writeIntoLog(body.user, '/login/', "Inicio de sesión exitoso.");
                res.json({
                    ok: true,
                    user: body.user,
                    publicKey: datos.publicKey,
                    privateKey: datos.privateKey,
                    token
                });
            }
            else{
                logmodule.writeIntoMainLog(body.user, '/login/', "Datos incorrectos en el inicio de sesión. Datos introducidos: " + body.user + "/pass:" + body.pass);
                res.json({
                    ok:false,
                    msg: 'Datos incorrectos'
                });
            }
        }catch(e){
            logmodule.writeIntoMainLog(body.user, '/login/', "Datos incorrectos en el inicio de sesión. Datos introducidos: " + body.user + "/pass:" + body.pass + " Error: " + e);
            res.json({
                ok:false,
                msg: 'Datos incorrectos'
            });
        }
    }
    else{
        logmodule.writeIntoMainLog(body.user, '/login/', "Datos incorrectos en el inicio de sesión. Datos introducidos: " + body.user + "/pass:" + body.pass);
        res.json({
            ok:false,
            msg: 'Datos incorrectos'
        })
    }
});

module.exports = router;