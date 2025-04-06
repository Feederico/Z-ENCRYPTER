var fs = require('fs');
var path = require('path');

function checkUserLogExists( username ){
    var route = path.join(__dirname, "../logs/" + username + ".log");
    if(!fs.existsSync(route))
        fs.writeFileSync(route,"/** " + username + " LOG **/\n");
}

function checkMainLogExists(){
    var rutaLogs = path.join(__dirname, "../logs");
    var route = path.join(__dirname, "../logs/mainLog.log");
    if(!fs.existsSync(rutaLogs)){
        fs.mkdirSync(path.join(__dirname, "../logs"));
    }

    if(!fs.existsSync(route)){
        fs.writeFileSync(route,"/** LOG General **/\n");
    }
}

function getContentToWrite(username, endpoint, result){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = dd + '/' + mm + '/' + yyyy;
    let contentToWrite = "@ON: " + today + " the user: " + username + " => did the query '" + endpoint + "' With result: " + result + "\n";
    return contentToWrite;
}

function writeIntoLog( username, endpoint, result){
    checkMainLogExists();
    checkUserLogExists(username);
    let contentToWrite = getContentToWrite(username, endpoint, result);
    fs.appendFileSync(path.join(__dirname, "../logs/mainLog.log"), contentToWrite);
    fs.appendFileSync(path.join(__dirname, "../logs/" + username + ".log"), contentToWrite);
}

function writeIntoMainLog( username, endpoint, result){
    checkMainLogExists();
    let contentToWrite = getContentToWrite(username, endpoint, result);
    fs.appendFileSync(path.join(__dirname, "../logs/mainLog.log"), contentToWrite);
}

exports.writeIntoLog = writeIntoLog;
exports.writeIntoMainLog = writeIntoMainLog;