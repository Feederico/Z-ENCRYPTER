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

router.post('/', (req, res) => {
    let fileOwner = jwt.decode(req.headers.authorization.split(' ')[1]);
    let users = req.body.users;
    let file = req.body.file;

    if (!checkIfMainFieldDbExists())
        sharedFiles.push('/sharedFiles', []);
    sharedFiles.reload();
    let sharedArray = sharedFiles.getData('/sharedFiles');

    if (users && file) {
        for (var i = 0; i < users.length; i++) {
            sharedArray.push({
                "fileOwner": fileOwner.user,
                "sharedWith": users[i].userName,
                "kFile": JSON.stringify(users[i].kFile),
                file
            });
        }
        sharedFiles.push("/sharedFiles",sharedArray,true);
        sharedFiles.reload();
        res.json({
            ok: true,
            msg: 'Compartición realizada correctamente'
        });
    } else {
        res.json({
            ok: false,
            msg: 'Faltan datos'
        });
    }
});

module.exports = router;