'use strict'

const ipc = window.require('electron').ipcRenderer;
const fs = require('fs');
const path = require('path');
const {shell, ipcMain} = require('electron');
const {ipcRenderer} = require("electron");
const blobToBuffer = require('blob-to-buffer');
const zipLib = require('../js/modules/compress-module.js');
const services = require('../js/modules/services.js');
const crypto = require('../js/modules/encrypt-module.js');  
const hashM = require('../js/modules/hash-module.js');
const shareM = require('../js/modules/shareFile-module');
const signverify = require('../js/modules/sign-verify-module');
const { file } = require('jszip');


function goToAddPackage(){
    ipc.send('openAddPackageWindow');
}

function goToMetadata(fileName){
    ipc.send('openMetadataWindow', fileName);
}

function goToLogin() {
    ipc.send('openLoginWindow');
}

function goToRegister() {
    ipc.send('openRegisterWindow');
}

function exitLogin() {
    //Borrado del token de sesión
    let ruta = path.join(__dirname, '../token.tk');

    let token = fs.readFileSync(ruta);
    fetch("https://localhost:8443/finsesion", {
            method:"GET",
            headers:{
            "Authorization":"Bearer " + token,
            //"Content-Type":"multipart/form-data"
            }
    })
    .then((response) => {}).catch((error) => console.log("Ha sucedido un error" + error));

    if (fs.existsSync(ruta)) {
        fs.unlinkSync(ruta);
    }
    //Borrado de las claves del usuario (kCifrado y RSA)
    ruta = path.join(__dirname, '../keys');
        if (fs.existsSync(ruta)) {
            fs.rmSync(ruta,{recursive:true});
        }

   ipc.send('refreshMainPage');
}


function descargar(fileName) {
    services.downloadFile(fileName);
}

/**
 * 
 * @param {Boton que contiene estos dos datos} fileNameAndisShared 
 */
function desencriptarComp(fileNameAndisShared) {
    let fileName = fileNameAndisShared.getAttribute('data-file');
    let isSharedFile = fileNameAndisShared.getAttribute('data-share');
    
    let user = hashM.userNameFromToken();
    let rutaEnc = isSharedFile ? path.join(__dirname,`../encriptado/${user}/compartidos/${fileName}.enc`):
                                 path.join(__dirname,`../encriptado/${user}/${fileName}.enc`);
    
    crypto.decryptZip(rutaEnc, rutaEnc.replace('.enc', '.json'), fileName.replace('.enc', ''), isSharedFile).then(()=>{
        window.alert(`Archivo desencriptado correctamente en ${rutaEnc}`);
        shell.showItemInFolder(path.join(__dirname,`../desencriptado/${user}/${fileName.replace('.enc','.zip')}`));
    });
}

/**
 * 
 * @param {Boton que contiene estos dos datos} fileName 
 */
 function desencriptar(fileName) {
    let user = hashM.userNameFromToken();
    let rutaEnc = path.join(__dirname,`../encriptado/${user}/${fileName}`);
    
    crypto.decryptZip(rutaEnc, rutaEnc.replace('.enc', '.json'), fileName.replace('.enc', ''), false).then(()=>{
        window.alert(`Archivo desencriptado correctamente en ${rutaEnc}`);
        shell.showItemInFolder(path.join(__dirname,`../desencriptado/${user}/${fileName.replace('.enc','.zip')}`));
    });
}

function descargarArchivoCompartido (fileAndOwner) {
    let file = fileAndOwner.getAttribute('data-file')+'.enc';
    let fileOwner = fileAndOwner.getAttribute('data-owner');

    shareM.downloadSharedFile(file, fileOwner);
}

function eliminar(fileName){
    services.deleteFile(fileName).then((res)=>{ipc.send("refreshMainPage"); window.alert(res)});
}

