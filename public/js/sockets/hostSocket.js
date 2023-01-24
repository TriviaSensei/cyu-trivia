const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
import { createChatMessage } from '../utils/chatMessage.js';
import { setUserCookie, getCookie } from '../utils/cookie.js';
import { getElementArray } from '../utils/getElementArray.js';
import { hideMessage, showMessage } from '../utils/messages.js';
import {
	createSlide,
	createPictureSlide,
	modifySlide,
} from '../utils/slideshow.js';
import { withTimeout, timeoutMessage } from '../utils/socketTimeout.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { generateScoreboard } from '../utils/scoreboard.js';
import { replaceAll } from '../utils/stringReplace.js';

const gameRoster = document.getElementById('game-roster-list');
const chatContainer = document.querySelector('.chat-container');
const chatMenu = document.getElementById('chat-menu');

const myCarousel = document.querySelector('#game-carousel');
const slideCarousel = new bootstrap.Carousel(myCarousel);
const myCarouselInner = myCarousel.querySelector('.carousel-inner');
const ssNext = document.getElementById('slide-show-next');
const ssPrev = document.getElementById('slide-show-prev');
const timer = document.getElementById('timer');

const userInfoModal = new bootstrap.Modal(
	document.getElementById('user-info-modal')
);

const userInfoName = document.getElementById('user-info-name');
const userInfoTeam = document.getElementById('user-info-team');
const userInfoConnected = document.getElementById('user-info-connected');
const confirmKickButton = document.getElementById('confirm-remove-user');
const kickName = document.getElementById('kick-user-name');

const popoutButton = document.getElementById('popout-button');
let ssWindow = undefined;
let popSlide = undefined;
let roundData = {
	format: undefined,
	qList: [],
	round: undefined,
	endBonus: undefined,
	maxWager: undefined,
};

let timerInterval;
let timeLeft;

const openSlideShowWindow = (e) => {
	if (popupOpen()) {
		if (!popupDoc()) return;
		if (popSlide && !popupDoc().querySelector('.carousel-item.active')) {
			popupDoc().querySelector('.carousel-inner').appendChild(popSlide);
		}
		return;
	}

	console.log(popSlide);

	const w = window.screen.width;
	const h = window.screen.height;
	ssWindow = window.open(
		`/slideshow/`,
		'_blank',
		`fullscreen=yes,location=no,menubar=no,resizable=yes,scrollbars=no,status=no,titlebar=no,toolbar=no,width=${w},height=${h}`
	);
	ssWindow.addEventListener(
		'load',
		(e) => {
			if (popSlide) {
				popupDoc().querySelector('.carousel-inner').appendChild(popSlide);
			}
		},
		true
	);
};

const popupOpen = () => {
	return ssWindow && !ssWindow.closed;
};

const popupDoc = () => {
	if (!popupOpen()) return undefined;
	return ssWindow.document;
};

const getTimeString = (time) => {
	return `${Math.floor(time / 60)}:${time % 60 < 10 ? '0' : ''}${time % 60}`;
};

const setTimer = (time) => {
	timeLeft = Math.max(0, Math.floor(time));
	const str = getTimeString(timeLeft);
	timer.innerHTML = str;
	if (popupOpen()) {
		const pTimer = popupDoc().getElementById('timer');
		if (pTimer) {
			pTimer.classList.remove('invisible-div');
			pTimer.innerHTML = str;
		}
	}
};

const decrementTimer = () => {
	timeLeft = Math.max(0, timeLeft - 1);
	const str = getTimeString(timeLeft);
	timer.innerHTML = str;
	if (popupOpen()) {
		const pTimer = popupDoc().getElementById('timer');
		if (pTimer) {
			pTimer.classList.remove('invisible-div');
			pTimer.innerHTML = str;
		}
	}
};

const startTimer = () => {
	timer.classList.remove('invisible-div');
	if (popupOpen()) {
		popupDoc().getElementById('timer').classList.remove('invisible-div');
	}
	if (timerInterval) clearInterval(timerInterval);
	timerInterval = setInterval(decrementTimer, 1000);
};

const stopTimer = () => {
	clearInterval(timerInterval);
	timer.classList.add('invisible-div');
	if (popupOpen()) {
		popupDoc().getElementById('timer').classList.add('invisible-div');
	}
};

