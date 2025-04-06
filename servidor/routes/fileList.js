'use strict'
require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));

const router = express.Router();

router.get('/', (req,res)=>{
    let token = req.headers.authorization;
    let decoded = jwt.decode(token.split(' ')[1]);
    db.reload();
    let files = db.getData(`/${decoded.user}/archivos`);
    res.json({
        ok:true,
        archivos: files
    });
});

module.exports = router;