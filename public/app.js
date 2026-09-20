const socket = io();

let currentRoomId = null;
let username = null;


// Elementos

const createRoomForm =
    document.getElementById("createRoomForm");

const usernameInput =
    document.getElementById("usernameInput");

const roomNameInput =
    document.getElementById("roomNameInput");

const roomsList =
    document.getElementById("roomsList");

const messages =
    document.getElementById("messages");

const roomTitle =
    document.getElementById("roomTitle");

const usersCount =
    document.getElementById("usersCount");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const leaveButton =
    document.getElementById("leaveButton");


// Criar sala

createRoomForm.addEventListener("submit", (event) => {

    event.preventDefault();

    username = usernameInput.value.trim();

    const roomName =
        roomNameInput.value.trim();

    if (!username || !roomName) {
        return;
    }

    socket.emit("room:create", {
        username,
        roomName
    });

});


// Listar salas

socket.on("rooms:list", (rooms) => {

    roomsList.innerHTML = "";

    if (rooms.length === 0) {

        roomsList.innerHTML =
            "<p>Nenhum chat criado.</p>";

        return;
    }

    rooms.forEach(room => {

        const element =
            document.createElement("div");

        element.className = "room";

        element.innerHTML = `
            <div class="room-name">
                ${escapeHtml(room.name)}
            </div>

            <div class="room-users">
                ${room.users} usuário(s)
            </div>
        `;

        element.addEventListener("click", () => {

            if (!username) {

                username =
                    prompt("Digite seu nome:");

                if (!username) {
                    return;
                }

                username =
                    username.trim();
            }

            socket.emit("room:join", {
                roomId: room.id,
                username
            });

        });

        roomsList.appendChild(element);

    });

});


// Entrou na sala

socket.on("room:joined", (room) => {

    currentRoomId = room.id;

    roomTitle.textContent = room.name;

    messages.innerHTML = "";

    room.messages.forEach(message => {
        addMessage(message);
    });

    messageInput.focus();

});


// Nova mensagem

socket.on("message:new", (message) => {

    addMessage(message);

});


// Usuário entrou

socket.on("user:joined", ({ username }) => {

    addSystemMessage(
        `${username} entrou no chat.`
    );

});


// Usuário saiu

socket.on("user:left", ({ username }) => {

    addSystemMessage(
        `${username} saiu do chat.`
    );

});


// Número de usuários

socket.on("room:users", ({ count }) => {

    usersCount.textContent =
        `${count} usuário(s)`;

});


// Erro

socket.on("room:error", (message) => {

    alert(message);

});


// Enviar mensagem

messageForm.addEventListener("submit", (event) => {

    event.preventDefault();

    if (!currentRoomId) {
        return;
    }

    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }

    socket.emit("message:send", {
        roomId: currentRoomId,
        message
    });

    messageInput.value = "";

    messageInput.focus();

});


// Sair

leaveButton.addEventListener("click", () => {

    if (!currentRoomId) {
        return;
    }

    socket.emit("room:leave");

    currentRoomId = null;

    roomTitle.textContent =
        "Selecione um chat";

    usersCount.textContent =
        "0 usuários";

    messages.innerHTML = "";

});


// Adicionar mensagem

function addMessage(message) {

    const element =
        document.createElement("div");

    element.className = "message";

    const date =
        new Date(message.timestamp);

    element.innerHTML = `
        <div>
            <span class="message-user">
                ${escapeHtml(message.username)}
            </span>

            <span class="message-time">
                ${date.toLocaleTimeString()}
            </span>
        </div>

        <div class="message-text">
            ${escapeHtml(message.message)}
        </div>
    `;

    messages.appendChild(element);

    messages.scrollTop =
        messages.scrollHeight;
}


// Mensagem do sistema

function addSystemMessage(message) {

    const element =
        document.createElement("div");

    element.className = "message";

    element.innerHTML = `
        <div class="message-text">
            <i>${escapeHtml(message)}</i>
        </div>
    `;

    messages.appendChild(element);

    messages.scrollTop =
        messages.scrollHeight;
}


// Segurança contra HTML

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}