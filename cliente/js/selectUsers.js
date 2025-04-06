const {remote} = require("electron");
const {ipcRenderer} = require("electron");
const services = require("../js/modules/services.js");

//Variable global que almacenará el listado de usuarios
var list = [];

function cancelarBtn() {
    remote.getCurrentWindow().close();
}

//Devolver el listado de usuarios seleccionados a la ventana addPackage
function returnValue(){
    if(list.length == 0){
        window.alert("Lista vacía: Seleccione algun usuario para poder compartir el archivo");
    } else{
        ipcRenderer.send('shareUsersList',list);
        window.alert("Lista guardada satisfactoriamente");
        remote.getCurrentWindow().close();
    }
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

//Mostrar todos los usuarios con sus respectivas publicKeys
function addUsers(){
    services.listUsers().then((res)=>{
        let body= document.getElementById("principal");
        let divList = document.createElement("table");
        divList.id = "users";
        //divList.setAttribute("class","clearfix");
        body.insertBefore(divList,document.querySelector("div.clearfix"));

        //Añadimos la primera fila a la tabla
        let elem = document.createElement("tr");
        let field = document.createElement("td");
        field.innerHTML= "<b>Usuarios</b>";
        elem.appendChild(field);
        field = document.createElement("td");
        field.innerHTML = "<b>Claves públicas</b>";
        elem.appendChild(field);
        field = document.createElement("td");
        elem.appendChild(field);
        divList.appendChild(elem);

        for(let i=0;i<res.length;i++){
            elem = document.createElement("tr");
            field = document.createElement("td");
            field.innerText = res[i].user;
            elem.appendChild(field);

            field = document.createElement("td");
            field.innerText = res[i].publicKey;
            elem.appendChild(field);

            field = document.createElement("td");
            let button = document.createElement("button");  
            button.innerText = "Añadir";
            button.addEventListener("click",(ev)=>addToList(ev),false);
            field.appendChild(button);
            elem.appendChild(field);
            divList.appendChild(elem);
        }
        divList = document.createElement("div");
        divList.setAttribute("class","selected");
        body.insertBefore(divList,document.querySelector("div.clearfix"));
    });    
}

//Añadir usuario a la lista
function addToList(ev){
    let elems = queryAncestorSelector(ev.target,"tr").querySelectorAll("td");
    let already = false;
    for(let i=0;i<list.length;i++){
        if(list[i].user == elems[0].innerText){
            already=true;
            break;
        }
    }
    if(!already){
        let selected = document.createElement("label");
        selected.classList.add("selected");
        selected.innerText = elems[0].innerText;
        list.push({user: elems[0].innerText, publicKey: elems[1].innerText});
        let x = document.createElement("label");
        x.innerText = " X ";
        x.classList.add("borrar");
        x.addEventListener("click",(ev)=>removeFromList(ev),false);
        selected.appendChild(x);
        document.querySelector("div.selected").appendChild(selected);
    }

}

//Eliminar usuario de la lista
function removeFromList(ev){
    let labelSelected = queryAncestorSelector(ev.target,"label.selected").innerText.split(" ")[0];
    let already = false;
    for(let i=0;i<list.length;i++){
        if(list[i].user == labelSelected){
            list.splice(i,1);
            queryAncestorSelector(ev.target,"label.selected").remove();
            already = true;
            break;
        }
    }
    if(!already){
        queryAncestorSelector(ev.target,"label.selected").remove();
    }
}

document.addEventListener('DOMContentLoaded', ()=>{
    list = [];
    addUsers();
   
    boton = document.getElementById('cancelar');
    boton.addEventListener('click',cancelarBtn,false);

    boton = document.getElementById('shareUsers');
    boton.addEventListener('click',()=>returnValue(),false);
});