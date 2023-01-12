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
const confirmOverwrite = document.getElementById('confirm-overwrite');
const dontOverwrite = document.getElementById('dont-overwrite');
const postVideos = getElementArray(
	document,
	'.video-container input[type="text"]'
);
const videoStartTimes = getElementArray(
	document,
	'.video-container input[type="number"]'
);
const addHost = document.getElementById('add-host');
const loadingDiv = document.getElementById('host-loading-div');
const nonHostContainer = document.getElementById('non-hosts');
const hostContainer = document.getElementById('hosts');
const hostListContainer = document.getElementById('host-list-container');
const editHostContainer = document.getElementById('edit-host-container');
const editHostListContainer = document.getElementById(
	'edit-host-list-container'
);

const createGigButton = document.getElementById('create-new-gig');
const venueSelect = document.getElementById('venue-select');
const createGigForm = document.getElementById('new-gig-modal-form');
const gigDate = document.getElementById('gig-date');
const gigHour = document.getElementById('hour');
const gigMin = document.getElementById('minute');
const gigAMPM = document.getElementById('ampm');
const gameSelect = document.getElementById('game-select');
const addHostsLabel = document.getElementById('add-hosts-label');

const editGigButton = document.getElementById('browse-gig');
const editGigSelect = document.getElementById('edit-gig-select');
const editVenueSelect = document.getElementById('edit-venue-select');
const editGigForm = document.getElementById('edit-gig-modal-form');
const editGigDate = document.getElementById('edit-gig-date');
const editGigHour = document.getElementById('edit-hour');
const editGigMin = document.getElementById('edit-minute');
const editGigAMPM = document.getElementById('edit-ampm');
const editGameSelect = document.getElementById('edit-game-select');
const editHostsLabel = document.getElementById('edit-hosts-label');
const confirmEditGig = document.getElementById('confirm-edit-gig');

let gigMode = '';

//modals
const createGigModal = new bootstrap.Modal(
	document.getElementById('create-gig-modal')
);
const saveChangesModal = new bootstrap.Modal(
	document.getElementById('save-changes-modal')
);
const openModal = new bootstrap.Modal(
	document.getElementById('open-game-modal')
);
const confirmDeleteModal = new bootstrap.Modal(
	document.getElementById('delete-game-modal')
);
const overwriteModal = new bootstrap.Modal(
	document.getElementById('overwrite-modal')
);
const hostModal = new bootstrap.Modal(document.getElementById('host-modal'));

const rounds = ['std', 'pic', 'std', 'wc', 'std', 'audio', 'std'];
const picRound =
	rounds.findIndex((r) => {
		return r === 'pic';
	}) + 1;

gameDate.setAttribute('min', new Date().toISOString().split('T')[0]);

let loadedGame = undefined;
let changesMade = false;
let gid = undefined;
let gameSearchResults = [];
let gigList = [];

let allHosts = [];
let hosts = [];
let nonHosts = [];
let editHosts = [];
let editNonHosts = [];

let venueList = [];
let savedAction;

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

			if (gameSearchResults) {
				gameSearchResults.some((g) => {
					if (g._id === res.data._id) {
						g.deleteAfter = res.action === 'delete';
						return true;
					}
				});
			}

			gid = undefined;
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
		document
			.querySelector('#image-upload-container > .question-container-bottom')
			.classList.add('warning');
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
	con2.addEventListener('keydown', handleInputKey);

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

	handleInputChange(imageUpload);
	return con1;
};

