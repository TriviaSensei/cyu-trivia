import { getElementArray } from './utils/getElementArray.js';
import { handleRequest, handleMultiRequest } from './utils/requestHandler.js';
import { showMessage, hideMessage } from './utils/messages.js';
import { blankGame } from './utils/gameTemplate.js';
import { getEmbeddedLink } from './utils/videoEmbed.js';

const imageUpload = document.getElementById('image-upload');
const linkUpload = document.getElementById('image-link');
const imgPreview = document.getElementById('image-preview');
const addImageURL = document.getElementById('confirm-add-image');
const picContainer = document.getElementById('picture-round-questions');
const wcFormatRadio = getElementArray(document, '[name="wc-format"]');
const addMatchingAnswer = document.getElementById('add-matching-answer');
const matchingContainer = document.querySelector('.matching-answer-container');
const matchingPrompt = document.getElementById('matching-prompt');
const matchingAnswer = document.getElementById('matching-answer');
const wcMatchingBank = document.querySelector('#wc-matching-bank');
const videoLink = document.querySelector('.video-link');
const videoPreview = document.getElementById('video-preview');
const gameDate = document.getElementById('game-date');
const wcListAnswers = document.getElementById('wc-list-answers');
const wcListCount = document.getElementById('wc-list-count');
const audioTheme = document.getElementById('audio-theme');
const audioBonusValue = document.getElementById('audio-bonus-value');
const unsavedChanges = document.querySelector('.unsaved-changes');
const saveButton = document.getElementById('confirm-save');
const dontSaveButton = document.getElementById('dont-save');
const confirmDeleteButton = document.getElementById('confirm-delete-game');

const postVideos = getElementArray(document, '.video-container > input');

//modals
const saveChangesModal = new bootstrap.Modal(
	document.getElementById('save-changes-modal')
);
const openModal = new bootstrap.Modal(
	document.getElementById('open-game-modal')
);
const confirmDeleteModal = new bootstrap.Modal(
	document.getElementById('delete-game-modal')
);

const rounds = ['std', 'pic', 'std', 'wc', 'std', 'audio', 'std'];
const picRound =
	rounds.findIndex((r) => {
		return r === 'pic';
	}) + 1;

gameDate.setAttribute('min', new Date().toISOString().split('T')[0]);

let loadedGame = undefined;
let changesMade = false;
let action = undefined;
let gid = undefined;
let savedAction = undefined;
let gameSearchResults = [];

const setGID = (e) => {
	const button = e.target.closest('button');
	if (!button) return;
	gid = button.getAttribute('data-id');
	const action = button.getAttribute('data-action');
	if (action === 'delete') {
		confirmDeleteModal.show();
	} else if (action === 'restore') {
		deleteGame(null);
	}
};

const deleteGame = (e) => {
	if (!gid) return;
	const handler = (res) => {
		if (res.status === 'success') {
			const button = document.querySelector(`.delete-button[data-id="${gid}"]`);
			const editButton = document.querySelector(
				`.edit-button[data-id="${button.getAttribute('data-id')}"]`
			);
			if (res.action === 'delete') {
				showMessage(
					'info',
					'Game marked for deletion and will be removed from the database in 5 minutes.',
					2000
				);
				button.classList.add('restore-button');
				button.setAttribute('data-action', 'restore');

				if (editButton) {
					editButton.disabled = true;
				}
			} else if (res.action === 'restore') {
				showMessage('info', 'Game successfully restored.', 1000);
				button.classList.remove('restore-button');
				button.setAttribute('data-action', 'delete');
				if (editButton) {
					editButton.disabled = false;
				}
			}

			gid = undefined;
			action = undefined;
		} else {
			showMessage('error', res.message, 1000);
		}
	};
	handleRequest(`/api/v1/games/delete/${gid}`, 'PATCH', null, handler);
};
confirmDeleteButton.addEventListener('click', deleteGame);

const handleChangeMade = (e) => {
	changesMade = true;
	unsavedChanges.classList.remove('invisible-div');
};
wcMatchingBank.addEventListener('change', handleChangeMade);

