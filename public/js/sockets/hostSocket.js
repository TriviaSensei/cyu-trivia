const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
import { createChatMessage } from '../utils/chatMessage.js';
import { setUserCookie, getCookie } from '../utils/cookie.js';
import { getElementArray } from '../utils/getElementArray.js';
import { hideMessage, showMessage } from '../utils/messages.js';

const gameRoster = document.getElementById('game-roster-list');
const chatContainer = document.querySelector('.chat-container');

export const Host = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-started', (data) => {
		hideMessage();

		const myId = getCookie('id');

		console.log(data);

		if (data.newGame.chat) {
			data.newGame.chat.forEach((m) => {
				const newMessage = createChatMessage(
					data.newGame.id,
					m.text,
					myId === m.user.id ? 'Me' : m.user.name,
					myId === m.user.id
						? 'me'
						: m.user.id === 'system'
						? 'system'
						: 'other',
					m.isHost ? 'host' : null
				);
				chatContainer.appendChild(newMessage);
			});
			setTimeout(() => {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 10);
		}

		let currentSlides = data.newGame.slides.slice(
			0,
			data.newGame.currentSlide + 1
		);

		gameRoster.innerHTML = '';
		const me = document.createElement('li');
		me.setAttribute('data-id', data.newGame.host.id);
		me.innerHTML = `${data.newGame.host.name} (Host)`;
		gameRoster.appendChild(me);
		data.newGame.players.forEach((p) => {
			const b = document.createElement('li');
			if (!p.connected) b.classList.add('disconnected');
			b.setAttribute('data-id', p.id);
			b.innerHTML = p.name;
			gameRoster.appendChild(b);
		});

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
		console.log(data);
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

	socket.on('user-deleted', (data) => {
		const bps = getElementArray(document, `li[data-id="${data.id}"]`);
		bps.forEach((b) => {
			b.remove();
		});
	});

	socket.on('user-joined', (data) => {
		const bp = document.createElement('li');
		bp.setAttribute('data-id', data.id);
		bp.innerHTML = `${data.name}`;
		gameRoster.appendChild(bp);
	});

	socket.on('user-disconnected', (data) => {
		const bps = getElementArray(document, `li[data-id="${data.id}"]`);
		bps.forEach((b) => {
			b.classList.add('disconnected');
		});
	});

	socket.on('user-reconnected', (data) => {
		const bps = getElementArray(document, `li[data-id="${data.id}"]`);
		bps.forEach((b) => {
			b.classList.remove('disconnected');
		});
	});
};
