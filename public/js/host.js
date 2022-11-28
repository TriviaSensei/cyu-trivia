import { Host } from './sockets/hostSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';

const socket = io();
const host = Host(socket);

document.addEventListener('DOMContentLoaded', (e) => {
	const startButtons = getElementArray(document, '.start-button');
	startButtons.forEach((b) => {
		b.addEventListener('click', (e) => {
			socket.emit('start-game', {
				_id: e.target.getAttribute('data-id'),
			});
		});
	});
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