const listeningForPaste = () => {
	const activeTabs = getElementArray(document, '.nav-link.active');
	let gamesActive = false;
	let picActive = false;

	if (!picRound) return false;

	activeTabs.forEach((t) => {
		if (t.getAttribute('id') === 'game-tab') gamesActive = true;
		if (parseInt(t.getAttribute('round')) === picRound) picActive = true;
	});

	return (
		gamesActive &&
		picActive &&
		document.querySelectorAll('.picture-question-container').length < 10
	);
};

const removePictureFromRound = (e) => {
	const r = parseInt(e.target.getAttribute('round'));
	const q = parseInt(e.target.getAttribute('question'));
	const qCount = document.querySelectorAll(
		'#picture-round-questions > .question-container'
	).length;

	if (!r || !q) return;

	e.target.closest('.question-container')?.remove();

	//set attributes for everything after the removed picture
	for (var i = q + 1; i <= qCount; i++) {
		const qc = document.querySelector(
			`.question-container[round="${r}"][question="${i}"]`
		);
		if (!qc) continue;
		//the container itself
		qc.setAttribute('question', i - 1);
		//the "Picture [N]" label
		qc.querySelector(
			'.picture-container > .input-label'
		).innerHTML = `Picture ${i - 1}`;

		const elements = getElementArray(qc, `[round="${r}"][question="${i}"]`);
		elements.forEach((el) => {
			el.setAttribute('question', i - 1);
		});
	}

	//show warning if no pictures left
	if (!document.querySelector('.picture-question-container')) {
		document.querySelector('#image-upload-container').classList.add('warning');
	}
};

const movePicture = (e) => {
	const thisImg = e.target
		.closest('.picture-question-container')
		?.querySelector('img');
	if (!thisImg) return;
	const thisSrc = thisImg.getAttribute('src');
	const thisQ = parseInt(thisImg.getAttribute('question'));

	const thisRound = parseInt(thisImg.getAttribute('round'));
	const thisAns = document.querySelector(
		`.picture-answer[round="${thisRound}"][question="${thisQ}"]`
	);
	if (!thisQ || !thisRound || !thisAns) return;

	const otherQ = thisQ + (e.target.getAttribute('direction') === 'up' ? -1 : 1);
	console.log(otherQ);
	if (!otherQ) return;
	const otherImg = document.querySelector(
		`.picture-question-container[round="${thisRound}"][question="${otherQ}"] img`
	);
	if (!otherImg) return;

	const otherAns = document.querySelector(
		`.picture-answer[round="${thisRound}"][question="${otherQ}"]`
	);
	const otherSrc = otherImg.getAttribute('src');

	if (!otherQ || !otherImg || !otherAns) return;

	const tempSrc = thisSrc;
	const tempAns = thisAns.value;

	thisImg.setAttribute('src', otherSrc);
	thisAns.value = otherAns.value;

	otherImg.setAttribute('src', tempSrc);
	otherAns.value = tempAns;
};

