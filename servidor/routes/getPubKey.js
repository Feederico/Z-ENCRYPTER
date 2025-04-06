'use strict'
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const {JsonDB} = require('node-json-db'); //Librería de json-db
const {Config} = require('node-json-db/dist/lib/JsonDBConfig'); //Configuración de json-db
const { count } = require('console');
const db = new JsonDB(new Config('newDb',true,true,'/')); //Creación de la db

const router = express.Router();

router.post('/',(req,res)=>{
    let body = req.body;
    db.reload();
    
    if(body.username){
        let user = body.username;
        let pKey = db.getData(`/${user}/publicKey`);
        res.json({
            ok: true,
            publicKey: pKey
        });
    }else{
        res.json({
            ok: false,
            msg: 'Faltan campos'
        });
    }
})

module.exports = router;