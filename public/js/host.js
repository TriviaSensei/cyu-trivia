import { Host } from './sockets/hostSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { createChatMessage } from './utils/chatMessage.js';
import { withTimeout, timeoutMessage } from './utils/socketTimeout.js';

const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');

const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const chatContainer = document.querySelector('.chat-container');

const gradingContainer = document.querySelector('.grading-container');
const roundSelector = document.getElementById('round-selector');
const modeSelector = document.getElementById('mode-selector');
const roundGradingInd = document.getElementById('round-grading-ind');
const roundModeInd = document.getElementById('round-mode-ind');
const saveGrades = document.getElementById('save-grades');
const endGame = document.getElementById('confirm-end-game');

const socket = io();
const host = Host(socket);

const handleSendChat = (e) => {
	if (
		e.key &&
		e.key.toUpperCase() !== 'ENTER' &&
		e.key.toUpperCase() !== 'RETURN'
	)
		return;

	if (chatMessage.value.trim() === '') return;

	e.preventDefault();
	console.log('hi');
	socket.emit(
		'game-chat',
		{
			message: chatMessage.value,
		},
		withTimeout(
			(data) => {
				if (data.status !== 'OK') return showMessage('error', data.message);
				const newMessage = createChatMessage(
					data.id,
					data.message,
					'Me',
					'me',
					'host'
				);
				chatMessage.value = '';
				if (newMessage) {
					chatContainer.appendChild(newMessage);
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			},
			timeoutMessage('Message timed out - try again'),
			1000
		)
	);
};

const changeGradingView = (e) => {
	const selectedRound = roundSelector.value;
	const selectedMode = modeSelector.value;

	const currentView = gradingContainer.querySelector(
		'.round-grading-container:not(.invisible-div)'
	);

	const newView = document.querySelector(`#${selectedMode}-${selectedRound}`);
	if (newView && currentView) {
		roundModeInd.innerHTML =
			selectedMode === 'grading' ? 'Grading' : 'Adjustments';
		roundGradingInd.innerHTML = selectedRound;
		currentView.classList.add('invisible-div');
		newView.classList.remove('invisible-div');
	}
};

const handleSaveGrades = (e) => {
	const round = parseInt(roundSelector.value);
	const mode = modeSelector.value;

	if (mode === 'grading') {
		const gd = document.getElementById(`grading-${round}`);
		if (!gd) return;
		const format = gd.getAttribute('data-format');
		if (!format) return;

		let toSend;
		if (format === 'questions') {
			const qgcs = getElementArray(gd, '.question-grading-container');
			toSend = {
				round,
				key: [],
			};
			qgcs.forEach((q) => {
				let toPush = {
					question: parseInt(q.getAttribute('data-question')),
					submissions: [],
				};
				const aDivs = getElementArray(q, '.answer-row');
				aDivs.forEach((a) => {
					const rr = a.querySelector('.right-radio');
					const part = a.querySelector('.partial-credit');
					let newAns = {
						answer: a.getAttribute('data-answer'),
						correct: rr && rr.checked,
						partial: part ? parseInt(part.value) || 0 : 0,
					};
					toPush.submissions.push(newAns);
				});
				toSend.key.push(toPush);
			});
		} else if (format === 'list') {
			toSend = {
				round,
				key: [],
			};
			const rows = getElementArray(gd, '.answer-row');
			rows.forEach((r) => {
				const sel = r.querySelector('select');
				if (!sel) return;
				const val = sel.value;

				if (
					!toSend.key.some((v) => {
						if (v.answer === val) {
							v.matches.push(r.getAttribute('data-answer'));
							return true;
						}
					})
				) {
					toSend.key.push({
						answer: val,
						matches: [r.getAttribute('data-answer')],
					});
				}
			});
		} else if (format === 'matching') {
			toSend = {
				round,
				key: [],
			};
			const rows = getElementArray(gd, '.answer-row');
			rows.forEach((r) => {
				const sel = r.querySelector('select');
				if (!sel) return;
				const val = sel.value;

				toSend.key.push({
					prompt: r.getAttribute('data-prompt'),
					answer: val,
				});
			});
		}

		if (!toSend) return;

		socket.emit(
			'grade-round',
			toSend,
			withTimeout(
				(data) => {
					if (data.status !== 'OK') {
						showMessage('error', data.message || 'Something went wrong');
					} else {
						showMessage('info', 'Key saved.');
						console.log(data.result);
					}
				},
				timeoutMessage('Request timed out. Try again.'),
				3000
			)
		);
	}
};

const handleEndGame = (e) => {
	socket.emit(
		'end-game',
		null,
		withTimeout(
			(res) => {
				if (res.status !== 'OK') {
					return showMessage('error', res.message);
				}
				showMessage('info', 'Game ended.');
				document.querySelector('.top-navbar').classList.remove('invisible-div');
				document
					.getElementById('assigned-games')
					.classList.remove('invisible-div');
				document
					.getElementById('hosting-container')
					.classList.add('invisible-div');
				mainContent.classList.remove('top-unset');
				mainContent.classList.remove('h-100');
				slideShowContainer.classList.add('invisible-div');
			},
			timeoutMessage('Request timed out - please try again.'),
			3000
		)
	);
};

document.addEventListener('DOMContentLoaded', (e) => {
	const startButtons = getElementArray(document, '.start-button');
	startButtons.forEach((b) => {
		b.addEventListener('click', (e) => {
			socket.emit('start-game', {
				_id: e.target.getAttribute('data-id'),
			});
			showMessage('info', 'Starting game...', 3000);
		});
	});
	chatMessage.addEventListener('keydown', handleSendChat);
	chatButton.addEventListener('click', handleSendChat);
	roundSelector.addEventListener('change', changeGradingView);
	modeSelector.addEventListener('change', changeGradingView);
	saveGrades.addEventListener('click', handleSaveGrades);
	endGame.addEventListener('click', handleEndGame);
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