const createPictureBody = (file) => {
	if (!picRound) return;

	const q =
		document.querySelectorAll('#picture-round-questions > .question-container')
			.length + 1;

	const c0 = document.createElement('div');
	c0.classList.add('question-container');
	c0.setAttribute('round', picRound);
	c0.setAttribute('question', q);
	const container = document.createElement('div');
	container.classList.add('picture-question-container');
	container.setAttribute('round', picRound);
	container.setAttribute('question', q);

	const [c1, c2, c3] = [
		document.createElement('div'),
		document.createElement('div'),
		document.createElement('div'),
	];
	c1.classList.add('input-container', 'picture-container');
	c2.classList.add('input-container', 'picture-answer-container');
	c3.classList.add('input-container', 'picture-actions');

	const [l1, l2, l3] = [
		document.createElement('div'),
		document.createElement('div'),
		document.createElement('div'),
	];
	[l1, l2, l3].forEach((l) => {
		l.classList.add('input-label');
	});

	l1.innerHTML = `Picture ${q}`;
	l2.innerHTML = 'Answer';
	l3.innerHTML = 'Actions';

	const con1 = document.createElement('img');
	con1.setAttribute('src', file.image || URL.createObjectURL(file));
	con1.setAttribute('round', picRound);
	con1.setAttribute('question', q);

	const con2 = document.createElement('input');
	con2.classList.add('picture-answer', 'warning');
	con2.setAttribute('round', picRound);
	con2.setAttribute('question', q);
	con2.addEventListener('change', handleInputChange);

	const con3 = document.createElement('div');
	con3.classList.add('control-button-container');
	const con3Inner = document.createElement('div');
	const [b1, b2, b3] = [
		document.createElement('button'),
		document.createElement('button'),
		document.createElement('button'),
	];
	[b1, b2].forEach((b, i) => {
		b.classList.add('move-question');
		b.setAttribute('direction', i === 0 ? 'up' : 'down');
		b.setAttribute('round', picRound);
		b.setAttribute('question', q);
		b.addEventListener('click', movePicture);
	});
	b3.classList.add('delete-question');
	b3.setAttribute('round', picRound);
	b3.setAttribute('question', q);
	b1.innerHTML = 'Up';
	b2.innerHTML = 'Down';
	b3.innerHTML = 'Delete';
	b3.addEventListener('click', removePictureFromRound);

	con3Inner.appendChild(b1);
	con3Inner.appendChild(b2);
	con3Inner.appendChild(b3);
	con3.appendChild(con3Inner);

	c1.appendChild(l1);
	c2.appendChild(l2);
	c3.appendChild(l3);
	c1.appendChild(con1);
	c2.appendChild(con2);
	c3.appendChild(con3);

	container.appendChild(c1);
	container.appendChild(c2);
	container.appendChild(c3);
	c0.appendChild(container);
	picContainer.appendChild(c0);

	handleInputChange({ target: imageUpload });
	return con1;
};

const addPictureToRound = (file, ...messages) => {
	if (typeof file === 'string') {
		const imgContainer = createPictureBody({
			image: file,
		});
		if (messages.length === 0 || messages[0])
			showMessage('info', 'Successfully added image');
	} else {
		const imgContainer = createPictureBody(file);
		const form = document.getElementById('image-upload-form');
		const formData = new FormData(form);

		formData.append('pictures', file);

		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Successfully uploaded image');
				// imgContainer.setAttribute('src', res.data[0]);
				imgContainer.setAttribute('src', res.data.Location);
			} else {
				showMessage('error', 'Something went wrong');
			}
		};

		showMessage('info', 'Uploading...', 10000);
		// handleMultiRequest('/api/v1/games/picture', 'POST', formData, handler);
		handleMultiRequest('/api/v1/games/picture', 'POST', formData, handler);
	}

	if (document.querySelector('#image-upload-container.warning')) {
		document
			.querySelector('#image-upload-container.warning')
			.classList.remove('warning');
	}
};

const handlePaste = (evt) => {
	if (!listeningForPaste()) return;

	const clipboardItems = evt.clipboardData.items;
	const items = [].slice.call(clipboardItems).filter(function (item) {
		// Filter the image items only
		return item.type.indexOf('image') !== -1;
	});
	if (items.length === 0) {
		return;
	}

	const item = items[0];
	// Get the blob of image
	const blob = item.getAsFile();
	addPictureToRound(blob);
};

const handleImageUpload = (e) => {
	handleChangeMade(null);
	for (var i = 0; i < e.target.files.length; i++) {
		if (document.querySelectorAll('.picture-question-container').length < 10)
			addPictureToRound(e.target.files[i]);
	}
	e.target.value = '';
};

const handleImageURL = (e) => {
	handleChangeMade(null);
	addPictureToRound(linkUpload.value);
};

const handleImagePreview = (e) => {
	imgPreview.setAttribute('src', e.target.value);
};

const deleteMatchingAnswer = (e) => {
	handleChangeMade(null);
	e.target.closest('.matching-answer-row').remove();

	if (!document.querySelector('.matching-answer-row')) {
		matchingContainer
			.querySelector('.no-pairs')
			.classList.remove('invisible-div');
	}

	if (document.querySelectorAll('.matching-answer-row').length <= 2) {
		matchingContainer.classList.add('warning');
		handleInputChange({ target: wcListAnswers });
	}
};

