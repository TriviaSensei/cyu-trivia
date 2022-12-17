import { Host } from './sockets/hostSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { createChatMessage } from './utils/chatMessage.js';
import { withTimeout } from './utils/socketTimeout.js';

const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const chatContainer = document.querySelector('.chat-container');

const gradingContainer = document.querySelector('.grading-container');
const roundSelector = document.getElementById('round-selector');
const modeSelector = document.getElementById('mode-selector');
const roundGradingInd = document.getElementById('round-grading-ind');
const roundModeInd = document.getElementById('round-mode-ind');

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

const changeGradingView = (e) => {
	const selectedRound = roundSelector.value;
	const selectedMode = modeSelector.value;

	const currentView = gradingContainer.querySelector(
		'.round-grading-container:not(.invisible-div)'
	);

	const newView = document.querySelector(`#${selectedMode}-${selectedRound}`);
	if (newView && currentView) {
		roundModeInd.innerHTML =
			selectedMode === 'grading' ? 'Grading' : 'Adjustments';
		roundGradingInd.innerHTML = selectedRound;
		currentView.classList.add('invisible-div');
		newView.classList.remove('invisible-div');
	}
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
	roundSelector.addEventListener('change', changeGradingView);
	modeSelector.addEventListener('change', changeGradingView);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
