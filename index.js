// Load basic modules
var jade = require('jade'),
    express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    fs = require('fs'),
    multer = require('multer'),
    mongo = require('mongodb'),
    monk = require('monk'),
    db = monk('localhost:27017/in-transit');

// Load custom modules
var pbConfig = require('./pbConfig.js'),
    pbFunc = require('./pbFunc.js');

// Define template engine
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// Serve stuff from the semantic ui folder
app.use("/semantic", express.static(__dirname + '/semantic'));

// Make db accessible
app.use(function (req, res, next) {
    req.db = db;
    next();
});

// Define upload handler
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, pbConfig.uploadFolder);
    },
    filename: function (req, file, cb) {
        var n = pbFunc.rename(file.originalname);
        cb(null, n);
    }
});

var upload = multer({
    storage: storage
});

app.use(express.static(__dirname + '/public'));

// Request handlers

// Main page
app.get('/', function (req, res) {
    var db = req.db;
    var keys = db.get('keywords'),
        sharedfiles = pbFunc.getFileList(pbConfig.uploadFolder);
    
    keys.find({}, {}, function (e, docs) {
        res.render('layout.jade', { keywords: docs, filelist: sharedfiles });
    });
});

// Download file request
app.get("/user-uploads*", function (req, res) {
    var file = unescape(req.path);
    console.log("Downloading: " + file);
    res.download(process.cwd() + file);
});

// Upload functionality
app.post('/upload', upload.any(), function (req, res, next) {
    console.log("Uploading...\nFiles: ", req.files, "\nBody: ", req.body);

    // Set variables for storing upload and database information
    var filetype = "",
        filename,
        keys = [],
        xtrakeys = [],
        phrases = [],
        db = req.db,
        keywordsCollection = db.get('keywords'),
        filesCollection = db.get('files');
        
    // FILE
    if (req.files.length > 0) {
        filetype = pbFunc.getType (req.files[0].mimetype);
        filename = req.files[0].filename;
    }
    console.log("filename is: ", filename);
    console.log("filetype is: ", filetype);
    
    // COMMENTS
    //Break comments to phrases
    phrases = pbFunc.str2Array(req.body.comments, ".");
    console.log("phrases are: ", phrases);
    
    // KEYWORDS
    // Make an array out of keywords
    if (req.body.keywords !== undefined)
        keys = req.body.keywords.slice();

    // Get extra keywords and append them to the keywords array
    xtrakeys = pbFunc.str2Array(req.body.extraKeywords, ",");
    keys = keys.concat(xtrakeys);
    console.log("all keywords are: ", keys);

    // Update the keywords collection with the new data
    pbFunc.updateKeywords(keys, filename, phrases, keywordsCollection);
    console.log("Update keywords successful!");

// Add an entry in the files collection. If there is no file, filename will be null
    filesCollection.insert({filename: filename, filetype: filetype, keywords: keys, comments: req.body.comments, author: req.body.author});

    // *** KEEP THIS FOR USE IN THE BROWSE SECTION
    // // Send upload feedback to the client
    if (io.sockets.connected[req.body.socket]) {
        io.sockets.connected[req.body.socket].emit('upload ok', "ok");
    }
    // alternative way -- I like better the if condition
    // io.to(req.body.socket).emit('upload ok', feedback);

    // Redirect to a get request (see below)
    res.redirect('/dummy');
});

// This is to avoid the 'resend' prompt in the browser when refreshing after a post request (upload)
app.get('/dummy', function (req, res) {
    res.end();
});

// Socket.io functions
io.on('connection', function(socket) {
    console.log('A client connected: ' + socket.id);

    var chatStream, content;
    if (pbFunc.existsSync(pbConfig.chatFile)) {
        content = fs.readFileSync(pbConfig.chatFile, 'utf8');
        socket.emit('display chat', content);
    } else {
        chatStream = fs.createWriteStream(pbConfig.chatFile);
        chatStream.end("<span>Welcome to in-transit</span>", (err) => {
            if (err) console.log("Chat error! =>>> ", err);
            content = fs.readFileSync(pbConfig.chatFile, 'utf8');
            socket.emit('display chat', content);
        });
    }
    
    socket.on('chat message', function (msg) {
        console.log("A " + msg.color + " chat message: " + msg.message);
        var c = fs.readFileSync(pbConfig.chatFile, 'utf8');
        chatStream = fs.createWriteStream(pbConfig.chatFile);
        chatStream.end(pbFunc.makeEntry(msg.color, msg.message) + c, (err) => {
            if (err) throw err;
            var chat = fs.readFileSync(pbConfig.chatFile, 'utf8');
            io.emit('display chat', chat);
        });
    });
    
    socket.on('disconnect', function() {
        console.log('A client disconnected');
    });
});

http.listen(pbConfig.http, function () {
    console.log('in-transit running on port ' + pbConfig.http);
});