const handleAddMatchingAnswer = (e) => {
	if (!(matchingAnswer.value && matchingPrompt.value)) return;
	handleChangeMade(null);
	matchingPrompt.value = replaceBrackets(matchingPrompt.value);
	matchingAnswer.value = replaceBrackets(matchingAnswer.value);

	matchingContainer.querySelector('.no-pairs').classList.add('invisible-div');

	const newDiv = document.createElement('div');
	newDiv.classList.add('matching-answer-row');
	const promptDiv = document.createElement('div');
	promptDiv.classList.add('matching-prompt-div');
	const ansDiv = document.createElement('div');
	ansDiv.classList.add('matching-answer-div');
	promptDiv.innerHTML = `<p>${matchingPrompt.value}</p>`;
	ansDiv.innerHTML = `<p>${matchingAnswer.value}</p>`;
	const delButton = document.createElement('button');
	delButton.classList.add('btn-close', 'delete-button');
	delButton.addEventListener('click', deleteMatchingAnswer);
	newDiv.appendChild(promptDiv);
	newDiv.appendChild(ansDiv);
	newDiv.appendChild(delButton);
	matchingContainer.appendChild(newDiv);
	matchingAnswer.value = '';
	matchingPrompt.value = '';
	matchingPrompt.focus();

	if (document.querySelectorAll('.matching-answer-row').length > 2) {
		matchingContainer.classList.remove('warning');
		handleInputChange({ target: wcListAnswers });
	}
};

const autoPopulatePoints = (e) => {
	showMessage('info', 'Auto-populating default settings...', 500);

	//GK round values
	for (var i = 1; i <= 7; i += 2) {
		const items = getElementArray(document, `.question-value[round="${i}"]`);
		items.forEach((el) => {
			const qNo = parseInt(el.getAttribute('question'));
			if (!qNo) return;
			el.value = Math.floor((qNo + 1) / 2) * 2;
			if (i === 7 && qNo === 9) el.value = 20;
			handleInputChange({ target: el });
		});

		const desc = document.querySelector(`.round-desc[round="${i}"]`);
		desc.value = `General knowledge\n8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager 0-${
			i === 7 ? 20 : 10
		} points`;
		handleInputChange({ target: desc });
	}

	//points per correct on all even rounds
	const ppc = getElementArray(document, '.points-per-correct');
	ppc.forEach((el) => {
		el.value = 4;
		handleInputChange({ target: el });
	});
	//audio bonus
	const bv = document.querySelector('.bonus-value');
	bv.value = 5;
	handleInputChange({ target: bv });

	//list answer count
	wcListCount.value = 10;
	handleInputChange({ target: wcListCount });

	//pic description
	const desc2 = document.querySelector(`.round-desc[round="2"]`);
	desc2.value = `Picture round\n`;

	//pic description
	const desc4 = document.querySelector(`.round-desc[round="4"]`);
	desc4.value = `Halftime\n`;

	//audio description
	const desc6 = document.querySelector(`.round-desc[round="6"]`);
	desc6.value = `Audio round\nName the title (2 points) and artist (2 points) for each clip.\nFor a 5-point bonus, give the theme that ties all of the titie/artists together.`;

	handleInputChange({ target: desc2 });
	handleInputChange({ target: desc4 });
	handleInputChange({ target: desc6 });
};

const replaceBrackets = (str) => {
	if (!str) return '';
	let s = str;
	while (s.indexOf('<') >= 0) {
		s = s.replace('<', '&lt;');
	}
	while (s.indexOf('>') >= 0) {
		s = s.replace('>', '&gt;');
	}
	return s;
};

const closeGame = () => {
	const contentContainer = document.getElementById('round-tab-content');
	const allInputs = getElementArray(contentContainer, 'input,textarea');
	const videoPreviews = getElementArray(
		contentContainer,
		'iframe.video-preview'
	);
	const matchingPairs = getElementArray(
		matchingContainer,
		'.matching-answer-row'
	);
	const radios = getElementArray(
		document,
		'input[type="radio"][name="wc-format"]'
	);

	//clear all input values
	allInputs.forEach((el) => {
		el.value = '';
		handleInputChange({ target: el });
	});

	//clear all video previews
	videoPreviews.forEach((v) => {
		v.setAttribute('src', '');
	});

	//remove matching round pairs
	matchingPairs.forEach((m) => {
		deleteMatchingAnswer({ target: m });
	});

	radios[0].click();

	loadedGame = undefined;
	changesMade = false;
	unsavedChanges.classList.add('invisible-div');
};

