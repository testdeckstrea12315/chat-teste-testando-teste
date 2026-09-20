const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

/*
    Estrutura:

    rooms = {
        roomId: {
            id: "...",
            name: "...",
            users: Map(),
            messages: []
        }
    }
*/

const rooms = new Map();


// ==========================================
// CONEXÃO
// ==========================================

io.on("connection", (socket) => {

    console.log("Usuário conectado:", socket.id);

    // Envia as salas existentes
    socket.emit("rooms:list", getRooms());


    // ==========================================
    // CRIAR SALA
    // ==========================================

    socket.on("room:create", ({ roomName, username }) => {

        if (!roomName || !username) {
            return;
        }

        const roomId = crypto.randomUUID();

        const room = {
            id: roomId,
            name: roomName,
            users: new Map(),
            messages: []
        };

        rooms.set(roomId, room);

        console.log("Sala criada:", room);

        // Atualiza todos os clientes
        io.emit("rooms:list", getRooms());

        // Coloca o criador dentro da sala
        joinRoom(socket, roomId, username);
    });


    // ==========================================
    // ENTRAR NA SALA
    // ==========================================

    socket.on("room:join", ({ roomId, username }) => {

        if (!roomId || !username) {
            return;
        }

        const room = rooms.get(roomId);

        if (!room) {

            socket.emit(
                "room:error",
                "Sala não encontrada."
            );

            return;
        }

        joinRoom(socket, roomId, username);
    });


    // ==========================================
    // ENVIAR MENSAGEM
    // ==========================================

    socket.on("message:send", ({ roomId, message }) => {

        const room = rooms.get(roomId);

        if (!room) {
            return;
        }

        const user = room.users.get(socket.id);

        if (!user) {
            return;
        }

        if (!message || !message.trim()) {
            return;
        }

        const chatMessage = {
            username: user.username,
            message: message.trim(),
            timestamp: new Date().toISOString()
        };

        // Salva mensagem
        room.messages.push(chatMessage);

        // Envia para todos da sala
        io.to(roomId).emit(
            "message:new",
            chatMessage
        );
    });


    // ==========================================
    // SAIR DA SALA
    // ==========================================

    socket.on("room:leave", () => {

        leaveCurrentRoom(socket);

    });


    // ==========================================
    // DESCONECTAR
    // ==========================================

    socket.on("disconnect", () => {

        console.log(
            "Usuário desconectado:",
            socket.id
        );

        leaveCurrentRoom(socket);

    });

});


// ==========================================
// ENTRAR NA SALA
// ==========================================

function joinRoom(socket, roomId, username) {

    // Se estiver em outra sala,
    // sai primeiro
    leaveCurrentRoom(socket);


    const room = rooms.get(roomId);

    if (!room) {
        return;
    }


    // IMPORTANTE:
    // garante que users seja um Map
    if (!(room.users instanceof Map)) {

        room.users = new Map();

    }


    // Entra no Socket.IO room
    socket.join(roomId);


    // Adiciona usuário
    room.users.set(socket.id, {
        username: username
    });


    // Guarda informações no socket
    socket.data.roomId = roomId;
    socket.data.username = username;


    console.log(
        `${username} entrou na sala ${room.name}`
    );


    // Envia informações para quem entrou
    socket.emit("room:joined", {

        id: room.id,

        name: room.name,

        messages: room.messages

    });


    // Avisa os outros usuários
    socket.to(roomId).emit(
        "user:joined",
        {
            username: username
        }
    );


    // Atualiza número de usuários
    io.to(roomId).emit(
        "room:users",
        {
            count: room.users.size
        }
    );


    // Atualiza lista de salas
    io.emit(
        "rooms:list",
        getRooms()
    );
}


// ==========================================
// SAIR DA SALA
// ==========================================

function leaveCurrentRoom(socket) {

    const roomId = socket.data.roomId;

    // Não está em nenhuma sala
    if (!roomId) {
        return;
    }


    const room = rooms.get(roomId);

    if (!room) {

        delete socket.data.roomId;
        delete socket.data.username;

        return;
    }


    const username =
        socket.data.username;


    // Remove usuário
    room.users.delete(socket.id);


    // Sai do Socket.IO room
    socket.leave(roomId);


    // Avisa os outros
    socket.to(roomId).emit(
        "user:left",
        {
            username: username
        }
    );


    // Atualiza quantidade
    io.to(roomId).emit(
        "room:users",
        {
            count: room.users.size
        }
    );


    // Remove informações do socket
    delete socket.data.roomId;
    delete socket.data.username;


    // Se não existe mais ninguém,
    // remove a sala
    if (room.users.size === 0) {

        rooms.delete(roomId);

        console.log(
            `Sala removida: ${room.name}`
        );

    }


    // Atualiza salas para todos
    io.emit(
        "rooms:list",
        getRooms()
    );
}


// ==========================================
// LISTAR SALAS
// ==========================================

function getRooms() {

    return Array.from(rooms.values()).map(
        (room) => {

            return {
                id: room.id,
                name: room.name,
                users: room.users.size
            };

        }
    );

}


// ==========================================
// SERVIDOR
// ==========================================

server.listen(3000, () => {

    console.log(
        "Servidor rodando em:"
    );

    console.log(
        "http://localhost:3000"
    );

});