async function listaArchivosCompartidos () {
    let archivosCompartidos = await shareM.listSharedFiles();
    let userLogged = hashM.userNameFromToken();
    let tablaArchivosCompartidos = `
    <h2>Paquetes Compartidos</h2>
    <table>
        <tr>
            <th>Nombre del paquete</th>
            <th>Propietario del archivo</th>
            <th>Descargar-Desencriptar</th>
            <th>Metadatos</th>
        </tr>`;
    for (var i = 0; i < archivosCompartidos.length; i++) {
        let rutaArchivoC = path.join(__dirname, `../encriptado/${userLogged}/compartidos/${archivosCompartidos[i].file}.enc`);
        let existe = fs.existsSync(rutaArchivoC);
        
        let botonArchivo = existe ? `<button data-file="${archivosCompartidos[i].file}" data-share="${true}" onclick="desencriptarComp(this)"> Desencriptar </button>`:
                                    `<button data-file="${archivosCompartidos[i].file}" data-owner="${archivosCompartidos[i].fileOwner}" onclick=descargarArchivoCompartido(this)> Descargar </button>`;
        
        let botonMetadatos = existe ? `<button name="${archivosCompartidos[i].file}.enc" onclick=goToMetadata(this.name)> Metadatos </button>`:``;

        let aCompartido = `
        <tr>
            <td> ${archivosCompartidos[i].file} </td>
            <td> ${archivosCompartidos[i].fileOwner} </td>
            <td> ${botonArchivo} </td>
            <td> ${botonMetadatos} </td>
        </tr>`;
        
        tablaArchivosCompartidos += aCompartido;
    }
    tablaArchivosCompartidos += `</table>`;
    
    return tablaArchivosCompartidos;
}

//Listar archivos en la nube del usuario loggeado
function mostrarArchivosEncriptados(){
    services.listFiles().then(res=> res.json())
    .then(response=>{
        if (response["ok"] == true){
            var exists;
            let user = hashM.userNameFromToken();
            let ficheros = response["archivos"];
            let tablePaquetes = document.querySelector(".vista-paquetes table");
            var filaPaquete;
            
            for(var i in ficheros){
                //comprobar si esta en carpeta encripted
                let fileDir = path.join(__dirname, `../encriptado/${user}/${ficheros[i].file}`);
                exists = fs.existsSync(fileDir);
                if(exists){     //si esta file botón con descomprimir
                    filaPaquete = `
                    <tr>
                        <td>` + ficheros[i].file + `</td>
                        <td><button name="${ficheros[i].file}" onclick="goToMetadata(this.name)">Metadatos</button></td>
                        <td><button id=${ficheros[i].file} onclick="desencriptar(this.id)">Desencriptar</button></td>
                        <td><button id=${ficheros[i].file} onclick="eliminar(this.id)">Eliminar</button></td>
                    </tr>`;
                }
                else{           //si no está file botón con descargar
                    filaPaquete = `
                    <tr>
                        <td>` + ficheros[i].file + `</td>
                        <td></td>
                        <td><button id=${ficheros[i].file} onclick="descargar(this.id)">Descargar</button></td>
                        <td><button id=${ficheros[i].file} onclick="eliminar(this.id)">Eliminar de la nube</button></td>
                    </tr>`;
                }
                
                tablePaquetes.innerHTML += filaPaquete;
            }
        } else {
            console.log("Error al listar archivos");
        }
    })
    .catch(error => console.log('Error: ', error));
}

//Añadir interfaz del usuario cuando ya está loggeado
async function agregarHtmlUsuarioLogeado () {
    let paquetes = document.querySelector(".vista-paquetes");
    let htmlPaquetes = `
    <button onclick="goToAddPackage()" id="addPackage">Agregar Paquetes</button>
    <h2>Paquetes encriptados</h2>
    <table>
        <tr>
            <th>Nombre del paquete</th>
            <th>Metadatos</th>
            <th>Descarga</th>
            <th>Borrado</th>
        </tr>
    </table>`;
    mostrarArchivosEncriptados();
    paquetes.innerHTML += htmlPaquetes;
    let htmlArchivosC = await listaArchivosCompartidos();
    paquetes.innerHTML += htmlArchivosC;
    
    //Borramos los botones de login y registro una vez logeados
    document.querySelector(".login-registro").remove();
    
    let barraNav = document.querySelector(".navbar");
    let htmlBarraNav = `
    <a href="#" onclick="exitLogin()">
    🚪Salir
    </a>`;

    //Añadir nombre de usuario a la cabecera
    let saludo = document.createElement("span");
    let userName = document.createElement("label");
    userName.id = "user";
    userName.textContent = hashM.userNameFromToken();
    saludo.append("¡Hola, ");
    saludo.appendChild(userName);
    saludo.append("!")

    barraNav.innerHTML += htmlBarraNav;
    barraNav.appendChild(saludo);
}


document.addEventListener('DOMContentLoaded', () => {
    //Petición cuando se resulve(loggeado) y cuando se rechaza(no loggeado)
    services.isLogged().then(()=>agregarHtmlUsuarioLogeado(), ()=>ipc.send('openLoginWindow'));
});