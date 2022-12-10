const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
import { createChatMessage } from '../utils/chatMessage.js';
import { setUserCookie, getCookie } from '../utils/cookie.js';
import { getElementArray } from '../utils/getElementArray.js';
import { hideMessage, showMessage } from '../utils/messages.js';
import { createSlide, modifySlide } from '../utils/slideshow.js';
const gameRoster = document.getElementById('game-roster-list');
const chatContainer = document.querySelector('.chat-container');

const myCarousel = document.querySelector('#game-carousel');
const slideCarousel = new bootstrap.Carousel(myCarousel);
const myCarouselInner = myCarousel.querySelector('.carousel-inner');

const handleNewSlide = (data, ...toSetActive) => {
	console.log(data);

	let setActive = true;
	if (toSetActive.length > 0) {
		if (!toSetActive[0]) setActive = false;
	}

	if (data.clear) {
		getElementArray(myCarousel, '.carousel-item').forEach((item) => {
			item.remove();
		});
	}
	if (data.clear || data.new) {
		const newSlide = createSlide(data);
		myCarouselInner.appendChild(newSlide);
		if (setActive) {
			myCarousel
				.querySelector('.carousel-item.active')
				?.classList.remove('active');
			newSlide.classList.add('active');
		}
	} else {
		modifySlide(data);
	}
};

export const Host = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-started', (data) => {
		hideMessage();

		const myId = getCookie('id');

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

		currentSlides.forEach((s) => {
			if (Array.isArray(s)) {
				s.forEach((s2) => {
					handleNewSlide(s2);
				});
			} else {
				handleNewSlide(s);
			}
		});

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
