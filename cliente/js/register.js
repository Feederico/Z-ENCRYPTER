'use strict'
const {ipcRenderer} = require("electron");
const fs = require("fs");
const path = require("path");
const hash = require("../js/modules/hash-module.js");
const login = require("../js/login.js");
const cryptorsa = require('js-crypto-rsa');
const encryptModule= require('../js/modules/encrypt-module');

function errorHtml (mensajeError) {
    let nombre = document.getElementById("user");
    let pass = document.getElementById("pass");

    nombre.classList.add("error");
    nombre.value = "";

    pass.classList.add("error");
    pass.value = "";

    let divError = document.createElement('div');
    divError.classList.add("bar", "errorBar");
    divError.appendChild(document.createTextNode(mensajeError));

    let containerInputs = document.querySelector(".container");
    containerInputs.prepend(divError);
}

async function registerServer(keyLogin) {
    //Hacemos la petición al servidor para registrar el usuario
    let url = "https://localhost:8443/register/";
    let keys = await generarClavesRSA();
    let encryptedPrivateKeyString = encryptModule.encryptKeys(keys[1]);

    let usuario = {
        user: document.getElementById("user").value,
        pass: keyLogin,
        publicKey: keys[0],
        privateKey: encryptedPrivateKeyString
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
            fs.writeFileSync(path.join(__dirname,`../keys/publicKey.key`),keys[0]);
            fs.writeFileSync(path.join(__dirname,`../keys/privateKey.key`),keys[1]);
            window.alert("Usuario registrado satisfactoriamente");
            
            ipcRenderer.send('closeChildWindow');
            ipcRenderer.send('refreshMainPage');
        } else {
            if (response.msg === "Usuario ya existente")
                errorHtml("Usuario ya existente!");
            else
                errorHtml("Faltan campos por rellenar!");
        }
    })
    .catch(error => console.log('Error: ', error));
}

async function register() {
    let pass = document.getElementById("pass").value;
    let user = document.getElementById("user").value;

    if (pass !== "" && user !== "") {
        // try{
            //El primer elemento es la key de encriptación, la segunda la que se guardará en el servidor
            const keys = await hash.hashPassAndObtainKeys(pass);
            let keyLogin = keys[0];
            let keyCifrado = keys[1];
    
            //Guardamos la key con la que encriptaremos las claves de los archivos 
            if(!fs.existsSync(path.join(__dirname, "../keys")))
                fs.mkdirSync(path.join(__dirname,"../keys"));
            let ruta = path.join(__dirname, "../keys/encryptFiles.key");
            fs.writeFileSync(ruta, keyCifrado);
    
            registerServer(keyLogin);
        // } catch(e){
        //     window.alert("Ha sucedido un error en el proceso de registro: " + e);
        // }
    } else {
        errorHtml("Hay que rellenar todos los campos!");
    }
}

async function generarClavesRSA(){
    let key = await cryptorsa.generateKey(2048);
    let publicKey = JSON.stringify(key.publicKey);
    let privateKey = JSON.stringify(key.privateKey);

    return [ publicKey, privateKey ];
}

/**
 * Generador autmático de contraseñas seguras
 * 
 * Genera contraseñas de 15 carácteres elegidas aleatoriamente de 
 * un diccionario de carácteres diversificado.
 */
function secureKeyGen(){
    const normalChar = 63;
    let alfabeto = "qwertyuiopasdfghjklñzxcvbnmQWERTYUIOPASDFGHJKLÑZXCVBNM1234567890,.-;:_?¿?!¡[]+ç@$€";
    let password = "";
    let char;
    let hardCharCount = 0;
    for(let i=0;i<15;i++){
        char = Math.floor(Math.random()*alfabeto.length);
        //Solo permitimos 3 carácteres complejos en la password y a partir del 5 char
        if(i<5 || (hardCharCount>=3 && char>normalChar)){
            char = Math.floor(Math.random()*normalChar)
        }
        //Nuevo carácteres a la password
        password += alfabeto[char];

        if(char>normalChar)   //Contamos nuevo carácteres complejo agregado 
            hardCharCount++;
    }
    
    //Agregamos la nueva contraseña al input de la contraseña
    let input = document.querySelector("input#pass");
    let label = document.querySelector("label#keyGen");

    let labelPass = document.createElement("label");
    labelPass.classList.add("passGenerated");
    labelPass.textContent = password;

    input.value = password;
    label.textContent = "Contraseña generada: ";
    label.appendChild(labelPass);
}