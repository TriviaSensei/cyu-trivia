const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
const chatMessage = document.getElementById('chat-message');

import { setUserCookie, getCookie } from '../utils/cookie.js';
import { showMessage, hideMessage } from '../utils/messages.js';
import { createChatMessage } from '../utils/chatMessage.js';

const gameChat = document.getElementById('all-chat');
const teamList = document.querySelector('.team-list');

const teamSetup = document.querySelector('.team-setup');
const teamContainer = document.querySelector('.team-container');

export const Play = (socket) => {
	const handleNewTeam = (data) => {
		const newTile = document.createElement('div');
		newTile.classList.add('team-tile');

		const butt = document.createElement('button');
		butt.classList.add('join-team');
		butt.innerHTML = 'Join';
		butt.setAttribute('data-id', data.id);
		butt.addEventListener('click', handleJoinRequest);
		const label = document.createElement('div');
		label.classList.add('team-name-label');
		label.innerHTML = data.name;

		newTile.appendChild(butt);
		newTile.appendChild(label);

		teamList.appendChild(newTile);
	};

	const handleJoinRequest = (e) => {
		socket.emit('request-join', {
			teamid: e.target.getAttribute('data-id'),
		});
	};

	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-joined', (data) => {
		console.log(data);
		const myId = getCookie('id');
		showMessage('info', 'Successfully joined game');

		if (data.chat) {
			data.chat.forEach((m) => {
				const newMessage = createChatMessage(
					m.mid,
					m.text,
					myId === m.user.id ? 'Me' : m.name,
					myId === m.user.id
						? 'me'
						: m.user.id === 'system'
						? 'system'
						: 'other',
					m.isHost ? 'host' : null
				);
				gameChat.appendChild(newMessage);
			});
			setTimeout(() => {
				gameChat.scrollTop = gameChat.scrollHeight;
			}, 10);
		}

		if (data.teams) {
			data.teams.forEach((t) => {
				handleNewTeam(t);
			});
		}

		document.querySelector('.top-navbar').classList.add('invisible-div');
		document.getElementById('join-div').classList.add('invisible-div');
		document.getElementById('game-container').classList.remove('invisible-div');
		mainContent.classList.add('top-unset');
		mainContent.classList.add('h-100');
		slideShowContainer.classList.remove('invisible-div');

		if (
			data.teams.some((t) => {
				return t.players.some((p) => {
					return p.id === myId;
				});
			})
		) {
			teamSetup.classList.add('invisible-div');
			teamContainer.classList.remove('invisible-div');
		}
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
		else
			newMessage = createChatMessage(
				data.id,
				data.message,
				data.from,
				'other',
				data.isHost ? 'host' : null
			);

		gameChat.appendChild(newMessage);
		gameChat.scrollTop = gameChat.scrollHeight;
	});

	socket.on('new-team', handleNewTeam);
};