const addPictureToRound = (file, ...messages) => {
	handleChangeMade(null);
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

	const qcb = document.querySelector(
		'#image-upload-container > .question-container-bottom.warning'
	);
	if (qcb) {
		qcb.classList.remove('warning');
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
	for (var i = 0; i < e.target.files.length; i++) {
		if (document.querySelectorAll('.picture-question-container').length < 10)
			addPictureToRound(e.target.files[i]);
		else {
			showMessage(
				'error',
				'There is a 10-picture limit for picture rounds.',
				1000
			);
			break;
		}
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
		handleInputChange(wcListAnswers);
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
		handleInputChange(wcListAnswers);
	}
};

const autoPopulatePoints = (overwrite) => {
	showMessage('info', 'Auto-populating default settings...', 500);

	//game description
	const gameDesc = document.getElementById('game-desc');
	if (!gameDesc.value || overwrite) {
		gameDesc.value = 'https://www.cyutrivia.com/play\n';
		handleInputChange(gameDesc);
	}

	//GK round values
	for (var i = 1; i <= 7; i += 2) {
		const items = getElementArray(document, `.question-value[round="${i}"]`);
		items.forEach((el) => {
			if (el.value && !overwrite) return;
			const qNo = parseInt(el.getAttribute('question'));
			if (!qNo) return;
			el.value = Math.floor((qNo + 1) / 2) * 2;
			if (i === 7 && qNo === 9) el.value = 20;
			handleInputChange(el);
		});

		const desc = document.querySelector(`.round-desc[round="${i}"]`);
		if (overwrite || !desc.value) {
			desc.value = `General knowledge\n8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager 0-${
				i === 7 ? 20 : 10
			} points`;
			handleInputChange(desc);
		}
	}

	//points per correct on all even rounds
	const ppc = getElementArray(document, '.points-per-correct');
	ppc.forEach((el) => {
		if (el.value && !overwrite) return;
		el.value = 4;
		handleInputChange(el);
	});
	//audio bonus
	const bv = document.querySelector('.bonus-value');
	if (!bv.value || overwrite) {
		bv.value = 5;
		handleInputChange(bv);
	}

	//list answer count
	if (!wcListCount.value || overwrite) {
		wcListCount.value = 10;
		handleInputChange(wcListCount);
	}

	//description defaults
	let descs = ['', '', ''];
	//pic description
	descs[0] = `Picture round\n`;
	//wc description
	descs[1] = `Halftime\n`;
	//audio description
	descs[2] = `Audio round\nName the title (2 points) and artist (2 points) for each clip.\nFor a 5-point bonus, give the theme that ties all of the titie/artists together.`;

	descs.forEach((d, i) => {
		const desc = document.querySelector(`.round-desc[round="${i * 2 + 2}"]`);
		if (desc.value && !overwrite) return;
		desc.value = d;
		handleInputChange(desc);
	});
};

confirmOverwrite.addEventListener('click', (e) => {
	autoPopulatePoints(true);
});
dontOverwrite.addEventListener('click', (e) => {
	autoPopulatePoints(false);
});

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
	const videoPreviews = getElementArray(contentContainer, 'iframe');
	const matchingPairs = getElementArray(
		matchingContainer,
		'.matching-answer-row'
	);
	const pictures = getElementArray(
		contentContainer,
		'#picture-round-questions > .question-container'
	);
	const radios = getElementArray(
		document,
		'input[type="radio"][name="wc-format"]'
	);

	//clear all input values
	allInputs.forEach((el) => {
		el.value = '';
		handleInputChange(el);
	});

	pictures.forEach((p) => {
		removePictureFromRound({ target: p });
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
	hosts = [];
	nonHosts = allHosts.slice(0);
	populateHostLists();
	changesMade = false;
	unsavedChanges.classList.add('invisible-div');
};

const handleSave = (post) => {
	const game = {
		title: document.getElementById('game-title').value,
		description: document.getElementById('game-desc').value,
		date: Date.parse(document.getElementById('game-date').value),
		rounds: [],
		assignedHosts: hosts,
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
				video: document.querySelector(
					`.video-container input[type="text"][round="${i}"]`
				).value,
				videoStart: parseInt(
					document.querySelector(
						`.video-container input[type="number"][round="${i}"]`
					).value
				),
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
				video: document.querySelector(
					`.video-container input[type="text"][round="${i}"]`
				).value,
				videoStart: parseInt(
					document.querySelector(
						`.video-container input[type="number"][round="${i}"]`
					).value
				),
			};

			let q = 1;
			let qDiv = document.querySelector(
				`.picture-question-container[round="${i}"][question="${q}"]`
			);
			while (qDiv) {
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
				`[name="wc-format"]:checked`
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
				video: document.querySelector(
					`.video-container input[type="text"][round="${i}"]`
				).value,
				videoStart: parseInt(
					document.querySelector(
						`.video-container input[type="number"][round="${i}"]`
					).value
				),
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
				videoLink: document.querySelector(`.video-link`).value,
				theme: document.querySelector('#audio-theme').value,
				themePoints: parseInt(
					document.querySelector('#audio-bonus-value').value
				),
				video: document.querySelector(
					`.video-container input[type="text"][round="${i}"]`
				).value,
				videoStart: parseInt(
					document.querySelector(
						`.video-container input[type="number"][round="${i}"]`
					).value
				),
			};
		}

		game.rounds.push(obj);
	}

	const handler = (res) => {
		if (res.status === 'success') {
			if (res.message) {
				showMessage(
					'info',
					`Changes saved, but game is not ready. ${res.message}`,
					2000
				);
			} else {
				showMessage('info', 'Successfully saved game.');
			}
			loadedGame = res.data._id;
			changesMade = false;
			unsavedChanges.classList.add('invisible-div');

			const searchIndex = gameSearchResults.findIndex((g) => {
				return g._id === res.data._id;
			});
			if (searchIndex >= 0) {
				gameSearchResults[searchIndex] = res.data;
			}

			if (post === 'close') {
				closeGame();
			} else if (post) {
				handleOpen(document.querySelector(`.edit-button[data-id="${post}"]`));
			}

			getGames(null);
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
	console.log(game);
};

const handleClose = (e) => {
	if (changesMade) {
		savedAction = 'close';
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
	editButton.setAttribute('data-bs-dismiss', 'modal');
	editButton.addEventListener('click', handleClickEdit);
	if (data.deleteAfter) editButton.disabled = true;

	const deleteButton = document.createElement('button');
	deleteButton.classList.add('btn-close', 'delete-button');
	if (data.deleteAfter) {
		deleteButton.classList.add('restore-button');
	}
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

	if (gameSearchResults.length === 0) {
		const handler = (res) => {
			if (res.status === 'success') {
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
	} else {
		loadingGameDiv.classList.add('invisible-div');
		const sgc = document.getElementById('saved-game-container');
		sgc.innerHTML = '';
		gameSearchResults.forEach((g, i) => {
			createGameTile({ ...g, index: i });
		});
	}
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
			overwriteModal.show();
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
			handleInputChange(wcListAnswers);
		}
	});
});
//adding matching answer
addMatchingAnswer.addEventListener('click', handleAddMatchingAnswer);

//music round controls/listeners
const handleAudioRoundVideo = (e) => {
	const result = getEmbeddedLink(e.target.value, 0, false);
	if (result.status === 'success') {
		videoPreview.setAttribute('src', result.link);
		videoPreview.classList.remove('invisible-div');
	} else {
		videoPreview.setAttribute('src', '');
		videoPreview.classList.add('invisible-div');
		if (result.message !== 'No link given') {
			showMessage('error', result.message, 1000);
		}
	}
};
videoLink.addEventListener('change', handleAudioRoundVideo);

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
actionPop.addEventListener('click', (e) => {
	overwriteModal.show();
});

const inputs = document.querySelectorAll(
	'.input-container input:not([type="radio"]):not([type="file"]), .input-container textarea, .question-container input:not([type="radio"]), .question-container textarea, .video-container input'
);

const handleInputChange = (element) => {
	handleChangeMade(null);
	//inputs that we don't care about if they change
	if (
		['matching-prompt', 'matching-answer', 'wc-matching-bank'].includes(
			element.id
		)
	)
		return;
	else if (element.getAttribute('type') === 'radio') return;

	//inputs to be treated specially
	//list count greater than number of possible answers
	if (element === wcListAnswers || element === wcListCount) {
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
	} else if (element === audioTheme || element === audioBonusValue) {
		//if there is an audio theme, it must be given a value
		if (audioTheme.value && !audioBonusValue.value) {
			audioTheme.classList.add('warning');
			audioBonusValue.classList.add('warning');
		} else {
			audioTheme.classList.remove('warning');
			audioBonusValue.classList.remove('warning');
		}
	} else if (
		element.getAttribute('type') !== 'file' &&
		!element.closest('.video-container')
	) {
		if (element.value) {
			element.classList.remove('warning');
		} else {
			element.classList.add('warning');
		}
	}

	const pane = element.closest('.tab-pane');
	let warnings;
	if (element.closest('.tab-pane').getAttribute('id') === 'r4') {
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

const handleInputKey = (e) => {
	const oldValue = e.target.value;
	let newValue;
	setTimeout(() => {
		newValue = e.target.value;
		if (newValue.toString() !== oldValue.toString()) {
			handleInputChange(e.target);
		}
	});
};

inputs.forEach((i) => {
	i.addEventListener('keydown', handleInputKey);
});

const handlePostVideo = (e) => {
	handleChangeMade(null);
	const startTime = parseInt(
		e.target.closest('.video-container').querySelector('input[type="number"]')
			.value
	);
	const videoLink = e.target
		.closest('.video-container')
		.querySelector('input[type="text"]');

	if (!videoLink.value) return;

	const res = getEmbeddedLink(videoLink.value, Math.max(0, startTime), false);
	const frame = document.querySelector(
		`.video-container > iframe[round="${e.target.getAttribute('round')}"]`
	);
	if (res.status === 'success') {
		frame.setAttribute('src', res.link);
	} else if (res.message === 'No link given') {
		frame.setAttribute('src', '');
	} else {
		showMessage('error', res.message);
		videoLink.value = '';
		frame.setAttribute('src', '');
	}
};

postVideos.forEach((v) => {
	v.addEventListener('change', handlePostVideo);
});
videoStartTimes.forEach((v) => {
	v.addEventListener('change', handlePostVideo);
});

document.addEventListener('keydown', handleKeys);
saveButton.addEventListener('click', (e) => {
	handleSave(savedAction);
	savedAction = undefined;
});
dontSaveButton.addEventListener('click', (e) => {
	closeGame();

	if (savedAction) {
		handleOpen(
			document.querySelector(`.edit-button[data-id="${savedAction}"]`)
		);
		savedAction = undefined;
	}
});

const handleOpen = (element) => {
	loadedGame = element.getAttribute('data-id');
	const index = parseInt(element.getAttribute('data-index'));
	const data = gameSearchResults[index];

	if (!data) return;

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
				//remove all pictures first
				const els = getElementArray(
					document,
					`#picture-round-questions > .question-container`
				);
				els.forEach((el) => {
					el.remove();
				});

				document
					.querySelector('#image-upload-container > .question-container-bottom')
					.classList.add('warning');
				r.questions.forEach((q, j) => {
					const attr = `[round="${i + 1}"][question="${j + 1}"]`;
					addPictureToRound(q.link, false);
					const ans = document.querySelector(`.picture-answer${attr}`);
					if (ans) ans.value = q.answer;
					handleInputChange(ans);
				});
			} else if (i === 3) {
				//list answers
				wcListAnswers.value = r.answerList.join('\n');
				handleInputChange(wcListAnswers);
				wcListCount.value = r.answerCount;
				handleInputChange(wcListCount);

				//matching answers
				const rows = getElementArray(document, '.matching-answer-row');
				rows.forEach((el) => {
					el.remove();
				});
				document.querySelector('.no-pairs').classList.remove('invisible-div');
				r.matchingPairs.forEach((p) => {
					matchingPrompt.value = p.prompt;
					matchingAnswer.value = p.answer;
					handleAddMatchingAnswer(null);
				});
				wcMatchingBank.value = r.extraAnswers.join('\n');

				r.questions.forEach((q, j) => {
					const qText = document.querySelector(
						`.question-text[round="${i + 1}"][question="${j + 1}"]`
					);
					const qAns = document.querySelector(
						`.question-answer[round="${i + 1}"][question="${j + 1}"]`
					);
					if (!qText || !qAns) return;
					qText.value = q.text;
					qAns.value = q.answer;
				});

				const radio = document.querySelector(
					`input[type="radio"][name="wc-format"][value="${r.format}"]`
				);
				if (radio) {
					radio.click();
				}
			} else if (i === 5) {
				if (videoLink) {
					videoLink.value = r.videoLink;
					handleAudioRoundVideo({ target: videoLink });
				}
				const rAnswers = document.querySelector('.round-answers[round="6"]');
				rAnswers.value = r.questions.join('\n');
				const theme = document.getElementById('audio-theme');
				const themePts = document.getElementById('audio-bonus-value');
				if (theme) theme.value = r.theme;
				if (themePts) themePts.value = r.themePoints;
			}
		}
		if (r.video) {
			const videoInput = document.querySelector(
				`.video-container input[type="text"][round="${i + 1}"]`
			);
			videoInput.value = r.video;

			const videoStart = document.querySelector(
				`.video-container input[type="number"][round="${i + 1}"]`
			);
			videoStart.value = r.videoStart;
			handlePostVideo({ target: videoInput });
		}
	});

	inputs.forEach((i) => {
		handleInputChange(i);
	});
	openModal.hide();

	changesMade = false;
	loadHosts(null);
	unsavedChanges.classList.add('invisible-div');
};

