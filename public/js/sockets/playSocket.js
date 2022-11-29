const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
const chatMessage = document.getElementById('chat-message');

import { setUserCookie } from '../utils/cookie.js';
import { showMessage } from '../utils/messages.js';

export const Play = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-joined', (data) => {
		console.log(data);
		document.querySelector('.top-navbar').classList.add('invisible-div');
		document.getElementById('join-div').classList.add('invisible-div');
		document.getElementById('game-container').classList.remove('invisible-div');
		mainContent.classList.add('top-unset');
		mainContent.classList.add('h-100');
		slideShowContainer.classList.remove('invisible-div');
	});
};
