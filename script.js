// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD4ltScDvqCBBVNjnD133OVqUHxZwqalco",
    authDomain: "kbmvnkg.firebaseapp.com",
    projectId: "kbmvnkg",
    storageBucket: "kbmvnkg.appspot.com",
    messagingSenderId: "985508154826",
    appId: "1:985508154826:web:efc876ef99aa50a50a9333",
    measurementId: "G-5E8QM3HENB"
  };
  

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const analytics = firebase.analytics();

const app = document.getElementById('app');
const notification = document.getElementById('notification');
let currentRoomCode = '';
let isOwner = false;
let lastMessageTimestamp = 0;
let currentUserId = null;

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function generateUserId() {
    return Math.random().toString(36).substr(2, 9);
}

function showLobby() {
    app.innerHTML = `
        <div class="header">ยินดีต้อนรับสู่ระบบห้องแชท</div>
        <div class="content lobby">
            <div class="input-group">
                <input type="text" id="roomCodeInput" placeholder="ใส่รหัสห้องแชท">
                <button class="button join-button" onclick="joinRoom()">เข้าร่วม</button>
            </div>
            <button class="button create-button" onclick="createRoom()">สร้างห้องใหม่</button>
        </div>
    `;
}

function showChatRoom(roomCode) {
    currentRoomCode = roomCode;
    let headerContent = isOwner 
        ? `<div class="room-code">รหัสห้อง: ${roomCode}<i class="fas fa-copy copy-icon" onclick="copyRoomCode()"></i></div>`
        : 'ห้องแชท';
    app.innerHTML = `
        <div class="header">
            ${headerContent}
            ${isOwner ? `<button class="button" onclick="deleteRoom()">ปิดการแชท</button>` : `<button class="button" onclick="leaveRoom()">ออกจากห้อง</button>`}
        </div>
        <div class="content">
            <div class="chat-messages" id="chatMessages"></div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="พิมพ์ข้อความ...">
                <div class="button-group">
                    <input type="file" id="imageUpload" class="image-upload" accept="image/*" onchange="sendImage(event)">
                    <label for="imageUpload" class="image-upload-label"><i class="fas fa-image"></i></label>
                    <button class="button send-button" onclick="sendMessage()">ส่ง</button>
                </div>
            </div>
        </div>
    `;
    loadMessages();
    startCheckingNewMessages();
}

function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.toUpperCase();
    if (!roomCode) {
        showNotification('กรุณาใส่รหัสห้อง', 'error');
        return;
    }
    
    database.ref('rooms/' + roomCode).once('value')
        .then((snapshot) => {
            const roomData = snapshot.val();
            if (!roomData) {
                showNotification('ไม่พบห้องนี้', 'error');
                return;
            }

            if (roomData.participants.length >= 2) {
                showNotification('ห้องแชทเต็มแล้ว', 'error');
                return;
            }

            if (!currentUserId) {
                currentUserId = generateUserId();
            }

            if (!roomData.participants.includes(currentUserId)) {
                roomData.participants.push(currentUserId);
                database.ref('rooms/' + roomCode).set(roomData);
            }

            isOwner = roomData.owner === currentUserId;
            showChatRoom(roomCode);
        })
        .catch((error) => {
            showNotification('เกิดข้อผิดพลาดในการเข้าร่วมห้อง', 'error');
        });
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = 'notification show';
    if (type === 'error') {
        notification.classList.add('error');
    } else if (type === 'success') {
        notification.classList.add('success');
    }
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function createRoom() {
    const newRoomCode = generateRoomCode();
    if (!currentUserId) {
        currentUserId = generateUserId();
    }
    const roomData = {
        owner: currentUserId,
        participants: [currentUserId],
        messages: []
    };
    database.ref('rooms/' + newRoomCode).set(roomData)
        .then(() => {
            isOwner = true;
            showChatRoom(newRoomCode);
        })
        .catch((error) => {
            showNotification('เกิดข้อผิดพลาดในการสร้างห้อง', 'error');
        });
}

function deleteRoom() {
    database.ref('rooms/' + currentRoomCode).remove()
        .then(() => {
            showNotification('ปิดห้องแชทแล้ว', 'success');
            setTimeout(() => {
                showLobby();
            }, 1500);
        })
        .catch((error) => {
            showNotification('เกิดข้อผิดพลาดในการปิดห้อง', 'error');
        });
}

function leaveRoom() {
    database.ref('rooms/' + currentRoomCode + '/participants').once('value')
        .then((snapshot) => {
            let participants = snapshot.val() || [];
            participants = participants.filter(id => id !== currentUserId);
            return database.ref('rooms/' + currentRoomCode + '/participants').set(participants);
        })
        .then(() => {
            showLobby();
        })
        .catch((error) => {
            showNotification('เกิดข้อผิดพลาดในการออกจากห้อง', 'error');
        });
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        saveMessage(message, isOwner ? 'owner' : 'participant', 'text');
        messageInput.value = '';
    }
}

function sendImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            saveMessage(imageData, isOwner ? 'owner' : 'participant', 'image');
        }
        reader.readAsDataURL(file);
    }
}

function saveMessage(content, sender, type) {
    const timestamp = Date.now();
    const newMessage = { content, sender, type, timestamp };
    database.ref('rooms/' + currentRoomCode + '/messages').push(newMessage);
}

function loadMessages() {
    database.ref('rooms/' + currentRoomCode + '/messages').on('value', (snapshot) => {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        const messages = snapshot.val();
        if (messages) {
            Object.values(messages).forEach(msg => {
                addMessageToChatWindow(msg.content, msg.sender, msg.type);
                if (msg.timestamp > lastMessageTimestamp) {
                    lastMessageTimestamp = msg.timestamp;
                }
            });
        }
    });
}

function addMessageToChatWindow(content, sender, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if ((isOwner && sender === 'owner') || (!isOwner && sender === 'participant')) {
        messageElement.classList.add('owner-message');
    } else {
        messageElement.classList.add('participant-message');
    }
    
    if (type === 'text') {
        messageElement.textContent = content;
    } else if (type === 'image') {
        const img = document.createElement('img');
        img.src = content;
        messageElement.appendChild(img);
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function startCheckingNewMessages() {
    database.ref('rooms/' + currentRoomCode + '/messages').on('child_added', (snapshot) => {
        const newMessage = snapshot.val();
        if (newMessage.timestamp > lastMessageTimestamp) {
            addMessageToChatWindow(newMessage.content, newMessage.sender, newMessage.type);
            lastMessageTimestamp = newMessage.timestamp;
        }
    });
}

function copyRoomCode() {
    navigator.clipboard.writeText(currentRoomCode).then(() => {
        showNotification('คัดลอกแล้ว', 'success');
    }).catch(err => {
        console.error('ไม่สามารถคัดลอกข้อความ: ', err);
        showNotification('ไม่สามารถคัดลอกข้อความ', 'error');
    });
}

if (!currentUserId) {
    currentUserId = generateUserId();
}
showLobby();