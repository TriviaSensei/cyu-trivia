const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
const chatMessage = document.getElementById('chat-message');

import { setUserCookie, getCookie } from '../utils/cookie.js';
import { showMessage, hideMessage } from '../utils/messages.js';
import { createChatMessage } from '../utils/chatMessage.js';
import { withTimeout } from '../utils/socketTimeout.js';
import { getElementArray } from '../utils/getElementArray.js';
import { createSlide, modifySlide } from '../utils/slideshow.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { generateScoreboard } from '../utils/scoreboard.js';

const gameMessage = document.getElementById('game-message');

const gameChat = document.getElementById('all-chat');
const teamList = document.querySelector('.team-list');

const gameRoster = document.getElementById('game-roster-list');

const teamSetup = document.querySelector('.team-setup');
const teamContainer = document.querySelector('.team-container');
const teamRosterList = document.getElementById('team-roster-list');
const teamNameLabel = document.getElementById('team-roster-name');
const teamNameEntry = document.getElementById('team-name-entry');

const teamChat = document.getElementById('team-chat-container');
const nameChangeSpan = document.getElementById('name-change');
const teamScore = document.getElementById('team-score');
const teamPlace = document.getElementById('team-place');
const teamCount = document.getElementById('team-count');

const joinTeamModal = new bootstrap.Modal(
	document.getElementById('join-team-modal')
);
const confirmSubmitModal = new bootstrap.Modal(
	document.getElementById('confirm-submit-modal')
);
const ansReceipt = document.getElementById('answer-confirmation');
const submitAnswers = document.getElementById('confirm-submit');

const teammateName = document.getElementById('new-teammate-name');
const allowJoin = document.getElementById('confirm-teammate');
const denyJoin = document.getElementById('deny-teammate');
const reqTimeout = 30000;

const myCarousel = document.querySelector('#game-carousel');
const slideCarousel = new bootstrap.Carousel(myCarousel);
const myCarouselInner = myCarousel.querySelector('.carousel-inner');

const teamAnswerContainer = document.getElementById('team-answer-container');

const timer = document.getElementById('timer');
let timerInterval;
let timeLeft;
let currentRound;

const getTimeString = (time) => {
	return `${Math.floor(time / 60)}:${time % 60 < 10 ? '0' : ''}${time % 60}`;
};

const setTimer = (time) => {
	timeLeft = Math.max(0, Math.floor(time));
	timer.innerHTML = getTimeString(timeLeft);
};

const decrementTimer = () => {
	timeLeft = Math.max(0, timeLeft - 1);
	timer.innerHTML = getTimeString(timeLeft);
};

const startTimer = () => {
	timer.classList.remove('invisible-div');
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(decrementTimer, 1000);
};

