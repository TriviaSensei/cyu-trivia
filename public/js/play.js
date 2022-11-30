import { Play } from './sockets/playSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { withTimeout } from './utils/socketTimeout.js';
import { createChatMessage } from './utils/chatMessage.js';

const name = document.getElementById('name');
const code = document.getElementById('code');
const joinButton = document.querySelector('.join-button');
const joinForm = document.getElementById('join-form');

const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const gameChat = document.getElementById('all-chat');

const socket = io();
const host = Play(socket);

const handleSendChat = (e) => {
	if (
		e.key &&
		e.key.toUpperCase() !== 'ENTER' &&
		e.key.toUpperCase() !== 'RETURN'
	)
		return;

	if (chatMessage.value.trim() === '') return;

	e.preventDefault();

	socket.emit(
		'game-chat',
		{
			message: chatMessage.value,
		},
		withTimeout(
			(data) => {
				if (data.status !== 'OK') return;
				const newMessage = createChatMessage(data.id, data.message, 'Me', 'me');
				chatMessage.value = '';
				if (newMessage) {
					gameChat.appendChild(newMessage);
					gameChat.scrollTop = gameChat.scrollHeight;
				}
			},
			() => {
				showMessage('error', 'Message timed out - try again', 1000);
			},
			1000
		)
	);
};

const handleJoin = (e) => {
	e.preventDefault();

	showMessage('info', 'Attempting to join game...');
	socket.emit('join-game', {
		name: name.value,
		joinCode: code.value,
	});
};

window.addEventListener('load', (e) => {
	joinForm.addEventListener('submit', handleJoin);
	chatMessage.addEventListener('keydown', handleSendChat);
	chatButton.addEventListener('click', handleSendChat);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
