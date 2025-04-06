'use strict'
require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');

const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));

const router = express.Router();

/**
 * Descargar un archivo compartido dado
 */
router.post('/', (req, res) => {
    let fileOwner  = req.body.fileOwner;
    let file = req.body.file;
    db.reload();

    if (file && fileOwner) {
        let files = db.getData(`/${fileOwner}/archivos`);
        let found = files.findIndex(element => element.file === file);

        if(found !== -1) {
            res.download(path.join(__dirname, `../files/${fileOwner}/${file}`));
        } else {
            res.json({
                ok: false,
                msg: 'El archivo no existe'
            });
        }
    } else {
        res.json({
            ok: false,
            msg: 'No se han introducido correctamente los parametros'
        });
    }
});

/**
 * Endpoint para descargar key e iv de un archivo compartido
 */
router.post('/key', (req, res) => {
    let file = req.body.file;
    let fileOwner = req.body.fileOwner;
    db.reload();

    if (file && fileOwner) { 
        let files = db.getData(`/${fileOwner}/archivos`);
        let found = files.findIndex(element => element.file === file);

        if (found !== -1) {
            let key = files[found].key;
            let iv  = files[found].iv;

            res.json({
                ok: true,
                iv,
                key
            });
        } else {
            res.json({
                ok: false,
                msg: 'No se han podido descargar la key e iv'
            })
        }
    }
});

module.exports = router;