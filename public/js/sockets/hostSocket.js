const mainContent = document.querySelector('.main-content');
const slideShowContainer = document.querySelector('#slideshow-outer');
import { createChatMessage } from '../utils/chatMessage.js';
import { setUserCookie, getCookie } from '../utils/cookie.js';
import { getElementArray } from '../utils/getElementArray.js';
import { hideMessage, showMessage } from '../utils/messages.js';
import { createSlide, modifySlide } from '../utils/slideshow.js';
import { withTimeout } from '../utils/socketTimeout.js';
import { createElement } from '../utils/createElementFromSelector.js';

const gameRoster = document.getElementById('game-roster-list');
const chatContainer = document.querySelector('.chat-container');

const myCarousel = document.querySelector('#game-carousel');
const slideCarousel = new bootstrap.Carousel(myCarousel);
const myCarouselInner = myCarousel.querySelector('.carousel-inner');
const ssNext = document.getElementById('slide-show-next');
const ssPrev = document.getElementById('slide-show-prev');
const timer = document.getElementById('timer');
let timerInterval;
let timeLeft;

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
	timer.classList.add('invisible-div');
};

const handleNewSlide = (data, ...toSetActive) => {
	let setActive = true;
	if (toSetActive.length > 0) {
		if (!toSetActive[0]) setActive = false;
	}

	stopTimer();

	if (data.clear || data.new) {
		const newSlide = createSlide(data);
		myCarouselInner.appendChild(newSlide);

		if (setActive) {
			if (!myCarousel.querySelector('.carousel-item.active')) {
				myCarousel
					.querySelector('.carousel-item.active')
					?.classList.remove('active');
				newSlide.classList.add('active');
			} else {
				slideCarousel.next();
			}
		}
		if (data.clear) {
			getElementArray(myCarousel, '.carousel-item:not(:last-child)').forEach(
				(item) => {
					item.remove();
				}
			);
		}
	} else if (data.timer) {
		setTimer(data.timer * 60);
		startTimer();
	} else {
		modifySlide(data);
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
	const noAns = qgc.querySelector('.no-answers');
	if (noAns) noAns.remove();

	if (
		qgc.querySelector(
			`.answer-row[data-question="${q}"][data-answer="${ans.toLowerCase()}"]`
		)
	)
		return;
	const newRow = createElement('.answer-row');
	newRow.setAttribute('data-question', q);
	newRow.setAttribute('data-answer', ans.toLowerCase());

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
	wr.setAttribute('data-answer', ans.toLowerCase());
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
	rr.setAttribute('data-answer', ans.toLowerCase());
	rr.addEventListener('click', emptyBoxes);
	if (correct) rr.checked = true;
	const sp2 = createElement('span.checkmark');
	rrc.appendChild(rr);
	rrc.appendChild(sp2);
	ro2.appendChild(rrc);

	const ansSpan = createElement('span.submitted-answer');
	ansSpan.innerHTML = ans.toLowerCase();

	newRow.appendChild(box);
	newRow.appendChild(ro1);
	newRow.appendChild(ro2);
	newRow.appendChild(ansSpan);
	qgc.appendChild(newRow);
};

const populateAnswers = (data) => {
	//todo: populate for halftime list round or matching round
	data.forEach((k, i) => {
		const gradingDiv = document.querySelector(
			`.round-grading-container[data-round="${i + 1}"]`
		);
		if (!gradingDiv) return;
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
				} else console.log(a);
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
					// if (
					// 	qgc.querySelector(
					// 		`.answer-row[data-question="${
					// 			j + 1
					// 		}"][data-answer="${s.answer.toLowerCase()}"]`
					// 	)
					// )
					// 	return;
					// const newRow = createElement('.answer-row');
					// newRow.setAttribute('data-question', j + 1);
					// newRow.setAttribute('data-answer', s.answer.toLowerCase());

					// const box = createElement('input.partial-credit');
					// box.setAttribute('type', 'number');
					// if (j === k.answers.length - 1 && i % 2 === 0) {
					// 	box.disabled = true;
					// } else {
					// 	box.addEventListener('change', uncheckRadios);
					// 	if (s.partial > 0) box.value = s.partial;
					// }
					// box.setAttribute('name', `answer-${i}-${j}-${k}`);

					// const wr = createElement('input.wrong-radio');
					// wr.setAttribute('type', 'radio');
					// wr.setAttribute('name', `answer-${i}-${j}-${k}`);
					// wr.setAttribute('data-answer', s.answer.toLowerCase());
					// wr.addEventListener('click', emptyBoxes);
					// if (!s.correct && s.partial === 0) wr.checked = true;

					// const rr = createElement('input.right-radio');
					// rr.setAttribute('type', 'radio');
					// rr.setAttribute('name', `answer-${i}-${j}-${k}`);
					// rr.setAttribute('data-answer', s.answer.toLowerCase());
					// rr.addEventListener('click', emptyBoxes);
					// if (s.correct) rr.checked = true;

					// const ansSpan = createElement('span.submitted-answer');
					// ansSpan.innerHTML = s.answer.toLowerCase();

					// newRow.appendChild(box);
					// newRow.appendChild(wr);
					// newRow.appendChild(rr);
					// newRow.appendChild(ansSpan);
					// qgc.appendChild(newRow);
				});
			});
		} else {
		}
	});
};

export const Host = (socket) => {
	socket.on('set-user-cookie', setUserCookie);

	socket.on('game-started', (data) => {
		hideMessage();
		console.log(data);

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

		populateAnswers(data.newGame.key);

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

	socket.on('new-response', (data) => {
		console.log(data);
		// (r, q, ans, correct, partial, allowPartial)

		data.responses.forEach((r) => {
			r.answers.forEach((a, q) => {
				console.log(q, r.answers.length, data.round);
				let allowPartial = false;
				if (q !== r.answers.length - 1) allowPartial = true;
				else if (data.round % 2 !== 0) allowPartial = true;
				addAnswer(data.round, q + 1, a, false, 0, allowPartial);
			});
		});
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
									handleNewSlide(d);
								});
								const count =
									myCarousel.querySelectorAll('.carousel-item').length;
								slideCarousel.to(count - 1);
							} else {
								handleNewSlide(res.data);
							}
						} else {
							showMessage('error', res.message);
						}
					},
					() => {
						showMessage('error', res.message);
					},
					1000
				)
			);
		} else {
			slideCarousel.next();
		}
	});

	ssPrev.addEventListener('click', (e) => {
		console.log('prev');
		slideCarousel.prev();
	});
};
