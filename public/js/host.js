import { Host } from './sockets/hostSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { createChatMessage } from './utils/chatMessage.js';
import { withTimeout } from './utils/socketTimeout.js';

const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const chatContainer = document.querySelector('.chat-container');

const socket = io();
const host = Host(socket);

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
				const newMessage = createChatMessage(
					data.id,
					data.message,
					'Me',
					'me',
					'host'
				);
				chatMessage.value = '';
				if (newMessage) {
					chatContainer.appendChild(newMessage);
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			},
			() => {
				showMessage('error', 'Message timed out - try again', 1000);
			},
			1000
		)
	);
};

document.addEventListener('DOMContentLoaded', (e) => {
	const startButtons = getElementArray(document, '.start-button');
	startButtons.forEach((b) => {
		b.addEventListener('click', (e) => {
			socket.emit('start-game', {
				_id: e.target.getAttribute('data-id'),
			});
			showMessage('info', 'Starting game...', 3000);
		});
	});
	chatMessage.addEventListener('keydown', handleSendChat);
	chatButton.addEventListener('click', handleSendChat);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