const handleClickEdit = (e) => {
	if (changesMade) {
		savedAction = e.target.getAttribute('data-id');
		saveChangesModal.show();
	} else {
		handleOpen(e.target);
	}
};

const toggleHost = (e) => {
	if (!gigMode) return;

	const parent = e.target.closest(
		'.list-left, .list-right, #host-list-container, #edit-host-list-container'
	);
	if (!parent) return;
	const hostId = e.target.getAttribute('data-id');

	let hostList;
	if (gigMode === 'create') hostList = hostListContainer;
	else hostList = editHostListContainer;

	//removing a host from a game
	if (
		parent === hostContainer ||
		parent === hostListContainer ||
		parent === editHostListContainer
	) {
		//move the tile to the "available hosts" side
		nonHostContainer.appendChild(
			document.querySelector(`.host-tile[data-id="${hostId}"]`)
		);

		//remove the tile from the list of hosts outside the modal
		const hostDiv = hostList.querySelector(`.host-div[data-id="${hostId}"]`);
		if (hostDiv) hostDiv.remove();

		if (!hostList.querySelector('.host-div')) {
			document
				.querySelector(gigMode === 'create' ? '.no-hosts' : '.edit-no-hosts')
				.classList.remove('invisible-div');
		}

		if (gigMode === 'create') {
			nonHosts.push(
				hosts.find((h) => {
					return h._id === hostId;
				})
			);
			hosts = hosts.filter((h) => {
				return h._id !== hostId;
			});

			if (parent === hostListContainer) {
				const tile = e.target.closest('.host-div');
				if (tile) tile.remove();
			}
		} else {
			editNonHosts.push(
				editHosts.find((h) => {
					return h._id === hostId;
				})
			);
			editHosts = editHosts.filter((h) => {
				return h._id !== hostId;
			});

			if (parent === editHostListContainer) {
				const tile = e.target.closest('.host-div');
				if (tile) tile.remove();
			}
		}
	}
	//adding a host to a game
	else if (parent === nonHostContainer) {
		hostContainer.appendChild(e.target.closest('.host-tile'));
		if (gigMode === 'create') {
			const newHost = nonHosts.find((h) => {
				return h._id === hostId;
			});
			hosts.push(newHost);
			hostListContainer.appendChild(createHostDiv(newHost));
			document.querySelector('.no-hosts').classList.add('invisible-div');
			nonHosts = nonHosts.filter((h) => {
				return h._id !== hostId;
			});
		} else {
			const newHost = editNonHosts.find((h) => {
				return h._id === hostId;
			});
			editHosts.push(newHost);
			editHostListContainer.appendChild(createHostDiv(newHost));
			document.querySelector('.edit-no-hosts').classList.add('invisible-div');
			editNonHosts = editNonHosts.filter((h) => {
				return h._id !== hostId;
			});
		}
	}
};

