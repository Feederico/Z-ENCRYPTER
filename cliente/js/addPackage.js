const {remote, TouchBarLabel} = require("electron");
const {ipcRenderer} = require("electron");
const path = require('path');
const crypto = require('../js/modules/encrypt-module.js');
const zipLib = require('../js/modules/compress-module.js');
const signverify = require('../js/modules/sign-verify-module.js');
const services = require("../js/modules/services.js");
const { windowsStore } = require("process");
const fs = require("fs");
const shareModule = require('../js/modules/shareFile-module.js');

//Variable global que recibirá la lista de usuarios para compartir
var usersShare = [];
var nuevosMetadatos =[];

function goToFirstWindow(){
  remote.getCurrentWindow().close();
}

function cancelarBtn() {
    ipcRenderer.send('closeChildWindow');
}

function agregarMetadato(){
    //Selecciono el "formulario"
    let boton = document.getElementById('botonAddMetadato');
    let nombreMetadato = document.getElementById('nuevoMetadato');

    //Agrego el nuevo metadato a tener en cuenta al array
    nuevosMetadatos.push(nombreMetadato.value);
    
    //Agrego el label
    let titulo = document.createElement('label');
    titulo.setAttribute('for',nombreMetadato.value+'Meta');
    titulo.innerHTML=`<b>${nombreMetadato.value}</b>`;

    //Agrego el input
    let inputMetadato = document.createElement('input');
    inputMetadato.setAttribute('type','text');
    inputMetadato.setAttribute('id',`${nombreMetadato.value}Meta`);
    inputMetadato.setAttribute('placeholder','Introduce el valor');

    //Agrego los elementos HTML para introducir el campo
    boton.parentElement.insertBefore(inputMetadato,boton.nextSibling);
    boton.parentElement.insertBefore(titulo,boton.nextSibling);

    //Vacío el "formulario"
    nombreMetadato.value = "";
}

//Abrir ventana para seleccionar usuarios
function openListUsers(){
    ipcRenderer.send('openListUsers');
    ipcRenderer.on('actualizarVentana',(ev,list)=>{
        if(list!=[]){
            usersShare = list;
            showListSharedUsers();
        }
    });
}

//Borrar lista de usuarios de compartición
function removeList(){
    usersShare =[];
    document.querySelector("div.usersList").remove();
}

//Mostrar elementos con la lista de usuarios
function showListSharedUsers(){
    let exists = document.querySelector("div.usersList")
    if(exists){
        exists.remove();
    }

    let div = document.createElement("div");
    div.classList.add("usersList");
    div.innerText = "Estos ficheros se van a compartir con los usuario(s) ";
    for(let i=0;i<usersShare.length;i++){
        let label = document.createElement("span");
        label.classList.add("userList");
        label.innerText = usersShare[i].user;
        div.appendChild(label);
        if(i!=usersShare.length-1)
            div.append(", ");
        else   
            div.append(".");
    }

    let remove = document.createElement("button");
    remove.addEventListener("click",removeList,false);
    remove.id = "shareDelete";
    remove.innerText = "Borrar lista de compartición"; 
    div.appendChild(remove);

    document.querySelector("div.container").insertBefore(div,document.querySelector("div.clearfix"));
}



//Seleccionamos a un nodo padre
function queryAncestorSelector(node,selector){
    var parent=node.parentNode;
    var all = document.querySelectorAll(selector);
    var found = false;
    while(parent !== document && !found){
        for(var i=0; i<all.length && !found; i++){
            found = (all[i] == parent)?true:false;
        }
        parent = (!found)?parent.parentNode:parent;
    }
    return (found)?parent:null;
}

//Pasar div para comprobar los inputs si est�n completados
function completedFiles(div){
    let inputs = div.querySelectorAll("input");
    let incompleto = false;
    for(let i=0;i<inputs.length;i++){
        if(!inputs[i].value){
            if(inputs[i].id !== 'nuevoMetadato'){
                incompleto = true;
                inputs[i].setAttribute("class","incomplete");
            }
        }
    }
    if(incompleto)
        window.alert("Faltan campos por rellenar!");
    
    return !incompleto;
}

//Función que gestiona el empaquetado, el cifrado y la subida del paquete al servidor
function manager(){
    //Creo el objeto de metadatos
    let metadatos = {};
    
    let div = document.querySelector("div.container");
    if(completedFiles(div)){
        //Cojo las referencias a los distintos elementos
        let files = document.getElementById('file-input');
        let nombre = document.getElementById('nombre');
        let desc = document.getElementById('descripcion');
        //let fecha = document.getElementById('fecha');
    
        //Guardo los metadatos en el objeto
        metadatos.nombre = nombre.value;
        metadatos.descripcion = desc.value;
        metadatos.fecha = new Date();   //Le asignamos la fecha actual
        for(let elem of nuevosMetadatos){
            let valorElemento = document.getElementById(`${elem}Meta`);
            metadatos[elem] = valorElemento.value;
        }
    
        //Comprimo los archivos 
        let rutilla = path.join(__dirname,`../encriptado/${nombre.value}.zip`);
        zipLib.createZipMeta(files.files,nombre.value,metadatos).then(()=>{
            //Creo la firma digital a partir del zip
            signverify.signFile(nombre.value).then(() => {
                //Encripto los archivos
                crypto.encryptZip(rutilla,metadatos.nombre).then(()=>{
                    if(usersShare.length>0){
                        shareModule.shareFile(usersShare,nombre.value).then(()=>{
                            //LLamar a la función SendFile para enviar directamente el fichero cifrado
                            services.sendFile(nombre.value).then((response)=>{
                                window.alert("Cifrado y subida a la nube completados con éxito.");
                                
                                //Y borro el zip
                                fs.unlinkSync(rutilla);
                                ipcRenderer.send('closeChildWindow');
                                ipcRenderer.send('refreshMainPage');
                            }, (reject) => window.alert("Ha sucedido un error subiendo el archivo a la nube: " + reject));
                        },(reason)=> window.alert("Ha sucedido un error compartiendo los archivos, por lo que no se ha completado la subida de los archivos a la nube: " + reason));
                    }
                    else{
                        //LLamar a la función SendFile para enviar directamente el fichero cifrado
                        services.sendFile(nombre.value).then((response)=>{
                            window.alert("Cifrado y subida a la nube completados con éxito.");
                            
                            //Y borro el zip
                            fs.unlinkSync(rutilla);
                            ipcRenderer.send('closeChildWindow');
                            ipcRenderer.send('refreshMainPage');
                        }, (reject) => window.alert("Ha sucedido un error subiendo el archivo a la nube: " + reject));
                    }
                    }); 
            }, (reject) => window.alert("Error durante el proceso de firma " + reject));
        });
    }
};


document.addEventListener('DOMContentLoaded', ()=>{
    let boton = document.getElementById('encriptar');
    boton.addEventListener('click',manager,false);
    
    boton = document.getElementById('cancelar');
    boton.addEventListener('click',cancelarBtn,false);

    boton = document.getElementById('share');
    boton.addEventListener('click',openListUsers,false);
});