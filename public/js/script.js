// socket.io stuff
var socket = io();
var sessionID;
socket.on('connect', function () {
    sessionID = socket.io.engine.id;
});

// Initialize form
var clearform = function () {
    $('input:checkbox').attr('checked', false);
    $('textarea').val('');
    $('#id').val('');
    $('#author').val('');
    $('#uploadfile').replaceWith('<input type="file" name="upload" id="uploadfile">');
};

jQuery(document).ready(function ($) {
    // hide messages and clear the upload form on refresh
    $('.message').addClass("hidden");
    clearform();

    // add tab and accordion behaviors
    $('.top.menu .item').tab();
    $('.ui.accordion').accordion();

    // make tabs activate - deactivate
    $('a.item').click(function () {
        $('.item').removeClass('active');
        $(this).addClass('active');
    });

    // form handling
    $('#uploadForm').submit(function(event) {
        var x = document.getElementById("uploadfile");
        var s = $(this).serializeArray();
        // The comments is the first element of the serialized array
        var comments = s[0].value;
        // Add the session ID to the form before submission
        $("#id").val("/#" + sessionID);
        // Add the source of the file
        $("#author").val("just a test user");
        // If there are no files and no text, prevent submission
        if (x.files.length == 0 && comments == "") {
            event.preventDefault();
            $('#no').removeClass('hidden');
            $('#ok').addClass('hidden');
        }
    });

    // close messages
    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });
    
    // chat functions
    $('#chat-form').submit(function () {
        if ($('#chat-msg').val() != "") {
            var chatEntry = { message: $('#chat-msg').val(),
                              color: $("input[type='radio'][name='color']:checked").val()
                            };
            socket.emit('chat message', chatEntry);
            $('#chat-msg').val('');
        }
        return false;
    });

    socket.on('chat init', function (msg) {
        $('#messages').html(msg);
    });

    socket.on('display chat', function (msg) {
        $('#messages').html(msg);
    });

    socket.on('upload ok', function (msg) {
        $('#ok').removeClass('hidden');
        $('#no').addClass('hidden');
        clearform();
    });

});

// functions
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function updateQueryStringParameter(uri, key, value) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    else {
        return uri + separator + key + "=" + value;
    }
}