const createTile = (data) => {
	const newTile = document.createElement('div');
	newTile.classList.add('host-tile');
	newTile.classList.add('host-div');
	newTile.setAttribute('data-id', data._id);
	const content = document.createElement('div');
	content.innerHTML = data.name || `${data.lastName}, ${data.firstName}`;
	const button = document.createElement('button');
	button.classList.add('btn-close');
	button.setAttribute('data-id', data._id);
	button.addEventListener('click', toggleHost);
	newTile.appendChild(content);
	newTile.appendChild(button);
	return newTile;
};

const createHostDiv = (data) => {
	const newTile = document.createElement('div');
	newTile.classList.add('host-div');
	newTile.setAttribute('data-id', data._id);
	const content = document.createElement('div');
	content.innerHTML = data.name || `${data.lastName}, ${data.firstName}`;
	const button = document.createElement('button');
	button.classList.add('btn-close');
	button.classList.add('delete-button');
	button.setAttribute('data-id', data._id);
	button.addEventListener('click', toggleHost);
	newTile.appendChild(content);
	newTile.appendChild(button);
	return newTile;
};

const populateHostLists = () => {
	nonHostContainer.innerHTML = '';
	hostContainer.innerHTML = '';
	hostListContainer.innerHTML = '';
	nonHosts.forEach((u) => {
		nonHostContainer.appendChild(createTile(u));
	});
	document.querySelector('.no-hosts').classList.remove('invisible-div');
	hosts.forEach((u) => {
		hostContainer.appendChild(createTile(u));
		document.querySelector('.no-hosts').classList.add('invisible-div');
		hostListContainer.appendChild(createHostDiv(u));
	});
	loadingDiv.classList.add('invisible-div');
};