const stopTimer = () => {
	clearInterval(timerInterval);
	timerInterval = undefined;
	timer.classList.add('invisible-div');
};

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

	const handleAnswerChange = (e) => {
		socket.emit('update-answer', {
			round: currentRound - 1,
			question: parseInt(e.target.getAttribute('data-question')),
			answer: e.target.value,
		});
	};

	const handleWagerChange = (e) => {
		if (parseInt(e.target.value) > parseInt(e.target.getAttribute('max')))
			e.target.value = parseInt(e.target.getAttribute('max'));
		else if (parseInt(e.target.value) < parseInt(e.target.getAttribute('min')))
			e.target.value = parseInt(e.target.getAttribute('min'));

		socket.emit('update-wager', {
			round: currentRound - 1,
			wager: parseInt(e.target.value),
		});
	};

	const handleSubmitResponse = (e) => {
		e.preventDefault();
		const rLabel = document.getElementById('round-no');
		if (rLabel) rLabel.innerHTML = `${currentRound}`;

		ansReceipt.innerHTML = '';

		const lines = getElementArray(teamAnswerContainer, '.team-answer-line');
		lines.forEach((l) => {
			const sp = l.querySelector('span');
			const inp = l.querySelector('input,select');
			if (sp && inp) {
				ansReceipt.innerHTML =
					ansReceipt.innerHTML +
					sp.innerHTML +
					`${inp.tagName.toLowerCase() === 'select' ? ' - ' : ''}` +
					inp.value +
					'<br>';
			}
		});

		confirmSubmitModal.show();
	};

	submitAnswers.addEventListener('click', (e) => {
		socket.emit(
			'submit-answers',
			null,
			withTimeout(
				(data) => {
					if (data.status !== 'OK') return showMessage('error', data.message);
					showMessage('info', 'Successfully submitted answers.');
					document.getElementById('submit').remove();
					const lines = getElementArray(
						teamAnswerContainer,
						'.team-answer-line'
					);
					lines.forEach((l) => {
						const inp = l.querySelector('input,select');
						if (inp) {
							inp.disabled = true;
						}
					});
				},
				() => {
					showMessage('error', 'Request timed out - try again.');
				},
				3000
			)
		);
	});

	const handleNewSlide = (slideData, ...toSetActive) => {
		let setActive = true;
		if (toSetActive.length > 0) {
			if (!toSetActive[0]) setActive = false;
		}
		const data = slideData.slide;

		if (data.newRound) {
			currentRound = data.round;

			teamAnswerContainer.innerHTML = '';
			const newForm = createElement('form');
			if (data.format === 'std' || data.format === 'list') {
				for (var i = 0; i < data.questionCount; i++) {
					const newDiv = createElement('.team-answer-line');
					const newSpan = createElement('span');
					newSpan.innerHTML =
						i === data.questionCount - 1 && data.endBonus
							? 'B.&nbsp;'
							: i === data.questionCount - 1 && data.endTheme
							? 'Theme:&nbsp;'
							: `${i + 1}.&nbsp;`;
					const input = createElement(
						`${slideData.isCaptain ? 'input' : '.answer-display'}#answer-${
							i + 1
						}`
					);
					input.setAttribute('data-question', i);
					if (slideData.isCaptain) {
						input.setAttribute('type', 'text');
						input.addEventListener('keyup', handleAnswerChange);
						input.addEventListener('change', handleAnswerChange);
					}
					newDiv.appendChild(newSpan);
					newDiv.appendChild(input);
					newForm.appendChild(newDiv);
				}
				if (data.endBonus) {
					const newDiv = createElement('.team-answer-line');
					const newSpan = createElement('span');
					newSpan.innerHTML = `Wager (0-${data.maxWager}): `;
					const input = createElement(
						`${slideData.isCaptain ? 'input' : '.answer-display'}#wager`
					);
					input.setAttribute('type', 'number');
					input.setAttribute('min', '0');
					input.setAttribute('max', data.maxWager);
					input.setAttribute('required', true);
					if (slideData.isCaptain) {
						input.addEventListener('keyup', handleWagerChange);
						input.addEventListener('change', handleWagerChange);
					}
					newDiv.appendChild(newSpan);
					newDiv.appendChild(input);
					newForm.appendChild(newDiv);
				}
			} else if (data.format === 'matching') {
				data.matchingPrompts.forEach((p, j) => {
					const newDiv = createElement('.team-answer-line.matching-line');
					const newSpan = createElement('span');
					newSpan.innerHTML = p;
					const input = createElement(`select#answer-${j + 1}`);
					input.setAttribute('data-question', j);
					const top = createElement('option');
					top.setAttribute('value', '');
					top.innerHTML = '[Select an option]';
					input.appendChild(top);
					data.matchingBank.forEach((a) => {
						const opt = createElement('option');
						opt.setAttribute('value', a);
						opt.innerHTML = a;
						input.appendChild(opt);
					});
					if (!slideData.isCaptain) {
						input.setAttribute('disabled', true);
					} else {
						input.addEventListener('change', handleAnswerChange);
					}
					newDiv.appendChild(newSpan);
					newDiv.appendChild(input);
					newForm.appendChild(newDiv);
				});
			}

			const newDiv = createElement('.team-answer-line');
			const butt = createElement('button#submit');
			butt.classList.add('invisible-div');
			butt.innerHTML = 'Submit';
			butt.setAttribute('type', 'submit');
			newForm.addEventListener('submit', handleSubmitResponse);
			newDiv.appendChild(butt);
			newForm.appendChild(newDiv);
			if (slideData.isCaptain) {
				butt.classList.remove('invisible-div');
			}
			teamAnswerContainer.appendChild(newForm);
			teamAnswerContainer.scrollTop = 0;
		}

		if (data.clear || data.new) {
			const newSlide = createSlide(data);
			myCarouselInner.appendChild(newSlide);

			if (setActive) {
				const activeSlide = myCarousel.querySelector('.carousel-item.active');
				if (!activeSlide) {
					newSlide.classList.add('active');
				} else {
					activeSlide.classList.remove('active');
					const len = myCarousel.querySelectorAll('.carousel-item').length;
					slideCarousel.to(len - 1);
					newSlide.classList.add('active');
				}
			}
			if (data.clear) {
				getElementArray(myCarousel, '.carousel-item:not(:last-child)').forEach(
					(item) => {
						item.remove();
					}
				);
			}
			if (data.scores) {
				const activeSlide = myCarousel.querySelector('.carousel-item');
				console.log(activeSlide);
				if (activeSlide) {
					generateScoreboard(
						activeSlide.querySelector('.slide-body'),
						data.scores
					);
				}

				if (
					!data.scores.some((s, i) => {
						if (s.myTeam) {
							teamPlace.innerHTML = data.scores.length - i;
							teamScore.innerHTML = s.score;
							return true;
						}
					})
				) {
					teamPlace.innerHTML = '-';
				}
				teamCount.innerHTML = data.scores.length;
			}
		} else if (data.timer && !timerInterval) {
			setTimer(data.timer * 60);
			startTimer();
			showMessage(
				'info',
				`Answers will auto-submit in ${data.timer} minute${
					data.timer === 1 ? '' : 's'
				}.`
			);
		} else {
			const activeSlide = myCarousel.querySelector(
				'.carousel-item.active > .slide-contents'
			);
			modifySlide(activeSlide, data);
		}
	};

	socket.on('connection-made', setUserCookie);

	socket.on('game-joined', (data) => {
		myGame = data;

		console.log(data);
		data.slides.forEach((s) => {
			if (Array.isArray(s)) {
				s.forEach((s2) => {
					handleNewSlide({ isCaptain: data.isCaptain, slide: s2 });
				});
			} else {
				handleNewSlide({ isCaptain: data.isCaptain, slide: s });
			}
		});

		if (data.timeLeft) {
			setTimer(Math.floor(data.timeLeft / 1000));
			showMessage(
				`info`,
				`Answers will auto-submit in ${getTimeString(
					Math.floor(data.timeLeft / 1000)
				)}.`
			);
			startTimer();
		}

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

			if (data.teamChat) {
				data.teamChat.forEach((m) => {
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

			//handle restoring the answers on refresh
			if (data.submissions) {
				data.submissions.answers.forEach((a, i) => {
					if ((typeof a).toLowerCase() === 'string') {
						const inp = document.querySelector(`input[data-question="${i}"]`);
						if (inp) {
							inp.value = a;
							if (data.submissions.final) inp.disabled = true;
						} else {
							const sel = document.querySelector(
								`select[data-question="${i}"]`
							);
							if (sel) {
								const opts = getElementArray(sel, 'option');
								opts.some((o, i) => {
									if (o.value.toLowerCase() === a.toLowerCase()) {
										sel.selectedIndex = i;
										return true;
									}
								});
							} else {
								const d = document.querySelector(
									`.answer-display[data-question="${i}"]`
								);
								if (d) d.innerHTML = a;
							}
						}
					}
				});
				const wag = document.getElementById('wager');
				if (wag && data.submissions.wager >= 0) {
					if (data.isCaptain) {
						wag.value = data.submissions.wager;
						if (data.submissions.final) wag.disabled = true;
					} else {
						wag.innerHTML = data.submissions.wager;
					}
				}
				const submitButton = document.getElementById('submit');
				if (data.submissions.final && submitButton) {
					submitButton.disabled = true;
				}
			}

			if (data.scores) {
				teamCount.innerHTML = data.scores.length;
				if (
					!data.scores.some((s, i) => {
						if (s.myTeam) {
							teamScore.innerHTML = s.score;
							teamPlace.innerHTML = data.scores.length - i;
							return true;
						}
					})
				) {
					teamScore.innerHTML = '-';
					teamPlace.innerHTML = '-';
				}
			}
		}

		myUser = myGame.players.find((p) => {
			return p.id === myId;
		});

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
		console.log(data);
		showMessage('info', 'You are the captain now.');
		const suffs = getElementArray(teamRosterList, '.suffix');
		suffs.forEach((s) => {
			s.innerHTML = '';
		});
		const bp = teamRosterList.querySelector(`li.is-me[data-id="${myUser.id}"]`);
		if (bp) bp.innerHTML = `${myUser.name} <span class="suffix">(C, Me)</span>`;

		const submitButton = document.getElementById('submit');
		if (submitButton) submitButton.classList.remove('invisible-div');

		const answerLines = getElementArray(document, '.answer-display');
		answerLines.forEach((a, i) => {
			const newInput = createElement(`input#${a.id}`);
			newInput.classList.add(a.id);
			newInput.setAttribute('data-question', a.getAttribute('data-question'));

			if (a.classList.contains('wager')) {
				newInput.setAttribute('type', 'number');
				newInput.setAttribute('min', a.getAttribute('min'));
				newInput.setAttribute('max', a.getAttribute('max'));
				newInput.setAttribute('required', true);
				newInput.value = data && data.wager >= 0 ? data.wager : '';
				newInput.addEventListener('keyup', handleWagerChange);
				newInput.addEventListener('change', handleWagerChange);
			} else {
				newInput.setAttribute('type', 'text');
				newInput.value = data && data.answers.length > i ? data.answers[i] : '';
				newInput.addEventListener('keyup', handleAnswerChange);
				newInput.addEventListener('change', handleAnswerChange);
			}
			a.parentElement.appendChild(newInput);
			a.remove();
		});

		const tac = document.getElementById('team-answer-container');
		if (tac) {
			const selects = getElementArray(tac, 'select');
			selects.forEach((s) => {
				s.disabled = false;
			});
		}
	});

	socket.on('next-slide', (data) => {
		if (!data.continueTimer) {
			stopTimer();
		}
		if (Array.isArray(data.slide)) {
			console.log(data.slide);
			data.slide.forEach((d) => {
				handleNewSlide({
					isCaptain: data.isCaptain,
					slide: d,
				});
			});
			const count = myCarousel.querySelectorAll('.carousel-item').length;
			slideCarousel.to(count - 1);
			setTimeout(() => {
				slideCarousel.to(1);
			}, 600);
		} else {
			handleNewSlide(data);
		}
	});

	socket.on('update-answer', (data) => {
		const el = document.getElementById(`answer-${data.question + 1}`);
		if (el) {
			const tn = el.tagName.toLowerCase();
			if (tn === 'div') {
				el.innerHTML = data.answer;
			} else if (tn === 'select') {
				const opts = getElementArray(el, 'option');
				opts.some((o, i) => {
					if (o.value.toLowerCase() === data.answer.toLowerCase()) {
						el.selectedIndex = i;
						return true;
					}
				});
			}
		}
	});

	socket.on('update-wager', (data) => {
		console.log(data);
		const el = document.getElementById(`wager`);
		if (el) {
			el.innerHTML = data.wager;
		}
	});

	socket.on('set-team-name', (data) => {
		teamNameLabel.innerHTML = data.name;
	});

	socket.on('remove-message', (data) => {
		const container = document.getElementById(data.id);
		if (!container) return;
		const msg = container.querySelector('.chat-message');
		if (!msg) return;

		msg.innerHTML = '(Message removed by host)';
		setTimeout(() => {
			container.remove();
		}, 1000);
	});

	const returnToLobby = () => {
		document.querySelector('.top-navbar').classList.remove('invisible-div');
		document.getElementById('join-div').classList.remove('invisible-div');
		document.getElementById('game-container').classList.add('invisible-div');
		mainContent.classList.remove('top-unset');
		mainContent.classList.remove('h-100');
		slideShowContainer.classList.add('invisible-div');
		teamSetup.classList.remove('invisible-div');
		teamContainer.classList.add('invisible-div');
		teamNameLabel.innerHTML = '';
		teamNameEntry.value = '';
	};

	socket.on('game-ended', (data) => {
		showMessage('info', data.message, 1000);
		socket.emit('leave-game', null);
		gameChat.innerHTML = '';
		teamChat.innerHTML = '';
		returnToLobby();
	});

	socket.on('kicked', (data) => {
		showMessage('error', 'You have been kicked from the game.');
		socket.emit('leave-game', null);
		returnToLobby();
	});
};
