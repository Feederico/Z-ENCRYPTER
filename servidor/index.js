'use strict'
/////////////////////////////////////
//// Todas las configuraciones     //
//// estan con el nombre:          //
//// process.env.ALGO donde ALGO   //
//// es la configuración           //
/////////////////////////////////////
require('./config/config.js');

//Librerías
const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

/////////////////////////////////////
//// Obtener timestamp en segundos //
//// para checkear el token        //
//// Date.now() / 1000 | 0         //
/////////////////////////////////////

//Inicialización
const app = express();
app.use(bodyParser.urlencoded({extended:false})); //Parsear application/x-www-form-urlencoded
app.use(bodyParser.json()); //Parsear application/json

//Middleware para comprobar si la petición lleva token, y si es correcto
const checkToken = express.Router(); //Creo la ruta del middleware
checkToken.use((req,res,next)=>{
   const token = req.headers.authorization; //Recojo el token
   if(token){ //Compruebo si existe
       jwt.verify(token.split(' ')[1],process.env.JWT_SECRET,(err,decoded)=>{ //Se comprueba
           if(decoded){
               if(err){ //Si no vale
                   res.json({
                       ok: false,
                       msg: 'No autorizado'
                   });
               }
               let time = Date.now() / 1000 | 0;
               if(decoded.exp < time){ //Si ha expirado
                   res.json({
                       ok: false,
                       msg: 'Token expirado'
                   });
               }
               next(); //Si lo de antes no falla, sigue (autoriza)
           }
           else{
               res.json({
                   ok: false,
                   msg: 'No autorizado'
               });
           }
       });
   }
   else{
       res.json({ //Pase lo que pase que no sea correcto, no autoriza
           ok: false,
           msg: 'No autorizado'
       });
   }
});

//Importo las rutas que vamos a usar
app.use('/login',require('./routes/login')); //Ruta de login
app.use('/register',require('./routes/register')); //Ruta de registro
app.use('/upload',checkToken,require('./routes/upload')); //Ruta para subir ficheros, requiere un token válido
app.use('/delete',checkToken,require('./routes/deleteFile')); //Ruta para borrar ficheros, requiere un token válido
app.use('/list',checkToken,require('./routes/fileList')); //Ruta para obtener la lista de ficheros que tengo subidos
app.use('/download',checkToken,require('./routes/downloadFile'));
app.use('/userList', checkToken, require('./routes/userList')); //Ruta para obtener la lista de usuarios con sus respectivas claves públicas
app.use('/shareFile', checkToken, require('./routes/shareFile'));
app.use('/sharedFileList', checkToken, require('./routes/sharedFileList'));
app.use('/downloadSharedFile', checkToken, require('./routes/downloadSharedFile'));
app.use('/checktoken',require('./routes/checkToken'));
app.use('/getsignature',require('./routes/getSignature')); //Ruta para obtener la firma de un archivo compartido
app.use('/getpublickey', require('./routes/getPubKey'));  //Ruta para obtener la public key de un usuario
app.use('/finsesion', checkToken, require('./routes/finsesion'));  //Ruta para registrar en los logs el fin de sesión

//Creo el servidor con HTTPS
https.createServer({
    key: fs.readFileSync('./cert/my_cert.key'), //Le paso como opción la Kprivada
    cert: fs.readFileSync('./cert/my_cert.crt') //como otra opción el certificado (autofirmado)
},app).listen(process.env.PORT, ()=>{ //Uso listen como siempre, para que escuche
    console.log(`HTTPS escuchando en ${process.env.PORT}`);
});