const populateEditHostLists = (data) => {
	//clear the containers in the modal
	nonHostContainer.innerHTML = '';
	hostContainer.innerHTML = '';
	//clear the container in the edit gig window
	editHostListContainer.innerHTML = '';
	editHosts = [];
	editNonHosts = [];

	allHosts.forEach((h) => {
		if (data.includes(h._id)) {
			editHosts.push(h);
			document.querySelector('.edit-no-hosts').classList.add('invisible-div');
			hostContainer.appendChild(createTile(h));
			editHostListContainer.appendChild(createHostDiv(h));
		} else {
			editNonHosts.push(h);
			nonHostContainer.appendChild(createTile(h));
		}
	});
};

const loadHosts = () => {
	if (loadingDiv) loadingDiv.classList.remove('invisible-div');
	hostContainer.innerHTML = '';
	nonHostContainer.innerHTML = '';

	const handler = (res) => {
		if (res.status === 'success') {
			allHosts = res.data;
			nonHosts = [];
			hosts = [];
			editHosts = [];
			editNonHosts = [];

			// let lg = undefined;
			// if (loadedGame) {
			// 	lg = gameSearchResults.find((g) => {
			// 		return g._id.toString() === loadedGame;
			// 	});
			// }

			res.data.forEach((h) => {
				const obj = {
					name: `${h.lastName}, ${h.firstName}`,
					_id: h._id,
					assignedGames: h.assignedGames,
				};
				nonHosts.push(obj);
				editNonHosts.push(obj);
			});
			populateHostLists();
		} else {
			showMessage('error', 'Something went wrong', 1000);
		}
	};
	handleRequest('/api/v1/users/getAll', 'GET', null, handler);
};
loadHosts();

