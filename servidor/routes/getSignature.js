'use strict'
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const {JsonDB} = require('node-json-db'); //Librería de json-db
const {Config} = require('node-json-db/dist/lib/JsonDBConfig'); //Configuración de json-db
const db = new JsonDB(new Config('newDb',true,true,'/')); //Creación de la db
const shared = new JsonDB(new Config('sharedFiles',true,true,'/'));

const router = express.Router();

router.post('/',(req,res)=>{
    let body = req.body;
    let data;
    db.reload();

    if(body.file && body.user){
        let decoded = jwt.decode(req.headers.authorization.split(' ')[1]);
        if(decoded.user == body.user){
            let filelist = db.getData(`/${body.user}/archivos`);
            
            for(let file of filelist){
                if(file.file == body.file){
                    res.download(path.join(__dirname,`../files/${decoded.user}/${body.file.replace('.enc','.sign')}`));
                }
            }
        }else{
            try{
                data = shared.getData(`/sharedFiles`);
            }catch(err){
                shared.push(`/sharedFiles`,[]);
                data = shared.getData(`/sharedFiles`);
            }

            let ownerUser = null;

            //console.log(body.user + ":" + body.file);
            for(let comp of data){
                if(comp.fileOwner == body.user && comp.file == body.file.replace('.enc', '')){
                    ownerUser = comp.fileOwner;
                    break;
                }
            }

            if(ownerUser != null){
                res.download(path.join(__dirname,`../files/${ownerUser}/${body.file.replace('.enc','.sign')}`));
            }else{
                res.json({
                    ok:false,
                    msg: 'Ha ocurrido un error'
                })
            }
        }
        

    }else{
        res.json({
            ok: false,
            msg: 'Faltan campos'
        });
    }
})

module.exports = router;