const handlePopSlide = (data) => {
	const pop = popupOpen();
	if (!pop) return;
	let ns = createSlide(data);
	let popDoc = popupDoc();
	let popCI = popDoc.getElementById('game-carousel-inner');
	let popC = popDoc.getElementById('game-carousel');
	let popCarousel = new bootstrap.Carousel(popC);

	if (data.newRound) {
		console.log(data);

		roundData = {
			format: data.format,
			description: data.body,
			qList: [],
			round: data.round,
			endBonus: data.endBonus,
			maxWager: data.maxWager,
		};
	}

	if (data.clear || data.new) {
		popCI.appendChild(ns);

		const popActiveSlide = popC.querySelector('.carousel-item.active');
		if (popActiveSlide) {
			const len = popC.querySelectorAll('.carousel-item').length;
			popCarousel.to(len - 1);
		} else {
			ns.classList.add('active');
		}
		if (data.clear) {
			getElementArray(popC, '.carousel-item:not(:last-child)').forEach(
				(item) => {
					item.remove();
				}
			);
		}
		if (data.scores) {
			const popActive = popC.querySelector('.carousel-item');
			if (popActive) {
				generateScoreboard(popActive.querySelector('.slide-body'), data.scores);
			}
		}

		if (roundData.format === 'std' && !data.newRound) {
			roundData.qList.push(data.body);
		}
	} else if (!data.timer) {
		const popCurrent = popC.querySelector(
			'.carousel-item:last-child .slide-contents'
		);
		if (popCurrent) modifySlide(popCurrent, data);
	} else if (
		roundData.round % 2 === 1 ||
		(roundData.round === 4 && roundData.format === 'std')
	) {
		let body;
		if (roundData.round === 4) body = `${roundData.description}\n<ol>`;
		else body = `<ol>`;
		roundData.qList.forEach((q, i) => {
			if (i !== roundData.qList.length - 1) body = `${body}<li>${q}</li>`;
			else if (!roundData.endBonus) body = `${body}<li>${q}</li></ol>`;
			else {
				body = `${body}</ol><p>Bonus (wager 0-${roundData.maxWager}): ${q}</p>`;
			}
		});
		const recapSlide = createSlide({
			header: `Round ${roundData.round} ${
				roundData.round % 2 === 1 ? 'Recap' : 'Questions'
			}`,
			body,
		});
		const footer = recapSlide.querySelector('.slide-footer');
		const header = recapSlide.querySelector('.slide-header');
		if (footer) footer.remove();
		if (header) {
			header.classList.remove('.slide-header');
			header.classList.add('.recap-header');
		}
		const contents = recapSlide.querySelector('.slide-contents');
		contents.classList.remove('slide-contents');
		contents.classList.add('recap-contents');
		const recapBody = recapSlide.querySelector('.slide-body');
		recapBody.classList.add('recap-body');
		recapBody.classList.remove('slide-body');

		popCI.appendChild(recapSlide);

		const popActiveSlide = popC.querySelector('.carousel-item.active');
		if (popActiveSlide) {
			const len = popC.querySelectorAll('.carousel-item').length;
			popCarousel.to(len - 1);
		} else {
			ns.classList.add('active');
		}

		getElementArray(popC, '.carousel-item:not(:last-child)').forEach((item) => {
			item.remove();
		});

		popSlide = recapSlide;
	}
};

const handlePopArray = (data) => {
	const pop = popupOpen();
	if (!pop) return;
	let popDoc = popupDoc();
	let popCI = popDoc.getElementById('game-carousel-inner');
	let popC = popDoc.getElementById('game-carousel');
	let popCarousel = new bootstrap.Carousel(popC);

	if (
		data.every((d) => {
			return d.picture;
		})
	) {
		let ns = createPictureSlide(data);
		popCI.appendChild(ns);
		const popActiveSlide = popC.querySelector('.carousel-item.active');
		if (popActiveSlide) {
			const len = popC.querySelectorAll('.carousel-item').length;
			popCarousel.to(len - 1);
		} else {
			ns.classList.add('active');
		}
		popSlide = ns.cloneNode(true);
		popSlide.classList.add('active');
		popSlide.classList.remove('carousel-item-next', 'carousel-item-start');
	} else if (
		data.every((d) => {
			return d.body;
		})
	) {
		roundData.qList = data.map((d) => {
			return d.body;
		});
		handlePopSlide({ timer: true });
	}
};

