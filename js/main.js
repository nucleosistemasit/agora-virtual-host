var chatSocket = null;
var current_page = 1;
var room_page = 1;

var entityMap = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
     "'": '&#39;',
     '`': '&#x60;'
};
function escapeHtml(string) {
    return String(string).replace(/[<>"'`]/g, function(s) {
        return entityMap[s];
    });
}

function sendReply(element) {
    let reply_preview = document.getElementById("replyPreview");
    let reply_chat = document.getElementById("replyChat");
    let reply_s_chat = document.getElementById("sReplyChat");

    let id = element.closest('.msg-container').dataset.id;
    let content = element.closest('.p-messaged-chat').querySelector('.msg-content').textContent;
    let name = element.closest('.p-messaged-chat').querySelector('.s-messaged-chat').textContent;

    reply_preview.classList.remove("reply-off");
    reply_chat.innerHTML = content;
    reply_s_chat.innerHTML = name;
    reply_preview.dataset.id = id;
}

function closeReply() {
    document.getElementById("replyPreview").dataset.id = "";
    document.getElementById("replyPreview").classList.add("reply-off");
}

function loadNextPage(event) {
    let chatContainer = document.getElementById("chat");
    if (event.target.scrollTop == 0) {
        chatContainer.removeEventListener("scroll", loadNextPage);
        chatSocket.send(JSON.stringify({"command": "next_page", page_number: current_page}));
    }
}

function setInfiniteScroll() {
    let chatContainer = document.getElementById("chat");
    chatContainer.removeEventListener("scroll", loadNextPage);
    chatContainer.addEventListener("scroll", loadNextPage);
}

function loadNextRoom(event) {
    let roomContainer = document.getElementById("room-list");
    if (Math.abs(roomContainer.scrollHeight - roomContainer.scrollTop - roomContainer.clientHeight) < 3) {
        roomContainer.removeEventListener("scroll", loadNextRoom);
        chatSocket.send(JSON.stringify({"command": "list_rooms", page_number: room_page, search: document.getElementById("chat-search-input").value}));
    }
}

function setRoomScroll() {
    let roomContainer = document.getElementById("room-list");
    roomContainer.removeEventListener("scroll", loadNextRoom);
    roomContainer.addEventListener("scroll", loadNextRoom);
}