const handleSave = (post) => {
	const game = {
		title: document.getElementById('game-title').value,
		description: document.getElementById('game-desc').value,
		date: Date.parse(document.getElementById('game-date').value),
		rounds: [],
	};

	for (var i = 1; i <= rounds.length; i++) {
		const format = rounds[i - 1];
		let obj;

		if (format === 'std') {
			obj = {
				description: replaceBrackets(
					document.querySelector(`.round-desc[round="${i}"]`).value
				),
				questions: [],
				video: document
					.querySelector(`.video-preview[round="${i}"]`)
					.getAttribute('src'),
			};
			let q = 1;
			let qDiv = document.querySelector(
				`.question-container[round="${i}"][question="${q}"]`
			);
			while (qDiv) {
				obj.questions.push({
					text: replaceBrackets(qDiv.querySelector('.question-text').value),
					answer: replaceBrackets(qDiv.querySelector('.question-answer').value),
					value: parseInt(qDiv.querySelector('.question-value').value),
				});

				q++;
				qDiv = document.querySelector(
					`.question-container[round="${i}"][question="${q}"]`
				);
			}
		} else if (format === 'pic') {
			obj = {
				description: replaceBrackets(
					document.querySelector(`.round-desc[round="${i}"]`).value
				),
				pointsPerCorrect: parseInt(
					document.querySelector(`.points-per-correct[round="${i}"]`).value
				),
				questions: [],
				video: document
					.querySelector(`.video-preview[round="${i}"]`)
					.getAttribute('src'),
			};

			let q = 1;
			let qDiv = document.querySelector(
				`.picture-question-container[round="${i}"][question="${q}"]`
			);
			while (qDiv) {
				console.log(qDiv.querySelector('.picture-answer'));
				console.log(
					replaceBrackets(qDiv.querySelector('.picture-answer').value)
				);
				obj.questions.push({
					link: replaceBrackets(
						qDiv.querySelector('.picture-container > img').getAttribute('src')
					),
					answer: replaceBrackets(qDiv.querySelector('.picture-answer').value),
				});

				q++;
				qDiv = document.querySelector(
					`.question-container[round="${i}"][question="${q}"]`
				);
			}
		} else if (format === 'wc') {
			const roundFormat = document.querySelector(
				`[name="wc-format"][checked]`
			).value;
			obj = {
				description: replaceBrackets(
					document.querySelector(`.round-desc[round="${i}"]`).value
				),
				pointsPerCorrect: parseInt(
					document.querySelector(`.points-per-correct[round="${i}"]`).value
				),
				format: roundFormat,
				answerList: document
					.querySelector('#wc-list-answers')
					.value.split('\n')
					.map((a) => {
						return replaceBrackets(a);
					})
					.filter((a) => {
						return a.trim() !== '';
					}),
				answerCount: parseInt(document.querySelector('#wc-list-count').value),
				matchingPairs: getElementArray(document, '.matching-answer-row').map(
					(r) => {
						return {
							prompt: replaceBrackets(
								r.querySelector('.matching-prompt-div > p').innerHTML
							),
							answer: replaceBrackets(
								r.querySelector('.matching-answer-div > p').innerHTML
							),
						};
					}
				),
				extraAnswers: replaceBrackets(wcMatchingBank.value)
					.split('\n')
					.filter((a) => {
						return a.trim() !== '';
					}),
				questions: [],
				video: document
					.querySelector(`.video-preview[round="${i}"]`)
					.getAttribute('src'),
			};

			let q = 1;
			let qDiv = document.querySelector(
				`.question-container[round="${i}"][question="${q}"]`
			);
			while (qDiv) {
				obj.questions.push({
					text: replaceBrackets(qDiv.querySelector('.question-text').value),
					answer: replaceBrackets(qDiv.querySelector('.question-answer').value),
				});

				q++;
				qDiv = document.querySelector(
					`.question-container[round="${i}"][question="${q}"]`
				);
			}
		} else if (format === 'audio') {
			obj = {
				description: replaceBrackets(
					document.querySelector(`.round-desc[round="${i}"]`).value
				),
				pointsPerCorrect: parseInt(
					document.querySelector(`.points-per-correct[round="${i}"]`).value
				),
				questions: document
					.querySelector(`.round-answers[round="${i}"]`)
					.value.split('\n')
					.map((a) => {
						return replaceBrackets(a);
					})
					.filter((a) => {
						return a.trim() !== '';
					}),
				videoLink: document.querySelector(`#video-preview`).getAttribute('src'),
				theme: document.querySelector('#audio-theme').value,
				themePoints: parseInt(
					document.querySelector('#audio-bonus-value').value
				),
				video: document
					.querySelector(`.video-preview[round="${i}"]`)
					.getAttribute('src'),
			};
		}

		game.rounds.push(obj);
	}

	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully saved game.');
			loadedGame = res.data._id;
			changesMade = false;
			unsavedChanges.classList.add('invisible-div');
			if (post === 'close') {
				closeGame();
			} else if (post) {
				openGame(post);
			}
		} else {
			if (res.error.code === 11000) {
				showMessage(
					'error',
					`Duplicate title - "${res.error.keyValue.title}" is already taken.`,
					2000
				);
			} else showMessage('error', res.message, 2000);
		}
	};
	const str = `/api/v1/games/${loadedGame || ''}`;
	const type = loadedGame ? 'PATCH' : 'POST';

	handleRequest(str, type, game, handler);
};