const handleNewSlide = (data, ...toSetPop) => {
	let setPop = true;
	if (toSetPop.length > 0) {
		if (!toSetPop[0]) setPop = false;
	}

	stopTimer();

	if (data.clear || data.new) {
		const newSlide = createSlide(data);
		myCarouselInner.appendChild(newSlide);

		const activeSlide = myCarousel.querySelector('.carousel-item.active');

		if (activeSlide) {
			const len = myCarousel.querySelectorAll('.carousel-item').length;
			slideCarousel.to(len - 1);
		} else {
			newSlide.classList.add('active');
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
			if (activeSlide) {
				generateScoreboard(
					activeSlide.querySelector('.slide-body'),
					data.scores
				);
			}
		}
	} else if (data.timer) {
		setTimer(data.timer * 60);
		startTimer();
	} else {
		const currentSlide = myCarousel.querySelector(
			'.carousel-item:last-child .slide-contents'
		);

		if (currentSlide) modifySlide(currentSlide, data);
	}

	if (setPop) {
		popSlide = document
			.querySelector('.carousel-item:last-child')
			.cloneNode(true);
		popSlide.classList.remove('carousel-item-next', 'carousel-item-start');
		popSlide.classList.add('active');
		console.log(popSlide);
	}
};

const uncheckRadios = (e) => {
	const radios = getElementArray(
		document,
		`input[type="radio"][name="${e.target.name}"]`
	);
	radios.forEach((r) => {
		r.checked = false;
	});
};

const emptyBoxes = (e) => {
	const box = document.querySelector(
		`input[type="number"][name="${e.target.name}"]`
	);
	if (box) box.value = '';
};

const addAnswer = (r, q, ans, correct, partial, allowPartial) => {
	const gradingDiv = document.querySelector(
		`.round-grading-container[data-round="${r}"]`
	);
	if (!gradingDiv) return;

	const qgc = gradingDiv.querySelector(
		`.question-grading-container[data-question="${q}"]`
	);
	if (!qgc) return;

	const dataAns = ans.toLowerCase().trim();
	if (dataAns.length === 0) return;

	const noAns = qgc.querySelector('.no-answers');
	if (noAns) noAns.remove();

	if (
		qgc.querySelector(
			`.answer-row[data-question="${q}"][data-answer="${replaceAll(
				dataAns,
				'"',
				'&quot;'
			)}"]`
		)
	)
		return;
	const newRow = createElement('.answer-row');
	newRow.setAttribute('data-question', q);
	newRow.setAttribute('data-answer', replaceAll(dataAns, '"', '&quot;'));

	const box = createElement('input.partial-credit');
	box.setAttribute('type', 'number');
	box.setAttribute('placeholder', 'Partial');
	if (!allowPartial) {
		box.disabled = true;
	} else {
		box.addEventListener('change', uncheckRadios);
		if (partial > 0) box.value = partial;
	}
	const ansNo = qgc.querySelectorAll('.answer-row').length;
	box.setAttribute('name', `answer-${r}-${q}-${ansNo + 1}`);

	const ro1 = createElement('.radio-outer');
	const wrc = createElement('label.radio-container');
	const wr = createElement('input.wrong-radio');
	wr.setAttribute('type', 'radio');
	wr.setAttribute('name', `answer-${r}-${q}-${ansNo + 1}`);
	wr.setAttribute('data-answer', dataAns);
	wr.addEventListener('click', emptyBoxes);
	if (!correct && partial === 0) wr.checked = true;
	const sp1 = createElement('span.checkmark');
	wrc.appendChild(wr);
	wrc.appendChild(sp1);
	ro1.appendChild(wrc);

	const ro2 = createElement('.radio-outer');
	const rrc = createElement('label.radio-container');
	const rr = createElement('input.right-radio');
	rr.setAttribute('type', 'radio');
	rr.setAttribute('name', `answer-${r}-${q}-${ansNo + 1}`);
	rr.setAttribute('data-answer', dataAns);
	rr.addEventListener('click', emptyBoxes);
	if (correct) rr.checked = true;
	const sp2 = createElement('span.checkmark');
	rrc.appendChild(rr);
	rrc.appendChild(sp2);
	ro2.appendChild(rrc);

	const ansSpan = createElement('span.submitted-answer');
	ansSpan.innerHTML = dataAns;

	newRow.appendChild(box);
	newRow.appendChild(ro1);
	newRow.appendChild(ro2);
	newRow.appendChild(ansSpan);
	qgc.appendChild(newRow);
};

