const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = process.env.PORT || 5000;



// App
app.set('port', port);

app.use('/static', express.static(__dirname + '/static'));

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});



const words = require('an-array-of-english-words');

function getWords() {
    const result = [];
    while (result.length < 100) {
        const index = Math.floor(Math.random() * words.length);
        const word = words[index];
        if (word.length <= 8) {
            result.push(word);
        }
    }
    return result;
}

const START_TIME = 3;
const GAME_TIME = 60;
const queue = {};
const games = {};
const players = {};

// socket.io
io.on('connection', function(socket) {
    socket.on('start', function() {
        if (queue[socket.id]) {
            return;
        }
        const playersWaiting = Object.keys(queue);
        if (playersWaiting.length > 0) {
            const opponent = queue[playersWaiting[0]];
            delete queue[opponent.id];
            let gameID = crypto.randomBytes(8).toString('hex');
            while (games[gameID]) {
                gameID = crypto.randomBytes(8).toString('hex');
            }
            games[gameID] = {
                id: gameID,
                player1: socket,
                player2: opponent,
                words: getWords(),
                player1Position: 0,
                player2Position: 0,
                startTime: START_TIME,
                startTimer: undefined,
                gameTime: 0,
                gameTimer: undefined
            };
            players[socket.id] = gameID;
            players[opponent.id] = gameID;
            games[gameID].player1.emit('game_words', games[gameID].words);
            games[gameID].player2.emit('game_words', games[gameID].words);
            games[gameID].startTimer = setInterval(function (gameID) {
                if (games[gameID].startTime >= 0) {
                    games[gameID].player1.emit('game_start', games[gameID].startTime);
                    games[gameID].player2.emit('game_start', games[gameID].startTime);
                    games[gameID].startTime--;
                } else {
                    clearInterval(games[gameID].startTimer);
                    games[gameID].gameTimer = setInterval(function (gameID) {
                        if (games[gameID].gameTime >= GAME_TIME) {
                            clearInterval(games[gameID].gameTimer);
                            const player1WPM = Math.ceil(games[gameID].player1Position / games[gameID].gameTime * 60);
                            const player2WPM = Math.ceil(games[gameID].player2Position / games[gameID].gameTime * 60);
                            const didPlayer1Win = player1WPM >= player2WPM;
                            games[gameID].player1.emit('game_over', {
                                'wpm': player1WPM,
                                'won': didPlayer1Win
                            });
                            games[gameID].player2.emit('game_over', {
                                'wpm': player2WPM,
                                'won': !didPlayer1Win
                            });
                            delete players[games[gameID].player1.id];
                            delete players[games[gameID].player2.id];
                            delete games[gameID];
                        } else {
                            games[gameID].gameTime++;
                            const player1WPM = Math.ceil(games[gameID].player1Position / games[gameID].gameTime * 60);
                            const player2WPM = Math.ceil(games[gameID].player2Position / games[gameID].gameTime * 60);
                            games[gameID].player1.emit('game_timer', {
                                'time': games[gameID].gameTime,
                                'your_wpm': player1WPM,
                                'opponent_wpm': player2WPM
                            });
                            games[gameID].player2.emit('game_timer', {
                                'time': games[gameID].gameTime,
                                'your_wpm': player2WPM,
                                'opponent_wpm': player1WPM
                            });
                        }
                    }, 1000, gameID);
                }
            }, 1000, gameID);
        } else {
            queue[socket.id] = socket;
        }
    });
    socket.on('type', () => {
        if (players[socket.id]) {
            const gameID = players[socket.id];
            const isPlayer1 = games[gameID].player1.id === socket.id;
            if (isPlayer1) {
                games[gameID].player1Position++;
            } else {
                games[gameID].player2Position++;
            }
        }
    });
    socket.on('disconnect', function() {
        if (queue[socket.id]) {
            delete queue[socket.id];
        }
        if (players[socket.id]) {
            const gameID = players[socket.id];
            const isPlayer1 = games[gameID].player1.id === socket.id;
            if (isPlayer1) {
                games[gameID].player2.emit('game_disconnect');
            } else {
                games[gameID].player1.emit('game_disconnect');
            }
        }
    });
});



server.listen(port, function() {
    console.log(`Starting server on port ${port}...`);
});