const handleClose = (e) => {
	if (changesMade) {
		saveChangesModal.show();
	} else {
		showMessage('info', 'Closing game...');
		closeGame();
	}
};

const createGameTile = (data) => {
	const sgc = document.getElementById('saved-game-container');
	const newRow = document.createElement('div');
	newRow.classList.add('game-row');

	const gameInfo = document.createElement('div');
	gameInfo.classList.add('game-info');
	const h = document.createElement('h5');
	h.style.fontWeight = 'bold';
	h.innerHTML = data.title || 'Untitled game';
	const desc = document.createElement('p');
	desc.innerHTML = data.description || 'No description available';
	const date = document.createElement('p');
	date.innerHTML = data.date ? data.date.split('T')[0] : 'No date';
	gameInfo.appendChild(h);
	gameInfo.appendChild(desc);
	gameInfo.appendChild(date);
	newRow.appendChild(gameInfo);

	const actions = document.createElement('div');
	actions.classList.add('actions');
	const editButton = document.createElement('button');
	editButton.classList.add('btn-close', 'edit-button');
	editButton.setAttribute('data-id', data._id);
	editButton.setAttribute('data-index', data.index);
	editButton.addEventListener('click', handleOpen);
	if (data.deleteAfter) editButton.disabled = true;

	const deleteButton = document.createElement('button');
	deleteButton.classList.add('btn-close', 'delete-button');
	deleteButton.setAttribute(
		'data-action',
		data.deleteAfter ? 'restore' : 'delete'
	);
	deleteButton.setAttribute('data-id', data._id);
	deleteButton.setAttribute(
		'alt',
		data.deleteAfter ? 'Restore game' : 'Delete game'
	);
	deleteButton.addEventListener('click', setGID);
	actions.appendChild(editButton);
	actions.appendChild(deleteButton);

	newRow.appendChild(actions);

	sgc.appendChild(newRow);
};

const openWindow = (e) => {
	openModal.show();
	const loadingGameDiv = document.getElementById('loading-game-div');

	const handler = (res) => {
		if (res.status === 'success') {
			console.log(res.data);
			loadingGameDiv.classList.add('invisible-div');
			const sgc = document.getElementById('saved-game-container');
			sgc.innerHTML = '';
			gameSearchResults = res.data;
			res.data.forEach((g, i) => {
				createGameTile({ ...g, index: i });
			});
		} else {
			showMessage('error', 'Something went wrong');
			openModal.close();
		}
	};
	loadingGameDiv.classList.remove('invisible-div');
	handleRequest('/api/v1/games', 'GET', null, handler);
};

