/*
 * PROJECT: Real-Time Multiplayer Bingo Engine
 * DEVELOPER: Vedant
 */

const express = require('express');
const http = require('http');
const { Server } = require("socket.io"); // Library for WebSocket Protocol
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors()); // Using CORS for My Frontend to Comunnicate with Backend with Sequrity 
app.use(express.static(path.join(__dirname, 'public'))); 
// This Line is use for Connecting the server to public folder Whhere my Frontend Files are present

// SERVER INITIALIZATION
// I wrap Express in a standard HTTP server to attach the Socket.io instance
const server = http.createServer(app);
const io = new Server(server);

//GLOBAL STATE MANAGEMENT Same as my Lost and Found In-Memory Array
let players = {};        // Map: { socketId: { name, score } }
let currentNumber = 0;   // The current active ball
let drawnNumbers = [];   // History of called numbers (to prevent duplicates)
let gameInterval;        // Reference to the Ticker Timer

// This Makes Connection Between Different Users(The Logic of Multiplayer)
io.on('connection', (socket) => {
    console.log(`⚡ [CONNECT] New Client: ${socket.id}`);

    // PLAYER REGISTRATION(Here I allows to play this game by Duo or Squad Not more than 4 players)
    socket.on('joinGame', (name) => {
        // Room Capacity Logic
        if (Object.keys(players).length >= 4) {
            socket.emit('errorMsg', "Room Full! (Max 4 Players)");
            return;
        }

        // Register new player
        players[socket.id] = { name: name, score: 0 };
        
        //When New Players Join The List is updates Immediately
        io.emit('updatePlayerList', Object.values(players));
        console.log(` ${name} joined the lobby.`);
    });

    // GAME INITIATION(I give this Responsibility to Host Only)
    socket.on('startGame', () => {
        console.log(" Game Sequence Started");
        drawnNumbers = []; // Reset State
        io.emit('gameStarted'); // Trigger all users Switch

        // CENTRALIZED TICKER LOOP
        // Here the Logic is server pushes data at fixed intervals
        clearInterval(gameInterval);
        gameInterval = setInterval(() => {
            // End Condition is All numbers exhausted
            if (drawnNumbers.length >= 75) {
                clearInterval(gameInterval);
                return;
            }

            // The Heart of the Game : Algorithm for Unique Random Number Generation between  1 to 75 
            let num;
            do {
                num = Math.floor(Math.random() * 75) + 1;
            } while (drawnNumbers.includes(num));

            drawnNumbers.push(num);
            currentNumber = num;
            
            // Generating new Number to all users Simultaneously
            io.emit('newNumber', currentNumber);
        }, 5000); // Generating new Number after every 5 Seconds
    });

    // WIN CONDITION CHECK
    socket.on('claimBingo', () => {
        const winnerName = players[socket.id].name;
        // Game Over state to stop the loop on all User
        io.emit('gameOver', winnerName);
        clearInterval(gameInterval); // Stop server ticker
    });

    // DISCONNECT HANDLING
    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('updatePlayerList', Object.values(players)); // Refresh lists
    });
});

server.listen(5000, () => {
    console.log('🔥 WebSocket Server Active on Port 5000');
});