const addListAnswers = (r, answers, key) => {
	const gradingDiv = document.querySelector(
		`.round-grading-container[data-round="${r}"]`
	);
	if (!gradingDiv) return;

	answers.forEach((a) => {
		if (a.trim().length === 0) return;
		const ar = gradingDiv.querySelector(
			`.answer-row[data-answer="${replcaeAll(a.toLowerCase(), '"', '&quot;')}"]`
		);
		if (ar) return;
		const newRow = createElement('.answer-row.new-list-response');
		newRow.setAttribute(
			'data-answer',
			replaceAll(a.toLowerCase().trim(), '"', '&quot;')
		);
		newRow.addEventListener('click', (e) => {
			e.target.closest('.answer-row').classList.remove('new-list-response');
		});
		const dd = createElement('select');
		key.forEach((k) => {
			const op = createElement('option');
			op.setAttribute('value', k.answer);
			op.innerHTML = k.answer;
			dd.appendChild(op);
		});
		dd.addEventListener('change', (e) => {
			e.target.closest('.answer-row').classList.remove('new-list-response');
		});

		const ansSpan = createElement('span.submitted-answer');
		ansSpan.innerHTML = a;

		newRow.appendChild(dd);
		newRow.appendChild(ansSpan);

		const existingAnswers = getElementArray(gradingDiv, '.answer-row');

		if (
			!existingAnswers.some((e) => {
				if (a < e.getAttribute('data-answer')) {
					gradingDiv.insertBefore(newRow, e);
					return true;
				}
			})
		) {
			gradingDiv.appendChild(newRow);
		}
	});
};

const populateAnswers = (data) => {
	//todo: populate for halftime list round or matching round
	data.forEach((k, i) => {
		const gradingDiv = document.querySelector(
			`.round-grading-container[data-round="${i + 1}"]`
		);
		if (!gradingDiv) return;
		gradingDiv.innerHTML = '';
		if (k.format === 'questions' || k.format === 'audio') {
			k.answers.forEach((a, j) => {
				let qgc = gradingDiv.querySelector(
					`.question-grading-container[data-question="${j + 1}"]`
				);
				if (!qgc) {
					qgc = createElement('.question-grading-container');
					qgc.setAttribute('data-question', j + 1);
					const header = createElement('.answer-header');
					header.innerHTML = `${a.question}. ${a.answer} (${a.value} pts.)`;
					if (j === k.answers.length - 1) {
						if (i % 2 === 0) {
							header.innerHTML = `B. ${a.answer} (Wager 0-${a.value} pts.)`;
						} else if (k.format === 'audio') {
							header.innerHTML = `Theme. ${a.answer} (${a.value} pts.)`;
						}
					}
					qgc.appendChild(header);
				}
				gradingDiv.appendChild(qgc);
				if (a.submissions.length === 0) {
					const newRow = createElement('.no-answers');
					newRow.innerHTML = '(No answers submitted)';
					qgc.appendChild(newRow);
				}
				a.submissions.forEach((s) => {
					// (r, q, ans, correct, partial, allowPartial)
					addAnswer(
						i + 1,
						j + 1,
						s.answer,
						s.correct,
						s.partial,
						j !== k.answers.length - 1 || i % 2 !== 0
					);
				});
			});
		} else if (k.format === 'list') {
			const ansList = k.answers.map((a) => {
				return a.answer;
			});
			gradingDiv.innerHTML = '';

			k.answers.forEach((a) => {
				a.matches.forEach((m) => {
					const ar = gradingDiv.querySelector(
						`.answer-row[data-answer="${replaceAll(
							m.toLowerCase(),
							'"',
							'&quot;'
						)}"]`
					);
					if (ar) return;
					const newRow = createElement('.answer-row');
					newRow.setAttribute('data-answer', m.toLowerCase());

					const dd = createElement('select');
					ansList.forEach((item) => {
						const op = createElement('option');
						op.setAttribute('value', item);
						if (item === a.answer) op.setAttribute('selected', true);
						op.innerHTML = item;
						dd.appendChild(op);
					});

					const ansSpan = createElement('span.submitted-answer');
					ansSpan.innerHTML = m;

					newRow.appendChild(dd);
					newRow.appendChild(ansSpan);

					const existingAnswers = getElementArray(gradingDiv, '.answer-row');

					if (
						!existingAnswers.some((e) => {
							if (m.toLowerCase() < e.getAttribute('data-answer')) {
								gradingDiv.insertBefore(newRow, e);
								return true;
							}
						})
					) {
						gradingDiv.appendChild(newRow);
					}
				});
			});
		}
	});
};

