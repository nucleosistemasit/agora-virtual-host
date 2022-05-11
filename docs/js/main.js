var chatSocket = null;
var heartbeat = null;
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

function logout() {
    localStorage.removeItem('authToken');
    document.location.href = '/';
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
    for (let i of document.querySelectorAll(".inner-inbox-div")) {
        i.classList.remove("chat-selected");
    }
    element.classList.add("chat-selected");
    element.classList.remove("show-notification");
}

function startHeartbeat() {
    heartbeat = setInterval(function() {
        chatSocket.send(JSON.stringify({"command": "heartbeat"}));
    }, 30000);
}

function stopHeartbeat() {
    clearInterval(heartbeat);
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
chatSocket = new ReconnectingWebSocket('wss://metaversochat.youbot.us/ws/chat/exhibition/?token=' + authToken);

chatSocket.onopen = function(e) {
    startHeartbeat();
    document.getElementById("chat").removeEventListener("scroll", loadNextPage);
    document.getElementById("room-list").removeEventListener("scroll", loadNextRoom);
    document.getElementById('room-list').innerHTML = "";
    document.getElementById('chat').innerHTML = "";
    room_page = 1;
    current_page = 1;
    // document.getElementById("status").innerHTML = "Online";
    // document.getElementById("status").classList.add('conn-on');
    // document.getElementById("status").classList.remove('conn-off');
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
                                '<span id="replyMenu-' + data.id + '" class="menu-reply" onclick="sendReply(this)"><i class="fa-solid fa-reply"></i></span>' +
                                '<span id="reactionMenu-' + data.id + '" class="menu-reactions">' +
                                '<span class="reaction" data-reaction="1" onclick="toggleReaction(this)">👍</span>' +
                                '<span class="reaction" data-reaction="2" onclick="toggleReaction(this)">👏</span>' +
                                '<span class="reaction" data-reaction="3" onclick="toggleReaction(this)">💗</span>' +
                                '<span class="reaction" data-reaction="4" onclick="toggleReaction(this)">🙌</span>' +
                                '<span class="reaction" data-reaction="5" onclick="toggleReaction(this)">😮</span>' +
                                '<span class="reaction" data-reaction="6" onclick="toggleReaction(this)">🤣</span>' +
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
                                ((data.attachment != null) ? "<a href='"+ data.attachment +"' class='download-attachment' target='_blank'><i class='fa-solid fa-file-arrow-down'></i></a>" : "") +
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
                            '<img class="inbox-icon" src="' + (data.client_picture || "css/default_pic.jpg") + '">' +
                        '</div>' +
                        '<div class="p-inbox-contactname">' +
                                '<strong>' + 
                                    data.client_name + 
                                '</strong>' +
                                '<span class="client-company-name"> - ' +
                                    data.client_company_name +
                                '</span>' +
                               '<span class="client-email"> (' +
                                    data.client_email +
                                ')</span>' +
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
            if (data.from_me == false) {
                let notification = document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]');
                notification.classList.add("show-notification");
                var audio = new Audio('./audio/sound_1.wav');
                audio.play();
            }
        }
        else {
            printRoom(data);
        }
        document.getElementById('room-list').prepend(document.querySelector('.inner-inbox-div[data-id="' + data.id + '"]'));
    }
    else if (data.type == 'chat_stats') {
        if (data.connections >= 0) {
            document.getElementById("connectionsId").innerHTML = data.connections;
        }        
    }
    else if (data.type == 'chat_message') {
        let messageBlock = document.getElementById('chat');
        printMessage(data, messageBlock, true);
    }
    else if (data.type == 'chat_history'){
        let messageBlock = document.createElement('div');
        messageBlock.classList.add("message-block");
        document.getElementById('chat').prepend(messageBlock);
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
            document.getElementById("profile-picture").style.backgroundImage = "url(" + data.profile_picture + ")";
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
    stopHeartbeat();
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
const fileMessage = document.getElementById("file-message");

fileMessage.addEventListener("change", function(event) {
    if (event.target.files && event.target.files[0] && document.querySelector(".inner-inbox-div.chat-selected") != null) {
        const formData = new FormData();
        formData.append('attachment', event.target.files[0]);
        formData.append('room', document.querySelector(".inner-inbox-div.chat-selected").dataset.id);
        const authHeader = 'Bearer ' + localStorage.getItem('authToken');
        const url = 'https://metaversochat.youbot.us/api/user-file-upload/';
        const options = {
            method: "POST",
            body: formData,
            headers: {
                Authorization: authHeader
            }
        };
        fetch(url, options)
            .then( res => event.target.value = "" );
    }
    else {
        event.target.value = "";
    }
});

exportCSV.addEventListener("click", function() {
    const url = 'https://metaversochat.youbot.us/api/export-chat/';
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
