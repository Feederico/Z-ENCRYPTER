'use strict'
const {ipcRenderer} = require("electron");
const hash = require("../js/modules/hash-module.js");
const encryptModule = require('../js/modules/encrypt-module');
const path = require("path");
const fs = require("fs");

function cancelLogin() {
    ipcRenderer.send('closeChildWindow');
}

function goToRegister() {
    ipcRenderer.send('closeChildWindow');
    ipcRenderer.send('openRegisterWindow');
}

function errorHtml() {
    let nombre = document.getElementById("user");
    let pass = document.getElementById("pass");

    nombre.classList.add("error");
    nombre.value = "";

    pass.classList.add("error");
    pass.value = "";

    let divError = document.createElement('div');
    divError.classList.add("bar", "errorBar");
    divError.appendChild(document.createTextNode("La contraseña y/o usuario son incorrectos"));

    let containerInputs = document.querySelector(".container");
    containerInputs.prepend(divError);
}

async function login() {
    let passw = document.getElementById("pass").value;
    //keys[0] es la key del login
    let keys = await hash.hashPassAndObtainKeys(passw);
    let keyLogin = keys[0];
    let keyEncrypt = keys[1];

    let url = "https://localhost:8443/login/";
    let usuario = {
        user: document.getElementById("user").value,
        pass: keyLogin
    };
    let opciones = {
        method: 'POST',
        body: JSON.stringify(usuario),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    fetch(url, opciones)
    .then(res => res.json())
    .then(response => {
        if (response.ok) {
            if(!fs.existsSync(path.join(__dirname, "../keys")))
                fs.mkdirSync(path.join(__dirname, "../keys"));
            //Guardamos el token en la raíz para comprobar la validez del usuario
            let ruta = path.join(__dirname, "../token.tk");
            fs.writeFileSync(ruta,response["token"]);

            //Clave de cifrado del usuario loggeado
            fs.writeFileSync(path.join(__dirname,'../keys/encryptFiles.key'), keyEncrypt);
            //Claves pública y privada del usuario loggeado
            fs.writeFileSync(path.join(__dirname,'../keys/publicKey.key'),response["publicKey"])
            fs.writeFileSync(path.join(__dirname,'../keys/privateKey.key'),encryptModule.decryptKeys(response["privateKey"]));
            
                
            ipcRenderer.send('closeChildWindow');
            ipcRenderer.send('refreshMainPage');
        } else {
            errorHtml();
        }
    })
    .catch(error => console.log('Error: ', error));
}