const adjustScore = (e) => {
	const adj = parseInt(e.target.value);
	if (isNaN(adj)) return;

	const sumCell = e.target.closest('tr').querySelector('.total-cell');
	if (!sumCell) return;
	const base = parseInt(sumCell.getAttribute('data-score'));
	if (isNaN(base)) return;

	let cont = sumCell.querySelector('.score-container');
	if (!cont) {
		cont = createElement('.score-container');
		sumCell.innerHTML = '';
		sumCell.appendChild(cont);
	}
	cont.innerHTML = base + adj;
};

const createResultRows = (data) => {
	const adjs = getElementArray(document, '.res-table > tbody');
	adjs.forEach((a, j) => {
		const hr = a.closest('table').querySelector('thead > tr');
		const newRow = createElement('tr');
		newRow.classList.add('adjustment-row');
		newRow.setAttribute('data-round', a.getAttribute('data-round'));
		newRow.setAttribute('data-id', data.id);

		const nameCell = createElement('td');
		nameCell.classList.add('team-header');
		nameCell.innerHTML = `<div><span class="team-name">${data.name}</span>&nbsp;<span class="team-status" title="Round not submitted">❌</span></div>`;
		newRow.appendChild(nameCell);

		for (var i = 0; i < hr.cells.length - 3; i++) {
			const newCell = createElement('td');
			const newCont = createElement('.score-container');
			newCont.innerHTML = 0;
			newCell.classList.add('result-cell', 'incorrect');
			newCell.setAttribute('title', `Answer: [Blank]`);
			newCell.setAttribute('data-question', i + 1);
			newCell.appendChild(newCont);
			newRow.appendChild(newCell);
		}

		const adjCell = createElement('td');
		adjCell.classList.add('adjustment-cell');
		const adj = createElement('input');
		adj.setAttribute('type', 'number');
		adj.value = 0;
		adj.addEventListener('change', adjustScore);
		adjCell.appendChild(adj);
		newRow.appendChild(adjCell);

		const sumCell = createElement('td');
		const cont = createElement('.score-container');
		cont.innerHTML = '0';
		sumCell.appendChild(cont);
		sumCell.classList.add('total-cell');
		sumCell.setAttribute('data-score', '0');
		newRow.appendChild(sumCell);

		a.appendChild(newRow);
	});
};

document.addEventListener('DOMContentLoaded', () => {
	popoutButton.addEventListener('click', openSlideShowWindow);
});