const handleKeys = (e) => {
	if (e.ctrlKey) {
		if (e.key.toUpperCase() === 'O') {
			e.preventDefault();
			openWindow(e);
		} else if (e.key.toUpperCase() === 'S') {
			e.preventDefault();
			showMessage('info', 'Saving game...');
			handleSave(null);
		} else if (e.key.toUpperCase() === 'F') {
			e.preventDefault();
			autoPopulatePoints();
		} else if (e.key.toUpperCase() === 'Q' || e.key.toUpperCase() === 'M') {
			e.preventDefault();
			handleClose(null);
		} else if (e.key.toUpperCase() === 'H') {
			e.preventDefault();
			showMessage('info', 'Assigning to host...');
		}
	} else if (
		e.key.toUpperCase() === 'RETURN' ||
		e.key.toUpperCase() === 'ENTER'
	) {
		if (
			document.activeElement === matchingAnswer ||
			document.activeElement === matchingPrompt
		) {
			e.preventDefault();
			handleAddMatchingAnswer(null);
		}
	}
};

//picture round controls/listeners
imageUpload.addEventListener('change', handleImageUpload);
document.addEventListener('paste', handlePaste);
linkUpload.addEventListener('change', handleImagePreview);
addImageURL.addEventListener('click', handleImageURL);

//wildcard round controls/listeners
//switching round format
wcFormatRadio.forEach((r) => {
	r.addEventListener('change', (e) => {
		['list', 'matching', 'questions'].forEach((el) => {
			document.getElementById(`${el}-settings`).classList.add('invisible-div');
		});
		if (e.target.checked) {
			document
				.getElementById(`${e.target.value}-settings`)
				?.classList.remove('invisible-div');
			handleInputChange({ target: wcListAnswers });
		}
	});
});
//adding matching answer
addMatchingAnswer.addEventListener('click', handleAddMatchingAnswer);

//music round controls/listeners
videoLink.addEventListener('change', (e) => {
	const result = getEmbeddedLink(e.target.value);
	console.log(result);
	if (result.status === 'success') {
		videoPreview.setAttribute('src', result.link);
		videoPreview.parentElement.classList.remove('invisible-div');
	} else {
		videoPreview.setAttribute('src', '');
		videoPreview.parentElement.classList.add('invisible-div');
		if (result.message !== 'No link given') {
			showMessage('error', result.message, 1000);
		}
	}
});

//menu listeners
const [fileNew, fileOpen, fileSave, fileClose, actionPop, actionAssign] = [
	'file-new',
	'file-open',
	'file-save',
	'file-close',
	'action-pop',
	'action-assign',
].map((a) => {
	return document.getElementById(a);
});
fileSave.addEventListener('click', (e) => {
	handleSave(null);
});
fileNew.addEventListener('click', handleClose);
fileOpen.addEventListener('click', openWindow);
fileClose.addEventListener('click', handleClose);

//auto-populate default points
actionPop.addEventListener('click', autoPopulatePoints);

const inputs = document.querySelectorAll(
	'.input-container input:not([type="radio"]):not([type="file"]), .input-container textarea, .question-container input:not([type="radio"]), .question-container textarea'
);

