;(function($){

    var $chatForm = $('#chatControl'),
        $textInput = $('input[name="message"]', $chatForm),
        $messageArea = $('#messages'),
        userListTemplate = _.template(
            "<li><%= user %></li>"
            );
        messageTemplate = _.template(
            "<tr><td class='meta-message'><span class='user'><%= user %></span><br>[<%= currentTime %>]</td><td><%= message %></td></tr>"
            );


    $(document).ready(function(){
        var socket = io.connect(chat_url);

        $chatForm.on('submit', function (e){
            var text = $textInput.val();
            e.preventDefault();
            socket.emit('send', {message: text});
            $textInput.val('');
        });

        socket.on('chat_message', function (data) {
            print_message(data);
            socket.emit('get_status', {message: null});
        });
        socket.on('user_logon', function (data) {
            console.log(data);
            print_message({message:'New User: ' + data.user.nick, user: 'local'});
            socket.emit('get_status', {message: null});
        });
        socket.on('status_update', function (data) {
            updateInfo(data);
        });
        socket.on('connect_failed', function () {
            print_message({message:'Sorry - the connection failed.', user: 'local'});
        })
        socket.on('error', function () {
            print_message({message:'Sorry - there was an error.', user: 'local'});
        });
        socket.on('reconnect_failed', function () {
            print_message({message:'Sorry - the connection failed.', user: 'local'});
        });

    });//document.ready

    /**
     *  Prints a message to the chat window
     *  reqires:
     *  data.user (the nickname),
     *  data.message (the complete message string)
     *
     */
    function print_message(data) {
        var currentTime = new Date(Date.now());
        $messageArea.append(messageTemplate({message: data.message, user: data.user, currentTime: currentTime.toTimeString() }));
    }

    /**
     *  Updates the information area of the chat window
     *  reqires:
     *  data.userlist (the list of all the user nicks in the chat session),
     *
     */
    function updateInfo(data) {
        var $userList = $('#usersOnline');
        $userList.html('');
        _.each(data.userlist, function(user){
            $userList.append(userListTemplate({user: user}));
        });
    }

})(jQuery);