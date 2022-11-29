import { Play } from './sockets/playSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';

const name = document.getElementById('name');
const code = document.getElementById('code');
const joinButton = document.querySelector('.join-button');
const joinForm = document.getElementById('join-form');

const socket = io();
const host = Play(socket);

const handleJoin = (e) => {
	e.preventDefault();

	showMessage('info', 'Attempting to join game...');
	socket.emit('join-game', {
		name: name.value,
		joinCode: code.value,
	});
};

document.addEventListener('DOMContentLoaded', (e) => {
	joinForm.addEventListener('submit', handleJoin);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
