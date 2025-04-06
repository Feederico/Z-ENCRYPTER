'use strict'
require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/',(req,res)=>{
    if(!req.headers.authorization){
        res.send({
            ok:false,
            msg: 'No token provided'
        });
    }else{
        let token = req.headers.authorization.split(' ')[1];
        jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
            if(err){
                res.send({
                    ok: false,
                    msg: 'Invalid token'
                });
            }else{
                res.send({
                    ok: true,
                    msg: 'Valid token'
                });
            } 
        })
    }
});

module.exports = router;