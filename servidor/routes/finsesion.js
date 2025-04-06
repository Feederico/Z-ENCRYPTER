'use strict'
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const logmodule = require('../modules/log-module.js');

const router = express.Router();

router.get('/',(req,res)=>{
    let token = req.headers.authorization.split(' ')[1];
    let decoded = jwt.decode(token);  
    logmodule.writeIntoLog(decoded.user, "/finsesion/", "Fin de la sesión");
    res.json({
        ok: "ok",
        msg: 'Fin de sesión'
    });
})

module.exports = router;