function toggleReaction(element) {
    let reaction_type = element.dataset.reaction;
    let id = element.closest('.msg-container').dataset.id;
    if (element.classList.contains('sent')) {
        chatSocket.send(JSON.stringify({"command": "react_remove", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
    else {
        chatSocket.send(JSON.stringify({"command": "react_add", "message": id, "reaction_type": parseInt(reaction_type)}));
    }
}

function connectRoom(element) {
    current_page = 1;
    document.getElementById('chat').innerHTML = "";
    let id = element.dataset.id;
    chatSocket.send(JSON.stringify({"command": "connect", "room": id}));
}

function debounce(func, wait, immediate) {
    var timeout;
  
    return function executedFunction() {
      var context = this;
      var args = arguments;
          
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
  
      var callNow = immediate && !timeout;
      
      clearTimeout(timeout);
  
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(context, args);
    };
};

var chatSearch = debounce(function() {
    room_page = 1;
    document.getElementById('room-list').innerHTML = "";
    chatSocket.send(JSON.stringify({"command": "list_rooms", page_number: room_page, search: document.getElementById("chat-search-input").value}));
}, 500);

let searchInput = document.getElementById('chat-search-input');
searchInput.addEventListener('keyup', chatSearch);

let authToken = localStorage.getItem('authToken');
chatSocket = new ReconnectingWebSocket('ws://127.0.0.1:8000/ws/chat/exhibition/?token=' + authToken);

chatSocket.onopen = function(e) {
    document.getElementById('room-list').innerHTML = "";
    document.getElementById('chat').innerHTML = "";
    room_page = 1;
    document.getElementById("status").innerHTML = "Online";
    document.getElementById("status").classList.add('conn-on');
    document.getElementById("status").classList.remove('conn-off');
    chatSocket.send(JSON.stringify({"command": "list_rooms"}));
};

function printMessage (data, messageBlock, scrollToBottom) {
    if (data.content != null && data.content.trim() !== '') {
        let peerNode = document.createElement('div');
        let messageReply = '';
        if (data.reply_to != null) {
            messageReply = '<span class="reply-chat">' +
                                    '<strong class="s-reply-preview">' + 
                                        data.reply_to.username +
                                    '</strong>' +
                                    data.reply_to.content +
                                '</span>';
        }
        peerNode.dataset.id = data.id;
        if (data.is_admin) {
            peerNode.classList.add('mod-msg')
        }
        peerNode.classList.add('msg-container');
        let messageMenu = '<span id="messageMenu" class="msg-menu">' +
                                '<span id="replyMenu-' + data.id + '" class="menu-reply" onclick="sendReply(this)">⬅</span>' +      
                                '<span id="reactionMenu-' + data.id + '" class="menu-reactions">' +
                                '<span class="reaction-menu" data-reaction="1" onclick="toggleReaction(this)">👍</span>' +
                                '<span class="reaction-menu" data-reaction="2" onclick="toggleReaction(this)">👏</span>' +
                                '<span class="reaction-menu" data-reaction="3" onclick="toggleReaction(this)">❤</span>' +
                                '<span class="reaction-menu" data-reaction="4" onclick="toggleReaction(this)">🙌</span>' +
                                '<span class="reaction-menu" data-reaction="5" onclick="toggleReaction(this)">😮</span>' +
                                '<span class="reaction-menu" data-reaction="6" onclick="toggleReaction(this)">🤣</span>' +
                                '</span>' +
                            '</span>';
        let reactionNode = '';
        let reaction_types = ['1', '2', '3', '4', '5', '6'];
        let reaction_emojis = ['👍', '👏', '❤', '🙌', '😮', '🤣'];

        for (let reaction_type of reaction_types) {
            let reaction_visible = "";
            let reaction_sent = "";
            let reaction_quantity = 0;
            if (data["reaction_" + reaction_type] != null) {
                reaction_quantity = data["reaction_" + reaction_type];
                reaction_visible = data["reaction_" + reaction_type] > 0 ? "visible" : "";
            }
            if (data.sent_reactions != null) {
                reaction_sent = data.sent_reactions.includes(parseInt(reaction_type)) ? "sent" : "";
            }
            reactionNode += '<span class="reaction ' + reaction_sent + ' ' + reaction_visible + '" data-reaction="' + reaction_type + '" onclick="toggleReaction(this)">' + reaction_emojis[parseInt(reaction_type) - 1] + '<span class="react-quantity">' + reaction_quantity + '</span></span>';
        }

        peerNode.innerHTML = '<p class="p-messaged-chat"><strong class="s-messaged-chat">' + 
                                escapeHtml(data.username) + 
                                '</strong> ' + 
                                messageReply +
                                '<span class="msg-content">' + linkifyHtml(escapeHtml(data.content), {target: '_blank'}) + '</span>' +
                                '<span class="msg-reactions">' +
                                reactionNode +                                        
                                '</span>' +
                                '<span class="msg-timestamp">' +
                                data.created_at +
                                '</span>' +
                                messageMenu +
                                '</p>' +
                              '</span>';
        messageBlock.appendChild(peerNode);
        if (scrollToBottom) {
            if (data.from_me) {
                document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
            }
        }
        else {
            let messageBlockHeight = messageBlock.clientHeight;
            document.getElementById('chat').scrollTop = messageBlockHeight;
        }
    }
}

function printRoom(data) {
    let roomNode = document.createElement('div');
    roomNode.classList.add('inner-inbox-div');
    roomNode.dataset.id = data.id;
    roomNode.setAttribute('onclick', 'connectRoom(this)');
    roomNode.innerHTML = '<div class="inbox-icon-div">' +
                            '<img class="inbox-icon" src="' + (data.client_picture || "") + '">' +
                        '</div>' +
                        '<div class="p-inbox-contactname">' +
                                '<strong>' + 
                                    data.client_name + 
                                '</strong>' +
                        '</div>' +
                        '<div>' +
                            '<p class="p-inbox-message-preview">' +
                                data.last_message_content +
                            '</p>' +
                        '</div>' +
                        '<div>' +
                            '<p  class="p-time-date">' +
                            data.last_message_created_at +
                            '</p>' +
                        '</div>';

    document.getElementById('room-list').appendChild(roomNode);
}

chatSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    console.log('data', data);
    // Palestrante recebe pacote
    if (data.type == 'chat_list_rooms') {
        for (let room of data.rooms) {
            printRoom(room);
        }
        room_page++;
        if (data.has_next_page) {
            setRoomScroll();
        }
    }
    else if (data.type == 'chat_notification') {
        if (document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]') != null) {
            document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]').querySelector('.p-inbox-message-preview').innerHTML = data.last_message_content;
            document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]').querySelector('.p-time-date').innerHTML = data.last_message_created_at;
        }
        else {
            printRoom(data);
        }
        document.getElementById('room-list').prepend(document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]'));
    }
    else if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock, true);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
        connectionCount = data.connections;
        document.getElementById('conexoes').innerHTML = data.connections;
        for (message of data.messages) {
            printMessage(message, messageBlock, false);
        }
        current_page++;
        if (data.has_next_page) {
            setInfiniteScroll();
        }
    }
    else if (data.type == 'chat_reaction') {
        let messageElement = document.querySelector('.msg-container[data-id="' + data.message + '"]');
        if (messageElement != null) {
            let reactionElement = messageElement.querySelector('.reaction[data-reaction="' + data.reaction_type + '"]');
            let reactionQuantity = reactionElement.querySelector('.react-quantity');
            reactionQuantity.textContent = data.quantity;
            if (data.name == 'react_add') {
                reactionElement.style.display = 'inline-block';
                if (data.from_me) {
                    reactionElement.classList.add('sent');
                }
            }
            else if (data.name == 'react_remove') {
                if (data.quantity == 0) {
                    reactionElement.style.display = 'none';
                }
                else {
                    if (data.from_me) {
                        reactionElement.classList.remove('sent');
                    }
                }
            }
        }
    }
    else if (data.type == 'chat_control') {
    }
    else if (data.type == 'chat_start') {
        if (data.username != null) {
            document.getElementById("host-name").textContent = data.username;
        }
        if (data.profile_picture != null) {
            document.getElementById("host-picture").style.backgroundImage = "url(" + data.profile_picture + ")";
        }
        if (data.permissions.includes('chat.can_export_exhibition_to_csv')) {
            document.getElementById("download-csv").style.display = '';
        }
    }
    else if (data.type == 'chat_connection') {
        // connectionCount++;
        // document.getElementById('conexoes').innerHTML = connectionCount;
        // let peerNode = document.createElement('p');
        // peerNode.className = "p-entered-chat";
        // peerNode.innerHTML = '<strong class="s-entered-chat">' + escapeHtml(data.username) + '</strong> entrou na sala.';
        // document.getElementById('chat').appendChild(peerNode);
        // document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
    else if (data.type == 'chat_disconnection') {
        // connectionCount--;
        // document.getElementById('conexoes').innerHTML = connectionCount;
        // let peerNode = document.createElement('p');
        // peerNode.className = "p-exited-chat";
        // peerNode.innerHTML = '<strong class="s-exited-chat">' + escapeHtml(data.username) + '</strong> saiu da sala.';
        // document.getElementById('chat').appendChild(peerNode);
        // document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
};

chatSocket.onclose = function(e) {
    console.log('host disconnected');
};

const sendButton = document.getElementById("send-message");

sendButton.addEventListener("click", function() {
    // Send message
    let messageTextarea = document.getElementById('message-content');
    let messageContent = messageTextarea.value;

    if (messageContent != null && messageContent.trim() !== '') {
        let messageData = {"command": "chat", "content": messageContent};
        if (document.getElementById("replyPreview").dataset.id != "") {
            messageData.reply_to = document.getElementById("replyPreview").dataset.id;
        }
        chatSocket.send(JSON.stringify(messageData));

        // Clear textarea
        messageTextarea.value = '';
        closeReply();
    }            
});

document.getElementById('message-content').addEventListener('keyup', function(e) {
    if (e.keyCode == 13) {
    sendButton.click();
}});

const exportCSV = document.getElementById("download-csv");
const pictureInput = document.getElementById("picture-input");
const deletePicture = document.getElementById("delete-picture");

exportCSV.addEventListener("click", function() {
    const url = 'http://127.0.0.1:8000/api/export-chat/';
    const authHeader = 'Bearer ' + localStorage.getItem('authToken');
    const options = {
        headers: {
            Authorization: authHeader
        }
    };
    fetch(url, options)
        .then( res => res.blob() )
        .then( blob => {
            let file = window.URL.createObjectURL(blob);
            window.location.assign(file);
        });
});

pictureInput.addEventListener("change", function(event) {
    if (event.target.files && event.target.files[0]) {
        const formData = new FormData();
        formData.append('profile_picture', event.target.files[0]);
        const url = 'http://127.0.0.1:8000/api/profile-picture/';
        const authHeader = 'Bearer ' + localStorage.getItem('authToken');
        const options = {
            method: "POST",
            headers: {
                Authorization: authHeader
            },
            body: formData
        };
        fetch(url, options)
            .then( res => res.json() )
            .then( response_json => {
                document.getElementById("host-picture").src = response_json.profile_picture;
                event.target.value = "";
            });
    }
});

deletePicture.addEventListener("click", function() {
    const url = 'http://127.0.0.1:8000/api/profile-picture/';
    const authHeader = 'Bearer ' + localStorage.getItem('authToken');
    const options = {
        method: "DELETE",
        headers: {
            Authorization: authHeader
        }
    };
    fetch(url, options)
        .then( res => {
            document.getElementById("host-picture").src = "";
        });
});