const handleInputChange = (e) => {
	handleChangeMade(null);
	//inputs that we don't care about if they change
	if (
		['matching-prompt', 'matching-answer', 'wc-matching-bank'].includes(
			e.target.id
		)
	)
		return;
	else if (e.target.getAttribute('type') === 'radio') return;

	//inputs to be treated specially
	//list count greater than number of possible answers
	if (e.target === wcListAnswers || e.target === wcListCount) {
		//answer count needs a value that is at no more than the number of answers listed
		if (
			parseInt(wcListCount.value) >
			wcListAnswers.value.split('\n').filter((v) => {
				return v.trim().length > 0;
			}).length
		) {
			wcListAnswers.classList.add('warning');
			wcListCount.classList.add('warning');
		} else if (!wcListCount.value) {
			wcListCount.classList.add('warning');
		} else {
			wcListCount.classList.remove('warning');
			wcListAnswers.classList.remove('warning');
		}
	} else if (e.target === audioTheme || e.target === audioBonusValue) {
		//if there is an audio theme, it must be given a value
		if (audioTheme.value && !audioBonusValue.value) {
			audioTheme.classList.add('warning');
			audioBonusValue.classList.add('warning');
		} else {
			audioTheme.classList.remove('warning');
			audioBonusValue.classList.remove('warning');
		}
	} else {
		if (e.target.value) {
			e.target.classList.remove('warning');
		} else {
			e.target.classList.add('warning');
		}
	}

	const pane = e.target.closest('.tab-pane');
	let warnings;
	if (e.target === wcListAnswers || e.target === wcListCount) {
		warnings = pane.querySelectorAll(
			'.wc-settings:not(.invisible-div) .warning'
		);
	} else {
		warnings = pane.querySelectorAll('.warning');
	}

	const id = pane.getAttribute('id');
	const button = document.querySelector(`.nav-link[data-bs-target="#${id}"]`);
	const wc = button.closest('.nav-item').querySelector('.warning-circle');

	if (warnings.length > 0) wc.classList.remove('invisible-div');
	else wc.classList.add('invisible-div');
};

inputs.forEach((i) => {
	i.addEventListener('change', handleInputChange);
});

const handlePostVideo = (e) => {
	handleChangeMade(null);
	const res = getEmbeddedLink(e.target.value);
	const frame = document.querySelector(
		`.video-container > iframe[round="${e.target.getAttribute('round')}"]`
	);
	if (res.status === 'success') {
		frame.setAttribute('src', res.link);
	} else if (res.message === 'No link given') {
		frame.setAttribute('src', '');
	} else {
		showMessage('error', res.message);
		e.target.value = '';
		frame.setAttribute('src', '');
	}
};

postVideos.forEach((v) => {
	v.addEventListener('change', handlePostVideo);
});

document.addEventListener('keydown', handleKeys);
saveButton.addEventListener('click', (e) => {
	handleSave('close');
});
dontSaveButton.addEventListener('click', (e) => {
	closeGame();
});

const handleOpen = (e) => {
	loadedGame = e.target.getAttribute('data-id');
	const index = parseInt(e.target.getAttribute('data-index'));
	const data = gameSearchResults[index];

	if (!data) return;

	console.log(data);

	//game info
	document.getElementById('game-title').value = data.title;
	document.getElementById('game-desc').value = data.description;
	document.getElementById('game-date').value = data.date
		? data.date.split('T')[0]
		: '';

	data.rounds.forEach((r, i) => {
		const desc = document.querySelector(`.round-desc[round="${i + 1}"]`);
		if (desc) desc.value = r.description;

		if (r.pointsPerCorrect) {
			const ppc = document.querySelector(
				`.points-per-correct[round="${i + 1}"]`
			);
			if (ppc) ppc.value = r.pointsPerCorrect;
		}

		if (i % 2 === 0) {
			r.questions.forEach((q, j) => {
				const attr = `[round="${i + 1}"][question="${j + 1}"]`;
				const text = document.querySelector(`.question-text${attr}`);
				const ans = document.querySelector(`.question-answer${attr}`);
				const val = document.querySelector(`.question-value${attr}`);

				if (text && ans && val) {
					text.value = q.text;
					ans.value = q.answer;
					val.value = q.value;
				}
			});
		} else {
			if (i === 1) {
				document
					.getElementById('image-upload-container')
					.classList.add('warning');
				r.questions.forEach((q, j) => {
					const attr = `[round="${i + 1}"][question="${j + 1}"]`;
					addPictureToRound(q.link, false);
					const ans = document.querySelector(`.picture-answer${attr}`);
					if (ans) ans.value = q.answer;
					handleInputChange({ target: ans });
				});
			}
		}
	});

	inputs.forEach((i) => {
		handleInputChange({ target: i });
	});
	openModal.hide();

	changesMade = false;
	unsavedChanges.classList.add('invisible-div');
};
