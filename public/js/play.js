import { Play } from './sockets/playSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { withTimeout } from './utils/socketTimeout.js';
import { createChatMessage } from './utils/chatMessage.js';

const name = document.getElementById('name');
const code = document.getElementById('code');
const joinForm = document.getElementById('join-form');

const createTeamHeader = document.getElementById('create-team-label');
const createTeamButton = document.getElementById('create-team');
const createTeam = document.getElementById('new-team-modal-form');
const teamNameEntry = document.getElementById('team-name-entry');
const createTeamModal = document.getElementById('create-team-modal');
const teamNameModal = new bootstrap.Modal(createTeamModal);

//team elements
const teamList = document.querySelector('.team-setup');
const teamContainer = document.querySelector('.team-container');
const teamRosterList = document.getElementById('team-roster-list');
const teamNameLabel = document.getElementById('team-roster-name');
const changeTeamName = document.getElementById('change-team-name');
//game chat elements
const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const gameChat = document.getElementById('all-chat');

const socket = io();
const host = Play(socket);

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
				const newMessage = createChatMessage(data.id, data.message, 'Me', 'me');
				chatMessage.value = '';
				if (newMessage) {
					gameChat.appendChild(newMessage);
					gameChat.scrollTop = gameChat.scrollHeight;
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
	} else {
		action = 'edit';
		createTeamHeader.innerHTML = 'Edit Team Name';
	}
	console.log(action);
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

						const l = document.createElement('li');
						l.setAttribute('data-id', data.id);
						l.innerHTML = `${data.players[0].name} (C)`;
						teamRosterList.innerHTML = '';
						teamRosterList.appendChild(l);
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
	showMessage('info', 'Attempting to join game...');
	socket.emit('join-game', {
		name: name.value,
		joinCode: code.value,
	});
};

window.addEventListener('load', (e) => {
	joinForm.addEventListener('submit', handleJoin);
	chatMessage.addEventListener('keydown', handleSendChat);
	chatButton.addEventListener('click', handleSendChat);
	createTeamButton.addEventListener('click', handleCreateAction);
	changeTeamName.addEventListener('click', handleCreateAction);
	createTeam.addEventListener('submit', handleTeamName);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
