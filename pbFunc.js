// JS Functions used in the project

var fs = require('fs');
var pbConfig = require('./pbConfig.js');

// Take a number and display it as two digits (eg 5 to 05)
exports.addzero = function (x) {
    while (x.toString().length < 2) {
        x = "0" + x.toString();
    }
    return x;
};

// Get the filetype -- get also text
exports.getType = function (mimetype) {
    var type;
    if (mimetype == "image/jpeg" || mimetype == "image/png" || mimetype == "image/gif") {
        type = "image";
    } else if (mimetype == "video/mp4" || mimetype == "video/webm" || mimetype == "video/ogg") {
        type = "video";
    } else if (mimetype == "audio/mpeg" || mimetype == "audio/wav" || mimetype == "audio/ogg") {
        type = "audio";
    } else {
        type = "";
    }
    return type;
};

// Add timestamp to filename
exports.rename = function (n) {
    var name;
    var dot = n.lastIndexOf(".");
    var d = new Date();
    var date = this.addzero(d.getDate()) + this.addzero(d.getHours()) + this.addzero(d.getMinutes()) + this.addzero(d.getSeconds());
    // If the file has an extension, add the timecode before it
    if (dot > -1)
        name = n.substring(0, dot) + "-" + date + n.substring(dot, n.length);
    else
        name = n + "-" + date;
    return name;
}

// Make an array out of a string
exports.str2Array = function (str, sepr) {
    var arr = [];
    var s = "";
    while (str !== s) {
        s = str;
        if (str.indexOf(sepr) > -1)
            s = str.substring(0, str.indexOf(sepr));
        s = s.trim();
        if (s.length > 0)
            arr.push(s);
        str = str.substr(str.indexOf(sepr) + 1);
        str = str.trim();
    }
    return arr;
};

// Update keywords collection
// Reads an array of keywords, a file and a collection. For each keyword, add the keyword in the collection if it does not exist and then add the file in each keyword
exports.updateKeywords = function (keys, file, phrases, collection) {
    if (keys.length != 0) {
        for (var i in keys) {
            collection.update({keyword: keys[i]}, {$set: {keyword: keys[i]}}, {upsert: true});
            collection.update({keyword: keys[i]}, {$push: {phrases: {$each: phrases}}});
            if (file !== undefined)
                collection.update({keyword: keys[i]}, {$push: {files: file}});
        }
    }
    console.log("Updated keywords data!");
};

// exports.addKeywords = function (keys, collection) {
//     if (keys.length != 0) {
//         for (var i in keys)
//             collection.update({keyword: keys[i]}, {keyword: keys[i]}, {upsert: true});
//         console.log("Added new keywords!");
//     } else
//         console.log("No keywords to append!");
// };

// Make a chat entry
exports.makeEntry = function (color, message) {
    var pos = Math.floor(Math.random()*60);
    var entry = "<span style='color:" + color + ";margin-left:" + pos + "%;'>" + message + "</span><br />";
    return entry;
};

// Get a list of files in a folder
exports.getFileList = function ( directory ) {
    var temp = fs.readdirSync( directory );
    var fileList = new Array();
    for( var key in temp ) {
        var name = temp[key];
        var size = fs.statSync(pbConfig.uploadFolder + "/" + name).size;
        var time = fs.statSync(pbConfig.uploadFolder + "/" + name).birthtime;
        time = time.getTime();
        if (size > 1024) {
            size = parseInt(size/1024) + " kb";
        } else {
            size += " bytes";
        }
        fileList.unshift( {name: name, size: size, time: time} );
        // Sort the list by creation time - newest first
        fileList.sort(function (a, b) {
            if (a.time < b.time)
                return 1;
            if (a.time > b.time)
                return -1;
            return 0;
        });
    }
    return fileList;
};

// Function to check if a file exists -- replaces the deprecated existsSync from fs
exports.existsSync = function (filename) {
    try {
        fs.accessSync(filename);
        return true;
    } catch(ex) {
        return false;
    }
};