const handleCreateGig = (e) => {
	if (e.target !== createGigForm) return;
	e.preventDefault();

	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully added gig');
			gigDate.value = '';
			gigHour.selectedIndex = 6;
			gigMinute.selectedIndex = 0;
			gigAMPM.selectedIndex = 1;
			hosts = [];
			nonHosts = allHosts.slice(0);
			gigList.push(res.data);
			populateHostLists();
		} else {
			showMessage('error', res.message);
		}
	};

	const str = '/api/v1/gigs/';
	const body = {
		venue: venueSelect.value,
		date: gigDate.value,
		game: gameSelect.value,
		hour: parseInt(gigHour.value) + (gigAMPM.value === 'pm' ? 12 : 0),
		minute: parseInt(gigMin.value),
		hosts: hosts.map((h) => {
			return h._id;
		}),
	};
	handleRequest(str, 'POST', body, handler);
};

const handleEditGig = (e) => {
	if (e.target !== editGigForm) return;
	e.preventDefault();

	if (!editGigSelect.value) return;

	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully modified gig');
			console.log(res.data);
			console.log(gigList);
			gigList = gigList.map((g) => {
				if (g._id === res.data._id) {
					return res.data;
				} else {
					return g;
				}
			});
			console.log(gigList);
		} else {
			showMessage('error', res.message);
		}
	};
	const str = `/api/v1/gigs/edit/${editGigSelect.value}`;
	const body = {
		venue: editVenueSelect.value,
		date: editGigDate.value,
		game: editGameSelect.value,
		hour: parseInt(editGigHour.value) + (editGigAMPM.value === 'pm' ? 12 : 0),
		minute: parseInt(editGigMin.value),
		hosts: editHosts.map((h) => {
			return h._id;
		}),
	};
	console.log(body);
	handleRequest(str, 'PATCH', body, handler);
};

const getVenues = (e) => {
	if (venueList.length === 0) {
		const handler = (res) => {
			if (res.status === 'success') {
				venueList = res.data;
				if (venueSelect) venueSelect.innerHTML = '';
				if (editVenueSelect) editVenueSelect.innerHTML = '';
				venueList.forEach((v) => {
					const op = document.createElement('option');
					op.innerHTML = v.name;
					op.value = v._id;
					if (venueSelect) venueSelect.appendChild(op);
					if (editVenueSelect) editVenueSelect.appendChild(op.cloneNode(true));
				});
			} else {
				showMessage('error', res.message);
			}
		};
		const str = '/api/v1/venues';
		handleRequest(str, 'GET', null, handler);
	}
};

