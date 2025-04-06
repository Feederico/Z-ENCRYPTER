'use strict'
require('../config/config');

const express = require('express');
const jwt = require('jsonwebtoken');

//DB config
const {JsonDB} = require('node-json-db');
const {Config} = require('node-json-db/dist/lib/JsonDBConfig');
const db = new JsonDB(new Config('newDb',true,true,'/'));

const router = express.Router();

//Devuelve una array con pares de valor con user y la key pública de cada uno
function getUsers(ownUser){
    db.reload();
    let dbJson = db.getData("/");
    let listUsers = [];
    for(let user in dbJson){    //El for..in asigna a'user' el nombre de cada propiedad del objeto dbJson
        if(user!=ownUser){
            let userAndKey = {user:user, publicKey:dbJson[user].publicKey};
            listUsers.push(userAndKey);
        }
    }
    return listUsers;
}

router.get("/", (req,res) => {
    let token = req.headers.authorization;
    let decoded = jwt.decode(token.split(' ')[1]);
    let users = getUsers(decoded.user);
    res.json({
        ok:true,
        users: users
    });
})

module.exports = router;