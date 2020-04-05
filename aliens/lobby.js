"use strict";

let sendServerHost = function(data) {return false;}
let sendServerJoin = function(data) {return false;}

var player_id = -1

function send_server_host(data) {
    sendServerHost(data);
}

function send_server_join(data) {
    sendServerJoin(data);
}

function make_player_block(name) {
    var a = document.createElement("A");
    a.className = 'panel-block';
    a.innerHTML = name;
    return a;
}

function insertAfter(existingNode, newNode)
{
    existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
}

function update_lobby(lobby_data)
{
    console.log(lobby_data);
    var player_count = document.getElementById('player-count');
    player_count.innerHTML = lobby_data.players.length + '/' + lobby_data.max_players;
    var game_id = document.getElementById('game-id');
    game_id.innerHTML = lobby_data.id;
    var tabs = document.getElementById('lobby-tabs');
    while (tabs.nextSibling.id != 'lobby-modal-host-start') {
        tabs.nextSibling.parentNode.removeChild(tabs.nextSibling);
    }

    console.log(tabs);
    for (var i = lobby_data.players.length - 1; i >= 0; --i)
    {
        var block = make_player_block(lobby_data.players[i]);
        insertAfter(tabs, block);
    }
}

function setupLobby(name, max_players, server, update_callback) {
    var ws = new WebSocket("wss://" + server);

    ws.onopen = function(event) {
        ws.send(JSON.stringify({
            type: 'new-lobby',
            name: name,
            max_players: max_players,
        }));
    }

    ws.onmessage = function(event) {
        console.log('SERVER MSG', event.data);
        let msg = JSON.parse(event.data);
        switch (msg.type) {
            case 'player-update':
                update_callback(msg);
                break;
            case 'player-dropped':
                update_callback(msg);
                break;
            case 'lobby-update':
                player_id = msg.player_id;
                update_callback({
                    type: 'player-list-update',
                    players: msg.data.players,
                });
                update_lobby(msg.data);
                break;
        }
    }

    ws.onclose = function(event) {
        console.log("SERVER CONNECTION CLOSED");
    }

    sendServerHost = function(data) {
        if (ws.readyState === WebSocket.OPEN) {
            console.log("SENDING", data);
            ws.send(data);
            return true;
        }
        return false;
    }
}

function connectToLobby(name, game_id, server, update_callback) {
    var ws = new WebSocket("wss://" + server);

    ws.onopen = function(event) {
        console.log('SERVER CONNECTED');

        ws.send(JSON.stringify({
            type: 'join-lobby',
            game_id: game_id,
            name: name,
        }));
    }

    ws.onmessage = function(event) {
        let msg = JSON.parse(event.data);
        console.log('SERVER MSG', msg);
        switch (msg.type) {
            case 'lobby-update':
                player_id = msg.player_id;
                update_lobby(msg.data);
                break;
            case 'game-update':
                console.log("Game Update");
                update_callback(msg);
                break;
            case 'lobby-full':
                console.log("Lobby is full");
                break;
            case 'no-such-lobby':
                console.log('Invalid lobby ' + game_id);
                break;
            default:
                console.log('Unknown message type');
                break;
        }
    }

    ws.onclose = function(event) {
        console.log("SERVER CONNECTION CLOSED");
    }

    sendServerJoin = function(data) {
        if (ws.readyState === WebSocket.OPEN) {
            console.log("SENDING", data);
            ws.send(data);
            return true;
        }
        return false;
    }
}
