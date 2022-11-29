const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
import { createChatMessage } from '../utils/chatMessage.js';
import { setUserCookie, getCookie } from '../utils/cookie.js';
import { showMessage } from '../utils/messages.js';

const chatContainer = document.querySelector('.chat-container');

export const Host = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-started', (data) => {
		const myId = getCookie('id');

		if (data.newGame.chat) {
			data.newGame.chat.forEach((m) => {
				const newMessage = createChatMessage(
					data.newGame.id,
					m.text,
					myId === m.uid ? 'Me' : m.name,
					myId === m.uid ? 'me' : 'other',
					m.isHost ? 'host' : null
				);
				chatContainer.appendChild(newMessage);
			});
		}

		let currentSlides = [];
		for (var i = 0; i <= data.newGame.currentSlide; i++) {
			if (data.newGame.slides[i].clear) {
				currentSlides = [];
			}
			currentSlides.push(data.newGame.slides[i]);
		}

		console.log(currentSlides);

		document.querySelector('.top-navbar').classList.add('invisible-div');
		document.getElementById('assigned-games').classList.add('invisible-div');
		document
			.getElementById('hosting-container')
			.classList.remove('invisible-div');
		mainContent.classList.add('top-unset');
		mainContent.classList.add('h-100');
		slideShowContainer.classList.remove('invisible-div');
	});

	socket.on('game-chat', (data) => {
		let newMessage;
		if (data.isSystem)
			newMessage = createChatMessage(
				data.id,
				data.message,
				data.from,
				'system'
			);
		else newMessage = createChatMessage(data.id, data.message, data.from);
		chatContainer.appendChild(newMessage);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	});
};
