import { Play } from './sockets/playSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { withTimeout, timeoutMessage } from './utils/socketTimeout.js';
import { createChatMessage } from './utils/chatMessage.js';

const name = document.getElementById('name');
const code = document.getElementById('code');
const joinForm = document.getElementById('join-form');

const createTeamHeader = document.getElementById('create-team-label');
const createTeamButton = document.getElementById('create-team');
const confirmCreateTeam = document.getElementById('confirm-create-team');
const createTeam = document.getElementById('new-team-modal-form');
const teamNameEntry = document.getElementById('team-name-entry');
const createTeamModal = document.getElementById('create-team-modal');
const teamNameModal = new bootstrap.Modal(createTeamModal);
const confirmLeaveTeam = document.getElementById('confirm-leave-team');

//team elements
const teamList = document.querySelector('.team-setup');
const teamContainer = document.querySelector('.team-container');
const teamRosterList = document.getElementById('team-roster-list');
const teamNameLabel = document.getElementById('team-roster-name');
const changeTeamName = document.getElementById('change-team-name');
const nameChangeSpan = document.getElementById('name-change');

//game chat elements
const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const gameChat = document.getElementById('all-chat');

//team chat elements
const teamChatMessage = document.getElementById('team-message');
const teamChatButton = document.getElementById('send-team-chat');
const teamChat = document.getElementById('team-chat-container');

const allowJoin = document.getElementById('confirm-teammate');
const denyJoin = document.getElementById('deny-teammate');
const socket = io();
const host = Play(socket);

let roomid;
let myName;

document.addEventListener('shown.bs.modal', (e) => {
	console.log(e.target);
	if (e.target === createTeamModal) {
		teamNameEntry.focus();
	}
});

const handleSendChat = (e) => {
	if (
		e.key &&
		e.key.toUpperCase() !== 'ENTER' &&
		e.key.toUpperCase() !== 'RETURN'
	)
		return;
	if (
		(e.target === chatMessage || e.target === chatButton) &&
		chatMessage.value.trim() === ''
	)
		return;
	if (
		(e.target === teamChatMessage || e.target === teamChatButton) &&
		teamChatMessage.value.trim === ''
	)
		return;

	e.preventDefault();

	let chatBox;
	let event;
	let messageBox;
	if (e.target === chatMessage || e.target === chatButton) {
		event = 'game-chat';
		chatBox = gameChat;
		messageBox = chatMessage;
	} else {
		event = 'team-chat';
		chatBox = teamChat;
		messageBox = teamChatMessage;
	}

	socket.emit(
		event,
		{
			message: messageBox.value,
		},
		withTimeout(
			(data) => {
				if (data.status !== 'OK') {
					return showMessage('info', data.message);
				}
				console.log(data);
				const newMessage = createChatMessage(data.id, data.message, 'Me', 'me');
				e.target.value = '';
				if (newMessage) {
					chatBox.appendChild(newMessage);
					chatBox.scrollTop = chatBox.scrollHeight;
				}
			},
			() => {
				showMessage('error', 'Message timed out - try again', 1000);
			},
			1000
		)
	);
};

let action;
const handleCreateAction = (e) => {
	if (e.target === createTeamButton) {
		action = 'create';
		createTeamHeader.innerHTML = 'Create New Team';
		confirmCreateTeam.innerHTML = 'Create';
	} else {
		action = 'edit';
		createTeamHeader.innerHTML = 'Edit Team Name';
		confirmCreateTeam.innerHTML = 'Edit';
	}
	teamNameModal.show();
};

const handleTeamName = (e) => {
	e.preventDefault();
	const timeout = 3000;
	let msg;
	if (action === 'create') {
		msg = 'Creating team...';
	} else if (action === 'edit') {
		msg = 'Changing team name...';
	} else {
		return;
	}
	showMessage('info', msg, timeout);
	socket.emit(
		'set-team-name',
		{
			name: teamNameEntry.value,
		},
		withTimeout(
			(data) => {
				if (data.status === 'OK') {
					console.log(data);

					if (action === 'create') {
						showMessage('info', 'Successfully created team.');
						teamList.classList.add('invisible-div');
						teamContainer.classList.remove('invisible-div');
						teamNameLabel.innerHTML = data.name;
						roomid = data.roomid;
						const l = document.createElement('li');
						l.setAttribute('data-id', data.id);
						l.innerHTML = `${data.players[0].name} (C, Me)`;
						teamRosterList.innerHTML = '';
						teamRosterList.appendChild(l);
						nameChangeSpan.classList.remove('invisible-div');
					} else if (action === 'edit') {
						showMessage('info', 'Successfully changed team name.');
						teamNameLabel.innerHTML = data.name;
					}
					action = '';
					teamNameModal.hide();
				} else {
					showMessage('error', data.message || 'Something went wrong.');
				}
			},
			() => {
				showMessage('error', 'Request timed out - please try again.', 2000);
			},
			timeout
		)
	);
};

const handleJoin = (e) => {
	e.preventDefault();
	const joinTimeout = 3000;
	showMessage('info', 'Attempting to join game...', joinTimeout);
	myName = name.value;
	socket.emit(
		'join-game',
		{
			name: name.value,
			joinCode: code.value,
		},
		withTimeout(
			(data) => {
				if (data.status !== 'OK') {
					return showMessage('error', data.message);
				}
				showMessage('info', 'Successfully joined game');
			},
			timeoutMessage('Unable to join game.'),
			joinTimeout
		)
	);
};

const resolveJoinRequest = (e) => {
	if (!e.target.getAttribute('data-id')) return;

	socket.emit(e.target === allowJoin ? 'accept-teammate' : 'decline-teammate', {
		id: e.target.getAttribute('data-id'),
	});

	// if (e.target === allowJoin) {
	// 	const l = document.createElement('li');
	// 	l.setAttribute('data-id', e.target.getAttribute('data-id'));
	// 	l.innerHTML = `${e.target.getAttribute('data-name')}`;
	// 	teamRosterList.appendChild(l);
	// }
};

const handleLeaveTeam = () => {
	socket.emit('leave-team', null);
	showMessage('info', 'Successfully left team.');
	teamList.classList.remove('invisible-div');
	teamContainer.classList.add('invisible-div');
	teamNameLabel.innerHTML = '';
	teamRosterList.innerHTML = '';
};

window.addEventListener('load', (e) => {
	joinForm.addEventListener('submit', handleJoin);
	chatMessage.addEventListener('keydown', handleSendChat);
	chatButton.addEventListener('click', handleSendChat);
	teamChatButton.addEventListener('click', handleSendChat);
	teamChatMessage.addEventListener('keydown', handleSendChat);
	createTeamButton.addEventListener('click', handleCreateAction);
	changeTeamName.addEventListener('click', handleCreateAction);
	createTeam.addEventListener('submit', handleTeamName);
	allowJoin.addEventListener('click', resolveJoinRequest);
	denyJoin.addEventListener('click', resolveJoinRequest);
	confirmLeaveTeam.addEventListener('click', handleLeaveTeam);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
