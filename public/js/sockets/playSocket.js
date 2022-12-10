const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
const chatMessage = document.getElementById('chat-message');

import { setUserCookie, getCookie } from '../utils/cookie.js';
import { showMessage, hideMessage } from '../utils/messages.js';
import { createChatMessage } from '../utils/chatMessage.js';
import { withTimeout } from '../utils/socketTimeout.js';
import { getElementArray } from '../utils/getElementArray.js';

const gameMessage = document.getElementById('game-message');

const gameChat = document.getElementById('all-chat');
const teamList = document.querySelector('.team-list');

const gameRoster = document.getElementById('game-roster-list');

const teamSetup = document.querySelector('.team-setup');
const teamContainer = document.querySelector('.team-container');
const teamRosterList = document.getElementById('team-roster-list');
const teamNameLabel = document.getElementById('team-roster-name');
const teamChat = document.getElementById('team-chat-container');
const nameChangeSpan = document.getElementById('name-change');

const joinTeamModal = new bootstrap.Modal(
	document.getElementById('join-team-modal')
);
const teammateName = document.getElementById('new-teammate-name');
const allowJoin = document.getElementById('confirm-teammate');
const denyJoin = document.getElementById('deny-teammate');
const reqTimeout = 30000;

export const Play = (socket) => {
	let myGame;
	let myTeam;
	let myUser;
	let myId = getCookie('id');

	const handleNewTeam = (data) => {
		const newTile = document.createElement('div');
		newTile.classList.add('team-tile');

		const butt = document.createElement('button');
		butt.classList.add('join-team');
		butt.innerHTML = 'Join';
		butt.setAttribute('data-id', data.id);
		butt.setAttribute('data-name', data.name);
		butt.addEventListener('click', handleJoinRequest);
		const label = document.createElement('div');
		label.classList.add('team-name-label');
		label.innerHTML = data.name;

		newTile.appendChild(butt);
		newTile.appendChild(label);

		teamList.appendChild(newTile);
	};

	const cancelJoinRequest = (e) => {
		socket.emit(
			'cancel-join',
			{ id: myId },
			withTimeout(
				(data) => {
					if (data.status === 'OK') {
						showMessage('info', 'Request cancelled', 1000);
					} else {
						showMessage('error', data.message, 1000);
					}
				},
				() => {},
				3000
			)
		);
	};

	const handleJoinRequest = (e) => {
		socket.emit(
			'request-join',
			{
				teamid: e.target.getAttribute('data-id'),
			},
			withTimeout(
				(data) => {
					if (data.status !== 'OK') {
						showMessage('error', data.message);
						if (data.timeLeft >= 1000) {
							setTimeout(() => {
								showMessage('info', '', data.timeLeft - 1000);
								gameMessage.innerHTML = `Requesting to join team ${e.target.getAttribute(
									'data-name'
								)}\t`;
								const span = document.createElement('span');
								span.style.marginLeft = '5px';
								span.style.marginRight = '5px';
								const cancelJoin = document.createElement('button');
								cancelJoin.innerHTML = 'Cancel';
								cancelJoin.addEventListener('click', cancelJoinRequest);
								span.appendChild(cancelJoin);
								gameMessage.appendChild(span);
							}, 1000);
						}
					}
				},
				(data) => {
					showMessage('error', 'Something went wrong. Try again.', 1000);
				},
				2000
			)
		);
		showMessage('info', '', reqTimeout);
		gameMessage.innerHTML = `Requesting to join team ${e.target.getAttribute(
			'data-name'
		)}`;
		const span = document.createElement('span');
		span.style.marginLeft = '5px';
		span.style.marginRight = '5px';
		const cancelJoin = document.createElement('button');
		cancelJoin.innerHTML = 'Cancel';
		cancelJoin.addEventListener('click', cancelJoinRequest);
		span.appendChild(cancelJoin);
		gameMessage.appendChild(span);
	};

	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-joined', (data) => {
		console.log(data);

		myGame = data;

		gameRoster.innerHTML = '';
		const hbp = document.createElement('li');
		hbp.setAttribute('data-id', data.host.id);
		hbp.innerHTML = `${data.host.name} (Host)`;
		gameRoster.appendChild(hbp);
		data.players.forEach((p) => {
			const b = document.createElement('li');
			if (!p.connected) b.classList.add('disconnected');
			b.setAttribute('data-id', p.id);
			b.innerHTML = `${p.name} ${p.id === myId ? '(Me)' : ''}`;
			gameRoster.appendChild(b);
		});

		myTeam = data.teams.find((t) => {
			return t.members.some((m) => {
				return m.id === myId;
			});
		});

		if (myTeam) {
			console.log(myTeam);
			teamSetup.classList.add('invisible-div');
			teamContainer.classList.remove('invisible-div');

			teamRosterList.innerHTML = '';
			myTeam.members.forEach((m) => {
				const l = document.createElement('li');
				l.setAttribute('data-id', m.id);
				const isCaptain = myTeam.captain.id === m.id;
				const isMe = myId === m.id;
				let suffix = '';
				if (isCaptain && isMe) {
					suffix = '(C, Me)';
					l.classList.add('is-me');
					nameChangeSpan.classList.remove('invisible-div');
				} else if (isCaptain) {
					suffix = '(C)';
				} else if (isMe) {
					suffix = '(Me)';
					l.classList.add('is-me');
				}
				l.innerHTML = `${m.name} <span class="suffix">${suffix}</span>`;
				teamRosterList.appendChild(l);
			});

			teamNameLabel.innerHTML = myTeam.name;

			if (myTeam.chat) {
				myTeam.chat.forEach((m) => {
					const newMessage = createChatMessage(
						m.mid,
						m.text,
						myId === m.user.id ? 'Me' : m.user.name,
						myId === m.user.id
							? 'me'
							: m.user.id === 'system'
							? 'system'
							: 'other',
						m.isHost ? 'host' : null
					);
					teamChat.appendChild(newMessage);
				});
				setTimeout(() => {
					teamChat.scrollTop = teamChat.scrollHeight;
				}, 10);
			}
		}

		myUser = myGame.players.find((p) => {
			return p.id === myId;
		});

		showMessage('info', 'Successfully joined game');

		if (data.chat) {
			data.chat.forEach((m) => {
				const newMessage = createChatMessage(
					m.mid,
					m.text,
					myId === m.user.id ? 'Me' : m.user.name,
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
			teamList.innerHTML = '';
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
	});

	const handleChat = (data) => {
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

		console.log(newMessage);
		const chatBox = data.to === 'game' ? gameChat : teamChat;
		chatBox.appendChild(newMessage);
		chatBox.scrollTop = chatBox.scrollHeight;
	};

	socket.on('game-chat', (data) => {
		handleChat({ ...data, to: 'game' });
	});

	socket.on('team-chat', (data) => {
		handleChat({ ...data, to: 'team' });
	});

	socket.on('new-team', handleNewTeam);

	socket.on('edit-team-name', (data) => {
		const button = document.querySelector(
			`button.join-team[data-id="${data.id}"]`
		);
		if (button) {
			const label = button.parentElement.querySelector('.team-name-label');
			label.innerHTML = data.name;
		}
	});

	const setJoinRequestor = (user) => {
		if (!user) {
			allowJoin.setAttribute('data-id', '');
			denyJoin.setAttribute('data-id', '');
			allowJoin.setAttribute('data-name', '');
			denyJoin.setAttribute('data-name', '');
			return;
		}
		allowJoin.setAttribute('data-id', user.id);
		denyJoin.setAttribute('data-id', user.id);
		allowJoin.setAttribute('data-name', user.name);
		denyJoin.setAttribute('data-name', user.name);
	};

	socket.on('join-request', (data) => {
		teammateName.innerHTML = `${data.name}`;
		joinTeamModal.show();
		setJoinRequestor(data);
	});

	socket.on('cancel-join-request', (data) => {
		joinTeamModal.hide();
		showMessage('info', `${data.name} cancelled their request.`);
		setJoinRequestor('');
	});

	socket.on('request-accepted', (data) => {
		console.log(data);
		socket.emit(
			'join-team-by-id',
			{ id: data.roomid },
			withTimeout(
				(res) => {
					if (res.status === 'OK') {
						showMessage('info', `Request to join ${data.name} accepted.`);

						teamSetup.classList.add('invisible-div');
						teamContainer.classList.remove('invisible-div');
						teamNameLabel.innerHTML = data.name;
						teamRosterList.innerHTML = '';
						data.members.forEach((m) => {
							const l = document.createElement('li');
							l.setAttribute('data-id', m.id);
							let suffix = '';
							const isCaptain = data.captain.id === m.id;
							const isMe = myId === m.id;
							if (isCaptain && isMe) {
								suffix = '(C, Me)';
								l.classList.add('is-me');
							} else if (isCaptain) {
								suffix = '(C)';
							} else if (isMe) {
								suffix = '(Me)';
								l.classList.add('is-me');
							}
							l.innerHTML = `${m.name} <span class="suffix">${suffix}</span>`;
							teamRosterList.appendChild(l);
						});
						if (myId !== data.captain.id) {
							document
								.getElementById('name-change')
								.classList.add('invisible-div');
						}
					} else {
						showMessage('error', data.message);
					}
				},
				() => {
					showMessage('error', 'Request timed out.');
				},
				3000
			)
		);
	});

	socket.on('request-denied', (data) => {
		showMessage('error', `Request to join ${data.name} denied.`);
	});

	socket.on('new-teammate', (data) => {
		const l = document.createElement('li');
		l.setAttribute('data-id', data.id);
		l.innerHTML = data.name;
		teamRosterList.appendChild(l);
		handleChat({
			id: data.mid,
			message: data.message,
			from: 'System',
			isSystem: true,
		});
	});

	socket.on('teammate-left', (data) => {
		const bp = teamRosterList.querySelector(`li[data-id="${data.id}"]`);
		if (bp) bp.remove();
		handleChat({
			id: data.mid,
			message: data.message,
			from: 'System',
			isSystem: true,
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

	socket.on('user-deleted', (data) => {
		const bps = getElementArray(document, `li[data-id="${data.id}"]`);
		bps.forEach((b) => {
			b.remove();
		});
	});

	socket.on('remove-team', (data) => {
		const butt = document.querySelector(
			`button.join-team[data-id="${data.id}"]`
		);
		if (!butt) return;
		const tile = butt.closest('.team-tile');
		if (tile) tile.remove();
	});

	socket.on('new-captain', (data) => {
		showMessage('info', 'You are the captain now.');
		const suffs = getElementArray(teamRosterList, '.suffix');
		suffs.forEach((s) => {
			s.innerHTML = '';
		});
		const bp = teamRosterList.querySelector(`li.is-me[data-id="${myUser.id}"]`);
		if (bp) bp.innerHTML = `${myUser.name} <span class="suffix">(C, Me)</span>`;
	});

	socket.on('set-team-name', (data) => {
		teamNameLabel.innerHTML = data.name;
	});
};
