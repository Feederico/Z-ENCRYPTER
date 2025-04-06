const {app, BrowserWindow, ipcMain, ipcRenderer} = require('electron');
const fs = require("fs");
const path = require("path");

let mainWin;
let childWindow;
let listUsersWindow;
app.commandLine.appendSwitch('ignore-certificate-errors');

function specifyMainWin() {
    return new BrowserWindow({
        width: 1024,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false,
    });
}

function specifyChildWin() {
    return new BrowserWindow({
        width: 800,
        height: 600,
        modal: true,
        show: false,
        parent: mainWin, //Necesario indicar el pariente

        webPreferences:{
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        },
    });
}

/*VENTANA PRINCIPAL PARA LISTAR Y DESCARGAR PAQUETES*/
/*#############################*/
function createIndexWindow() {
    mainWin = specifyMainWin();

    mainWin.loadFile('html/index.html');
    //mainWin.removeMenu();
    mainWin.show();
}

ipcMain.on('openIndexWindow', (event, arg) => {
    createIndexWindow();
});
/*#############################*/

/*VENTANA DE AGREGAR UN PAQUETE*/
/*#############################*/
function createAddPackageWindow (){
    childWindow = specifyChildWin();

    childWindow.loadFile("html/addPackage.html");

    childWindow.once("ready-to-show", ()=>{
        childWindow.show();
    });
}

ipcMain.on('openAddPackageWindow', (event, arg) => {
    createAddPackageWindow();
});

/*VENTANA PARA ELEGIR USUARIOS CON QUIEN COMPARTIR FICHERO*/
/*#############################*/
function userListWindow(){
    listUsersWindow = specifyChildWin();
    listUsersWindow.loadFile("html/selectUsers.html");
    listUsersWindow.once("ready-to-show",()=>{listUsersWindow.show()});
}

function shareUsersList(list){
    childWindow.webContents.send('actualizarVentana', list);
}

ipcMain.on('openListUsers',(event, arg) =>{ //Abre ventana de listado de usuarios
    userListWindow();
});

ipcMain.on('shareUsersList',(event,arg)=>{  //Devuelve listado de usuarios compartidos
    shareUsersList(arg);
});
/*#############################*/

/*VENTANA DE METADATOS*/
/*#############################*/
function createMetadataWindow(fileName){
    var _args = {
        nameFile: fileName,
    };

    childWindow = specifyChildWin();
    
    childWindow.loadFile("html/metadata.html");

    childWindow.once("ready-to-show", ()=>{
        childWindow.show();
        childWindow.webContents.send('actualizarVentana', _args);
    });
}

ipcMain.on('openMetadataWindow', (event, arg) =>{
    createMetadataWindow(arg);
});
/*#############################*/

/*VENTANA DE LOGIN*/
/*#############################*/
function createLoginWindow(){
    childWindow = specifyChildWin();
    
    childWindow.loadFile("html/login.html");

    childWindow.once("ready-to-show", ()=>{
        childWindow.show();
    });
}

ipcMain.on('openLoginWindow', (event, arg) =>{
    createLoginWindow();
});
/*#############################*/

/*VENTANA DE REGISTRO*/
/*#############################*/
function createRegisterWindow(){
    childWindow = specifyChildWin();

    childWindow.loadFile("html/register.html");

    childWindow.once("ready-to-show", ()=>{
        childWindow.show();
    });
}

ipcMain.on('openRegisterWindow', (event, arg) =>{
    createRegisterWindow();
});
/*#############################*/

ipcMain.on('refreshMainPage', (event, arg)=>{
    //Recargamos la página principal para que se actualicen los ficheros mostrados
    if (mainWin != null)
        mainWin.reload();
});

ipcMain.on('closeMainWindow', (event, arg) => {
    if (mainWin != null) {
        mainWin.close();
    }
});

ipcMain.on('closeChildWindow', (event, arg) => {
    if (childWindow != null) {
        childWindow.close();
    }
});

app.whenReady().then(()=>{
    createIndexWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createIndexWindow();
        }
    });
});

//Cuando el usuario cierra la app
app.on("window-all-closed", () => {
    if (process.platform !== "darwin"){
        app.quit();
        //Eliminamos el token de sesión
        let ruta = path.join(__dirname, 'token.tk');
        if (fs.existsSync(ruta)) {
            fs.unlinkSync(ruta);
        }
        //Eliminamos las claves del usuario (kCifrado y RSA)
        ruta = path.join(__dirname, 'keys');
        if (fs.existsSync(ruta)) {
            fs.rmSync(ruta,{recursive:true});
        }
    }
});