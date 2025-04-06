'use strict'

require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const sharedFiles = new JsonDB(new Config('sharedFiles', true, true,'/'));

const router = express.Router();

function checkIfMainFieldDbExists () {
    try {
        let sFiles = sharedFiles.getData(`/sharedFiles`);
        if (sFiles) {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        return false;
    }
}

router.get('/:usuario', (req, res) => {
    let fileOwner = jwt.decode(req.headers.authorization.split(' ')[1]);
    let usuario = req.params.usuario;
    sharedFiles.reload();

    if (usuario) {
        if (!checkIfMainFieldDbExists()){
            sharedFiles.push('/sharedFiles', []);
            sharedFiles.reload();
        }
        
        let sFiles = sharedFiles.getData('/sharedFiles');
        let sFileFiltered = sFiles.filter(files => files.sharedWith === usuario);
        res.json({
            ok: true,
            sharedFiles: sFileFiltered,
            msg: 'Listado de usuarios realizado correctamente'
        });
    } else {
        res.json({
            ok: false,
            msg: 'El usuario no se ha introducido correctamente!'
        })
    }
});

module.exports = router;