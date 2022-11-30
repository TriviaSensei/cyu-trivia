const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
const chatMessage = document.getElementById('chat-message');

import { setUserCookie, getCookie } from '../utils/cookie.js';
import { showMessage, hideMessage } from '../utils/messages.js';
import { createChatMessage } from '../utils/chatMessage.js';

const gameChat = document.getElementById('all-chat');

export const Play = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-joined', (data) => {
		console.log(data);
		const myId = getCookie('id');
		console.log(myId);
		showMessage('info', 'Successfully joined game');

		if (data.chat) {
			data.chat.forEach((m) => {
				const newMessage = createChatMessage(
					data.id,
					m.text,
					myId === m.uid ? 'Me' : m.name,
					myId === m.uid ? 'me' : m.uid === 'system' ? 'system' : 'other',
					m.isHost ? 'host' : null
				);
				gameChat.appendChild(newMessage);
			});
		}

		document.querySelector('.top-navbar').classList.add('invisible-div');
		document.getElementById('join-div').classList.add('invisible-div');
		document.getElementById('game-container').classList.remove('invisible-div');
		mainContent.classList.add('top-unset');
		mainContent.classList.add('h-100');
		slideShowContainer.classList.remove('invisible-div');
	});

	socket.on('game-chat', (data) => {
		console.log(data);
		const newMessage = createChatMessage(
			data.id,
			data.message,
			data.from,
			'other',
			data.isHost ? 'host' : null
		);

		gameChat.appendChild(newMessage);
		gameChat.scrollTop = gameChat.scrollHeight;
	});
};
