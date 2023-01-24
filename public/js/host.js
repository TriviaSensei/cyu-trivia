import { Host } from './sockets/hostSocket.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { createChatMessage } from './utils/chatMessage.js';
import { withTimeout, timeoutMessage } from './utils/socketTimeout.js';
import { createElement } from './utils/createElementFromSelector.js';
import { replaceAll } from './utils/stringReplace.js';

const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');

const chatMessage = document.getElementById('chat-message');
const chatButton = document.getElementById('send-chat');
const chatContainer = document.querySelector('.chat-container');

const gameRosterList = document.getElementById('game-roster-list');

const gradingContainer = document.querySelector('.grading-container');
const roundSelector = document.getElementById('round-selector');
const modeSelector = document.getElementById('mode-selector');
const roundGradingInd = document.getElementById('round-grading-ind');
const roundModeInd = document.getElementById('round-mode-ind');
const saveGrades = document.getElementById('save-grades');
const endGame = document.getElementById('confirm-end-game');
const removeChatButton = document.getElementById('remove-chat-button');
const confirmKickButton = document.getElementById('confirm-remove-user');

const userInfoModal = new bootstrap.Modal(
	document.getElementById('user-info-modal')
);
const removeUserModal = new bootstrap.Modal(
	document.getElementById('remove-user-modal')
);