const populateGigs = () => {
	if (!editGigSelect) return;
	editGigSelect.innerHTML = '';
	const o1 = document.createElement('option');
	o1.innerHTML = '[Select a gig]';
	editGigSelect.appendChild(o1);
	gigList.forEach((g) => {
		const op = document.createElement('option');
		op.innerHTML = `${g.date.split('T')[0]} - ${
			g.hour % 12 === 0 ? 12 : g.hour % 12
		}:${g.minute === 0 ? '00' : g.minute} ${g.hour >= 12 ? 'PM' : 'AM'} - ${
			g.venue.name
		}`;
		op.value = g._id;
		editGigSelect.appendChild(op);
	});
};

const selectGig = (e) => {
	const selectedId = e?.target?.value || '';
	const gig = gigList.find((g) => {
		return g._id === selectedId;
	});

	if (!e || !gig) {
		editVenueSelect.disabled = true;
		editGigDate.value = '';
		editGigDate.disabled = true;
		editGameSelect.disabled = true;
		editGigHour.disabled = true;
		editGigMin.disabled = true;
		editGigAMPM.disabled = true;
		confirmEditGig.disabled = true;
		editHostContainer.classList.add('invisible-div');
		editHostsLabel.classList.add('invisible-div');
	} else {
		editVenueSelect.value = gig.venue._id;
		editGigDate.value = gig.date.split('T')[0];
		editGameSelect.value = gig.game;
		editGigHour.value = gig.hour % 12;
		editGigMin.value = gig.minute || '00';
		editGigAMPM.value = gig.hour >= 12 ? 'pm' : 'am';
		editVenueSelect.disabled = false;
		editGameSelect.disabled = false;
		editGigDate.disabled = false;
		editGigHour.disabled = false;
		editGigMin.disabled = false;
		editGigAMPM.disabled = false;
		confirmEditGig.disabled = false;
		editHostContainer.classList.remove('invisible-div');
		editHostsLabel.classList.remove('invisible-div');

		console.log(gig);

		populateEditHostLists(gig.hosts);
	}
};

const getGigs = (e) => {
	if (gigList.length === 0) {
		const handler = (res) => {
			if (res.status === 'success') {
				gigList = res.data;
				populateGigs();
			} else {
				showMessage('error', res.message);
			}
		};
		const str = `/api/v1/gigs/upcoming`;
		handleRequest(str, 'GET', null, handler);
	}
};

const getGames = (e) => {
	const handler = (res) => {
		if (res.status === 'success') {
			gameSelect.innerHTML = '';
			editGameSelect.innerHTML = '';
			res.data.forEach((g) => {
				const op = document.createElement('option');
				op.innerHTML = g.title;
				op.value = g._id;
				gameSelect.appendChild(op);
				editGameSelect.appendChild(op.cloneNode(true));
			});
		} else {
			showMessage('error', res.message);
		}
	};
	const str = '/api/v1/games/';
	handleRequest(str, 'GET', null, handler);
};

const setMode = (e) => {
	if (e.target === addHostsLabel || e.target === createGigButton)
		gigMode = 'create';
	else if (e.target === editHostsLabel || e.target === editGigButton)
		gigMode = 'edit';
	else gigMode = '';
};

if (createGigModal && createGigButton) {
	createGigButton.addEventListener('click', getVenues);
	createGigButton.addEventListener('click', getGames);
	createGigButton.addEventListener('click', populateHostLists);
	createGigButton.addEventListener('click', setMode);
	editGigButton.addEventListener('click', getVenues);
	editGigButton.addEventListener('click', getGames);
	editGigButton.addEventListener('click', getGigs);
	editGigButton.addEventListener('click', setMode);
}

if (createGigForm) {
	createGigForm.addEventListener('submit', handleCreateGig);
}
if (editGigForm) {
	editGigSelect.addEventListener('change', selectGig);
	editGigForm.addEventListener('submit', handleEditGig);
}
if (addHostsLabel) addHostsLabel.addEventListener('click', setMode);
if (editHostsLabel) editHostsLabel.addEventListener('click', setMode);