export const Host = (socket) => {
	socket.on('connection-made', (data) => {
		setUserCookie(data);
		const sbs = getElementArray(document, '.start-button');
		sbs.forEach((s) => {
			s.classList.remove('invisible-block');
			s.disabled = false;
		});
	});
	socket.on('game-started', (data) => {
		hideMessage();

		const myId = getCookie('id');

		//restore the chat on refresh
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

		//restore the slide show on refresh
		data.newGame.slides.forEach((s) => {
			if (Array.isArray(s)) {
				s.forEach((s2) => {
					handleNewSlide(s2, false);
				});
				handlePopArray(s);
			} else {
				handleNewSlide(s);
				handlePopSlide(s);
			}
		});

		//restore the timer on refresh
		if (data.newGame.timeLeft) {
			setTimer(Math.floor(data.newGame.timeLeft / 1000));
			startTimer();
		}

		//restore the grading
		data.newGame.gameData.rounds.forEach((r, i) => {
			const rgc = document.getElementById(`grading-${i + 1}`);
			if (rgc) rgc.setAttribute('data-format', r.format || 'questions');

			//restore the result/adjustment table
			const rac = document.getElementById(`adjust-${i + 1}`);
			if (rac) {
				rac.innerHTML = '';
				const resTable = createElement('table.res-table');
				const head = createElement('thead');

				const bod = createElement('tbody');
				bod.setAttribute('id', `adj-table-${i + 1}`);
				bod.setAttribute('data-round', i + 1);

				const hr = createElement('tr.adjustment-row');
				const teamHeader = createElement('th.team-header');
				teamHeader.innerHTML = 'Team';
				hr.appendChild(teamHeader);

				if (i !== 3 || r.format === 'questions') {
					r.questions.forEach((q, j) => {
						const newCell = createElement('th.result-cell');
						newCell.setAttribute('title', `Answer: ${i !== 5 ? q.answer : q}`);
						newCell.innerHTML =
							i % 2 === 0 && j === r.questions.length - 1 ? 'W' : `${j + 1}`;
						newCell.setAttribute(
							'data-wager',
							i % 2 === 0 && j === r.questions.length - 1
						);
						newCell.setAttribute('data-value', q.value || r.pointsPerCorrect);
						hr.appendChild(newCell);
					});
					if (r.theme && r.themePoints) {
						const newCell = createElement('th.result-cell');
						newCell.setAttribute('title', `Answer: ${r.theme}`);
						newCell.innerHTML = 'T';
						newCell.setAttribute('data-wager', false);
						newCell.setAttribute('data-value', r.themePoints);
						hr.appendChild(newCell);
					}
				} else if (r.format === 'matching') {
					r.matchingPairs.forEach((m, j) => {
						const newCell = createElement('th.result-cell');
						newCell.setAttribute(
							'title',
							`Prompt: ${m.prompt}\nAnswer: ${m.answer}`
						);
						newCell.innerHTML = `${j + 1}`;
						hr.appendChild(newCell);
					});
				} else if (r.format === 'list') {
					for (var j = 0; j < r.answerCount; j++) {
						const newCell = createElement('th.result-cell');
						newCell.innerHTML = `${j + 1}`;
						hr.appendChild(newCell);
					}
				} else return;

				const ac = createElement('th.adjustment-cell');
				ac.innerHTML = 'Adj';
				hr.appendChild(ac);

				const tc = createElement('th.total-cell');
				tc.innerHTML = '&#931;';
				hr.appendChild(tc);

				head.appendChild(hr);
				resTable.appendChild(head);
				resTable.appendChild(bod);
				rac.appendChild(resTable);
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

		populateAnswers(data.newGame.key);

		data.newGame.teams.forEach((t) => {
			createResultRows({
				name: t.name,
				id: t.id,
			});
			t.submissions.forEach((s, i) => {
				if (!s.final) return;

				const ar = document.querySelector(
					`.adjustment-row[data-round="${i + 1}"][data-id="${t.id}"]`
				);
				if (!ar) return;

				const th = ar.querySelector('.team-header');
				if (th)
					th.innerHTML = `<div><span class="team-name">${t.name}</span>&nbsp;<span class="team-status">✅</span></div>`;
				//in the adjustment row...
				const resCells = getElementArray(ar, '.result-cell');
				const headerCells = getElementArray(
					ar.closest('table').querySelector('thead > tr'),
					'.result-cell'
				);
				resCells.forEach((r, j) => {
					//populate the scores for each question, and color the cell accordingly
					//set the titles to the answers given by that team
					r.setAttribute('title', `Answer: ${s.answers[j] || '[Blank]'}`);
					r.setAttribute('data-answer', s.answers[j]);
					const res = s.result[j].partial
						? 'partial'
						: s.result[j].correct
						? 'correct'
						: 'incorrect';
					if (res === 'partial') {
						r.innerHTML = s.result[j].partial;
						r.classList.remove('incorrect');
						r.classList.add('partial');
					} else if (res === 'correct') {
						//set the wager if it exists
						if (headerCells[j].getAttribute('data-wager') === 'false')
							r.innerHTML = headerCells[j].getAttribute('data-value');
						else {
							r.innerHTML = s.wager;
							r.setAttribute('data-wager', s.wager);
						}
						r.classList.remove('incorrect');
						r.classList.add('correct');
					} else {
						if (headerCells[j].getAttribute('data-wager') === 'true') {
							r.innerHTML = `-${s.wager}`;
							r.setAttribute('data-wager', s.wager);
						}
					}
				});

				const adjInput = ar.querySelector('input[type="number"]');
				if (adjInput) {
					adjInput.value = s.adjustment;
				}

				const sumCell = ar.querySelector('.total-cell');
				if (sumCell) {
					sumCell.innerHTML = s.score;
					sumCell.setAttribute('data-score', s.score - s.adjustment);
				}
			});
		});

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
		bp.addEventListener('click', (e) => {
			const id = e.target.getAttribute('data-id');
			if (confirmKickButton) {
				confirmKickButton.setAttribute('data-id', id);
				if (kickName) {
					kickName.innerHTML = data.name;
				}
			}
			socket.emit(
				'get-user-info',
				{
					id,
				},
				withTimeout(
					(res) => {
						if (res.status !== 'OK') return showMessage('error', res.message);
						userInfoName.innerHTML = res.data.name;
						userInfoTeam.innerHTML = res.data.team;
						userInfoConnected.innerHTML = res.data.connected ? 'Yes' : 'No';
						userInfoModal.show();
					},
					timeoutMessage('Request timed out - please try again'),
					3000
				)
			);
		});
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

	socket.on('new-team', (data) => {
		createResultRows(data);
	});

	socket.on('remove-team', (data) => {
		const rows = getElementArray(
			document,
			`.adjustment-row[data-id="${data.id}"]`
		);
		rows.forEach((r) => {
			const tn = r.querySelector('.team-name');
			const ts = r.querySelector('.team-status');
			if (tn) tn.classList.add('team-removed');
			if (ts) ts.innerHTML = '';
		});
	});

	socket.on('new-response', (data) => {
		// (r, q, ans, correct, partial, allowPartial)
		const gd = document.getElementById(`grading-${data.round}`);
		if (gd) gd.setAttribute('data-format', data.format);

		if (data.format === 'questions') {
			data.responses.forEach((r) => {
				r.answers.forEach((a, q) => {
					let allowPartial = false;
					if (q !== r.answers.length - 1) allowPartial = true;
					else if (data.round % 2 === 0) allowPartial = true;
					addAnswer(data.round, q + 1, a, false, 0, allowPartial);
				});
			});
		} else if (data.format === 'list') {
			data.responses.forEach((r) => {
				addListAnswers(data.round, r.answers, data.key.answers);
			});
		} else if (data.format === 'matching') {
			const adjc = document.querySelector(
				`.adjustment-container[data-round="${data.round}"]`
			);
			if (!adjc) return;
			data.responses.forEach((r) => {
				let score = 0;
				const adjr = adjc.querySelector(`.adjustment-row[data-id="${r.id}"]`);
				if (!adjr) return;
				r.answers.forEach((a, i) => {
					if (i >= data.key.answers.length) return;
					const cell = adjr.querySelector(
						`.result-cell[data-question="${i + 1}"]`
					);
					if (!cell) return;
					cell.classList.remove('correct', 'incorrect', 'partial');
					const cont = cell.querySelector('.score-container');
					if (a === data.key.answers[i].answer) {
						if (!cont)
							cell.innerHTML = `<div class="score-container">${data.key.answers[i].value}</div>`;
						else cont.innerHTML = data.key.answers[i].value;
						cell.classList.add('correct');
						score = score + data.key.answers[i].value;
					} else {
						if (!cont) cell.innerHTML = `<div class="score-container">0</div>`;
						else cont.innerHTML = 0;
						cell.classList.add('incorrect');
					}
				});
				const totalCell = adjr.querySelector('.total-cell');
				if (!totalCell) return;
				const cont = totalCell.querySelector('.score-container');
				if (!cont)
					totalCell.innerHTML = `<div class="score-container">${score}</div>`;
				else cont.innerHTML = score;
				totalCell.setAttribute('data-score', score);
			});
		}

		//mark the team as having submitted the round in the res/adj section
		const adjc = document.querySelector(
			`.adjustment-container[data-round="${data.round}"]`
		);
		if (!adjc) return;

		const row = adjc.querySelector(`tr.adjustment-row[data-id="${data.id}"]`);
		if (!row) return;

		const sp = row.querySelector('span.team-status');
		if (sp) {
			sp.innerHTML = '✅';
			sp.setAttribute('title', 'Round submitted');
		}

		//set the cell titles to the answers given
		data.responses.some((r) => {
			if (r.id === data.id) {
				const row = document.querySelector(
					`.adjustment-row[data-round="${data.round}"][data-id="${data.id}"]`
				);
				if (!row) {
					return true;
				}
				r.answers.forEach((a, i) => {
					const cell = row.querySelector(
						`.result-cell[data-question="${i + 1}"]`
					);
					if (cell) {
						cell.setAttribute('title', `Answer: ${a || '[Blank]'}`);
						cell.setAttribute('data-answer', a);
					}
				});
				return true;
			}
		});
		data.results.some((r) => {
			if (r.id === data.id) {
				const wager = r.submissions[data.round - 1].wager;
				if (wager) {
					const row = document.querySelector(
						`.adjustment-row[data-round="${data.round}"][data-id="${data.id}"]`
					);
					if (row) {
						const cell = row.querySelector(
							`.result-cell[data-question="${
								r.submissions[data.round - 1].answers.length
							}"]`
						);
						if (cell) {
							cell.innerHTML = `<div class="score-container">-${wager}</div>`;
							cell.setAttribute('data-wager', wager);
							const sumCell = row.querySelector('.total-cell');
							if (sumCell) {
								sumCell.innerHTML = `<div class="score-container">-${wager}</div>`;
								sumCell.setAttribute('data-score', -wager);
							}
						}
					}
				}
				return true;
			}
		});
		//set the values/colors of the cells if they match any graded answers
		//set the sum of the scores
	});

	ssNext.addEventListener('click', (e) => {
		const currentSlide = myCarousel.querySelector('.carousel-item.active');
		const lastSlide = myCarousel.querySelector('.carousel-item:last-child');

		// if (document.querySelectorAll('.score-row').length > 0) {
		// 	const remainingRows = document.querySelectorAll('.score-row');
		// 	if (remainingRows.length > 0) {
		// 		const item = remainingRows.item(remainingRows.length - 1);
		// 		item.classList.remove('invisible-div');
		// 		item.classList.remove('score-row');
		// 		item.classList.add('shown-row');
		// 	}
		// 	const shownRows = document.querySelectorAll('.shown-row');
		// 	if (shownRows.length > maxTeamsShown) {
		// 		shownRows.item(shownRows.length - 1).classList.add('invisible-div');
		// 		shownRows.item(shownRows.length - 1).classList.remove('shown-row');
		// 	}
		// } else

		if (currentSlide === lastSlide) {
			socket.emit(
				'next-slide',
				null,
				withTimeout(
					(res) => {
						if (res.status === 'OK') {
							console.log(res.data);
							if (Array.isArray(res.data)) {
								res.data.forEach((d) => {
									handleNewSlide(d, false);
								});
								handlePopArray(res.data);
								const count =
									myCarousel.querySelectorAll('.carousel-item').length;
								slideCarousel.to(count - 1);
							} else {
								handleNewSlide(res.data);
								handlePopSlide(res.data);
							}
						} else if (res.status === 'fail') {
							showMessage('error', res.message);
						} else if (res.status === 'END') {
							showMessage('info', 'Game ended.');
							const gr = document.querySelector(`tr[data-id="${res.id}"]`);
							if (gr && res.results.length > 0) gr.remove();
							if (chatContainer) {
								chatContainer.innerHTML = '';
							}
							document
								.querySelector('.top-navbar')
								.classList.remove('invisible-div');
							document
								.getElementById('assigned-games')
								.classList.remove('invisible-div');
							document
								.getElementById('hosting-container')
								.classList.add('invisible-div');
							mainContent.classList.remove('top-unset');
							mainContent.classList.remove('h-100');
							slideShowContainer.classList.add('invisible-div');
						}
					},
					timeoutMessage('Request timed out - try again.'),
					1000
				)
			);
		} else {
			slideCarousel.next();
		}
	});

	ssPrev.addEventListener('click', (e) => {
		slideCarousel.prev();
	});
};
