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
const videoLink = document.querySelector('.video-link');
const videoPreview = document.getElementById('video-preview');
const gameDate = document.getElementById('game-date');
const wcListAnswers = document.getElementById('wc-list-answers');
const wcListCount = document.getElementById('wc-list-count');
const audioTheme = document.getElementById('audio-theme');
const audioBonusValue = document.getElementById('audio-bonus-value');

gameDate.setAttribute('min', new Date().toISOString().split('T')[0]);

let loadedGame = {
	...blankGame,
};

const listeningForPaste = () => {
	const activeTabs = getElementArray(document, '.nav-link.active');
	let gamesActive = false;
	let picActive = false;

	const picRound =
		loadedGame.rounds.findIndex((r) => {
			return r.format === 'pic';
		}) + 1;

	if (!picRound) return false;

	activeTabs.forEach((t) => {
		if (t.getAttribute('id') === 'game-tab') gamesActive = true;
		if (parseInt(t.getAttribute('round')) === picRound) picActive = true;
	});

	return (
		gamesActive &&
		picActive &&
		loadedGame.rounds[picRound - 1].questions.length < 10
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
	const picRound =
		loadedGame.rounds.findIndex((r) => {
			return r.format === 'pic';
		}) + 1;
	if (picRound === 0) return;
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
	c2.classList.add('input-container', 'picture-answer');
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
	return con1;
};

const addPictureToRound = (file) => {
	if (typeof file === 'string') {
		const imgContainer = createPictureBody({
			image: file,
		});
		showMessage('info', 'Successfully added image');
	} else {
		const imgContainer = createPictureBody(file);
		const form = document.getElementById('image-upload-form');
		const formData = new FormData(form);

		formData.append('pictures', file);

		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Successfully uploaded image');
				imgContainer.setAttribute('src', res.data[0]);
			} else {
				showMessage('error', 'Something went wrong');
			}
		};

		showMessage('info', 'Uploading...', 10000);
		handleMultiRequest('/api/v1/games/picture', 'POST', formData, handler);
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
		addPictureToRound(e.target.files[i]);
	}
	e.target.value = '';
};

const handleImageURL = (e) => {
	addPictureToRound(linkUpload.value);
};

const handleImagePreview = (e) => {
	imgPreview.setAttribute('src', e.target.value);
};

const deleteMatchingAnswer = (e) => {
	e.target.closest('.matching-answer-row').remove();

	if (!document.querySelector('.matching-answer-row')) {
		matchingContainer
			.querySelector('.no-pairs')
			.classList.remove('invisible-div');
	}

	if (document.querySelectorAll('.matching-answer-row').length <= 2) {
		matchingContainer.classList.add('warning');
	}
};

const handleAddMatchingAnswer = (e) => {
	if (!(matchingAnswer.value && matchingPrompt.value)) return;

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

const handleKeys = (e) => {
	if (e.ctrlKey) {
		if (e.key.toUpperCase() === 'O') {
			e.preventDefault();
			showMessage('info', 'Opening game...');
		} else if (e.key.toUpperCase() === 'S') {
			e.preventDefault();
			showMessage('info', 'Saving game...');
		} else if (e.key.toUpperCase() === 'F') {
			e.preventDefault();
			autoPopulatePoints();
		} else if (e.key.toUpperCase() === 'Q') {
			e.preventDefault();
			showMessage('info', 'Closing...');
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

//auto-populate default points
actionPop.addEventListener('click', autoPopulatePoints);

const inputs = document.querySelectorAll(
	'.input-container input:not([type="radio"]), .input-container textarea, .question-container input:not([type="radio"]), .question-container textarea'
);

const handleInputChange = (e) => {
	//inputs that we don't care about if they change
	if (
		['matching-prompt', 'matching-answer', 'wc-matching-bank'].includes(
			e.target.id
		)
	)
		return;

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
	const warnings = pane.querySelectorAll('.warning');

	const id = pane.getAttribute('id');
	const button = document.querySelector(`.nav-link[data-bs-target="#${id}"]`);
	const wc = button.closest('.nav-item').querySelector('.warning-circle');

	if (warnings.length > 0) wc.classList.remove('invisible-div');
	else wc.classList.add('invisible-div');
};
console.log(inputs);
inputs.forEach((i) => {
	i.addEventListener('change', handleInputChange);
});

document.addEventListener('keydown', handleKeys);