let userKicked = false;

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

		if (format === 'questions' || format === 'audio') {
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
						answer: replaceAll(a.getAttribute('data-answer'), '&quot;', '"'),
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
							v.matches.push(
								replaceAll(r.getAttribute('data-answer'), '&quot;', '"')
							);
							return true;
						}
					})
				) {
					toSend.key.push({
						answer: val,
						matches: [replaceAll(r.getAttribute('data-answer'), '&quot;', '"')],
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
						const adjc = document.querySelector(
							`.adjustment-container[data-round="${data.result.round}"]`
						);
						if (!adjc) return;
						const rows = getElementArray(adjc, `tbody > .adjustment-row`);

						if (
							data.result.format === 'questions' ||
							data.result.format === 'audio'
						) {
							rows.forEach((r) => {
								const cells = getElementArray(r, '.result-cell');
								let score = 0;
								cells.forEach((c) => {
									c.classList.remove('incorrect', 'correct', 'partial');
									const qNo = parseInt(c.getAttribute('data-question'));
									const ans = c.getAttribute('data-answer')
										? c.getAttribute('data-answer').toLowerCase().trim()
										: '';
									if (
										!data.result.answers[qNo - 1].submissions.some((s) => {
											if (s.answer.trim() === ans) {
												let points;
												if (s.partial) {
													points = s.partial;
													c.classList.add('partial');
												} else if (s.correct) {
													points = c.getAttribute('data-wager')
														? parseInt(c.getAttribute('data-wager'))
														: data.result.answers[qNo - 1].value;
													c.classList.add('correct');
												} else {
													points = c.getAttribute('data-wager')
														? -parseInt(c.getAttribute('data-wager'))
														: 0;
													c.classList.add('incorrect');
												}
												const cont = c.querySelector('.score-container');
												if (cont) cont.innerHTML = points;
												else {
													c.innerHTML = `<div class="score-container">${points}</div>`;
												}
												score = score + points;
												return true;
											}
										})
									) {
										let points = c.getAttribute('data-wager')
											? -parseInt(c.getAttribute('data-wager'))
											: 0;
										c.classList.add('incorrect');
										const cont = c.querySelector('.score-container');
										if (cont) cont.innerHTML = points;
										else {
											c.innerHTML = `<div class="score-container">${points}</div>`;
										}
										score = score + points;
									}
								});
								const sumCell = r.querySelector('.total-cell');
								const adjInput = r.querySelector('input[type="number"]');
								if (sumCell) {
									const adj = adjInput ? parseInt(adjInput.value) : 0;
									const cont = sumCell.querySelector('.score-container');
									if (cont) cont.innerHTML = score + adj;
									else
										sumCell.innerHTML = `<div class="score-container">${
											score + adj
										}</div>`;
									sumCell.setAttribute('data-score', score);
								}
							});
						} else if (data.result.format === 'list') {
							rows.forEach((r) => {
								const cells = getElementArray(r, '.result-cell');
								let score = 0;
								let answers = [];
								cells.forEach((c) => {
									c.classList.remove(
										'incorrect',
										'correct',
										'partial',
										'duplicate'
									);
									const ans = (c.getAttribute('data-answer') || '')
										.toLowerCase()
										.trim();
									const match = data.result.answers.find((a) => {
										return a.matches.some((m) => {
											return m.toLowerCase().trim() === ans;
										});
									});
									let cont = c.querySelector('.score-container');
									if (!cont) {
										cont = createElement('.score-container');
										cont.innerHTML = 0;
										c.innerHTML = '';
										c.appendChild(cont);
									}
									if (match) {
										if (match.correct) {
											if (!answers.includes(match.answer)) {
												answers.push(match.answer);
												c.classList.add('correct');
												cont.innerHTML = match.value;
												score = score + match.value;
											} else {
												c.classList.add('duplicate');
												cont.innerHTML = '0';
											}
										} else {
											c.classList.add('incorrect');
											cont.innerHTML = '0';
										}
									} else {
										c.classList.add('incorrect');
										cont.innerHTML = '0';
									}
								});
								const sumCell = r.querySelector('.total-cell');
								const adjInput = r.querySelector('input[type="number"]');
								if (sumCell) {
									let cont = sumCell.querySelector('.score-container');
									if (!cont) {
										cont = createElement('.score-container');
										sumCell.innerHTML = '';
										sumCell.appendChild(cont);
									}
									const adj = adjInput ? parseInt(adjInput.value) : 0;
									cont.innerHTML = score + adj;
									sumCell.setAttribute('data-score', score);
								}
							});
						} else if (data.result.format === 'matching') {
						}
					}
				},
				timeoutMessage('Request timed out. Try again.'),
				3000
			)
		);
	} else if (mode === 'adjust') {
		const ad = document.getElementById(`adjust-${round}`);
		if (!ad) return;

		const toSend = [];
		const adjs = getElementArray(ad, '.adjustment-cell > input');
		adjs.forEach((a) => {
			const row = a.closest('tr');
			if (!row) return;
			const teamId = row.getAttribute('data-id');
			const adjustment = parseInt(a.value);
			if (teamId && !isNaN(adjustment)) {
				toSend.push({
					teamId,
					round,
					adjustment,
				});
			}
		});
		socket.emit(
			'set-adjustment',
			{
				adjustments: toSend,
			},
			withTimeout(
				(data) => {
					if (data.status !== 'OK') {
						showMessage('error', data.message);
					} else {
						showMessage('info', 'Successfully saved adjustments');
					}
				},
				timeoutMessage('Request timed out - please try again'),
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
				if (chatContainer) {
					chatContainer.innerHTML = '';
				}
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

const promptRemoveMessage = (e) => {
	removeChatButton.setAttribute('data-id', '');
	if (!e.target.classList.contains('chat-message')) {
		removeChatButton.classList.add('invisible-div');
		return;
	}
	const container = e.target.closest('.chat-message-container');
	if (!container || !container.classList.contains('from-other')) {
		removeChatButton.classList.add('invisible-div');
		return;
	}
	removeChatButton.style.top = `${e.pageY}px`;
	removeChatButton.style.left = `${e.pageX}px`;
	removeChatButton.setAttribute('data-id', e.target.getAttribute('data-id'));
	removeChatButton.classList.remove('invisible-div');
};

const removeChatMessage = (e) => {
	if (e.target.getAttribute('data-id') === '') return;

	socket.emit(
		'remove-message',
		{ id: e.target.getAttribute('data-id') },
		withTimeout(
			(res) => {
				if (res.status !== 'OK') return showMessage('error', res.message);
				if (document.getElementById(res.id)) {
					document.getElementById(res.id).remove();
				}
			},
			timeoutMessage('Request timed out - please try again'),
			3000
		)
	);
};

const handleKickUser = (e) => {
	const id = e.target.getAttribute('data-id');
	if (id) {
		socket.emit(
			'kick-user',
			{
				id,
			},
			withTimeout(
				(data) => {
					if (data.status !== 'OK') {
						return showMessage('error', data.message || 'Something went wrong');
					}
					showMessage('info', 'User kicked');
					userKicked = true;
					removeUserModal.hide();
					if (gameRosterList) {
						const els = getElementArray(gameRosterList, `[data-id="${id}"]`);
						els.forEach((el) => {
							el.remove();
						});
					}
				},
				timeoutMessage('Request timed out - please try again'),
				3000
			)
		);
	}
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
	document.addEventListener('click', promptRemoveMessage);
	removeChatButton.addEventListener('click', removeChatMessage);
	confirmKickButton.addEventListener('click', handleKickUser);
	document.addEventListener('hidden.bs.modal', (e) => {
		if (e.target.getAttribute('id') === 'remove-user-modal') {
			if (!userKicked) {
				userInfoModal.show();
			}
			userKicked = false;
		}
	});
});

socket.on('error', (data) => {
	showMessage('error', data.message, 2000);
});
