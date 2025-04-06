'use strict'
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const { fstat } = require('fs');
const logmodule = require('../modules/log-module.js');
const db = new JsonDB(new Config('newDb',true,true,'/'));

const router = express.Router();

router.post('/file', (req,res)=>{
    let token = req.headers.authorization.split(' ')[1];
    let decoded = jwt.decode(token);
    let body = req.body;

    if(!body.file){
        logmodule.writeIntoLog(decoded.user, 'GET /download/file/' + "¿?", "No file provided");
        res.json({
            ok:false,
            msg: 'No file provided'
        });
    }else{
        db.reload();
        let files = db.getData(`/${decoded.user}/archivos`);
        let found = files.findIndex(element => element.file === body.file);
        if(found !== -1){
            res.download(path.join(__dirname, `../files/${decoded.user}/${body.file}`));
            logmodule.writeIntoLog(decoded.user, 'GET /download/file/' + body.file, "Fichero descargado con éxito");
        }else{
            logmodule.writeIntoLog(decoded.user, 'GET /download/file/' + body.file, "Inexistent file");
            res.json({
                ok: false,
                msg: 'Inexistent file'
            })
        }
    }
});

router.post('/key', (req, res) => {
    let token = req.headers.authorization.split(' ')[1];
    let decoded = jwt.decode(token);
    let body = req.body;
    db.reload();

    if(!body.file){
        logmodule.writeIntoLog(decoded.user, 'GET /download/key/' + "¿?", "No file provided");
        res.json({
            ok:false,
            msg: 'No file provided'
        });
    }else{
        let files = db.getData(`/${decoded.user}/archivos`);
        let found = files.findIndex(element => element.file === body.file);
        if (found !== -1) {
            let key = files[found].key;
            let iv  = files[found].iv;
            logmodule.writeIntoLog(decoded.user, 'GET /download/key/' + body.file, "Clave y vector iv obtenidos con éxito");
            res.json({
                ok: true,
                iv,
                key
            });
        } else {
            logmodule.writeIntoLog(decoded.user, 'GET /download/key/' + body.file, "No se han podido descargar la key e iv");
            res.json({
                ok: false,
                msg: 'No se han podido descargar la key e iv'
            })
        }
    }
});

module.exports = router;