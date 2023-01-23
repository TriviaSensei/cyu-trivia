const navbar = document.querySelector('.top-navbar');
const contactForm = document.getElementById('contact-form');
const liveNow = document.querySelector('.live-now');
const contentDiv = document.querySelector('.main-content');
const menu = document.querySelector('.menu-button');
const menuContent = document.querySelector('.menu-content-mobile');

import { questions, pictures, wildcard } from './utils/questions.js';
import { getElementArray } from './utils/getElementArray.js';

const bsQuestionCarousel = new bootstrap.Carousel(
	document.getElementById('question-carousel'),
	{
		interval: false,
	}
);
const bsPictureCarousel = new bootstrap.Carousel(
	document.getElementById('picture-carousel'),
	{
		interval: false,
	}
);
const bsWildcardCarousel = new bootstrap.Carousel(
	document.getElementById('wildcard-carousel'),
	{
		interval: false,
	}
);

let socket = io();

let currentFooter;
let liveInterval;

const blinkLive = () => {
	liveNow.classList.toggle('invisible-div');
};

const scrollToSection = (e) => {
	const name = e.target.closest('.navlink')?.getAttribute('data-target');
	if (!name) return;

	const r = document.querySelector(`.body-section[name="${name}"]`);
	if (!r || !navbar) return;
	const rect = r.getBoundingClientRect();
	const scrollTo = contentDiv.scrollTop + rect.top - navbar.offsetHeight - 20;
	contentDiv.scrollTo({
		top: Math.max(0, scrollTo),
	});
	if (menuShowing) {
		toggleMenu();
	}
};

const revealAnswer = (e) => {
	if (e.type === 'touchend' || e.type === 'mouseup') {
		if (!currentFooter) return;
		currentFooter.innerHTML = 'Hold to reveal answer';
		currentFooter = undefined;
		return;
	}

	if (
		!e.target.closest('.slide-footer') ||
		!e.target.getAttribute('data-answer')
	)
		return;

	if (e.target.getAttribute('data-answer')) {
		currentFooter = e.target;
		e.target.innerHTML = e.target.getAttribute('data-answer');
	}
};

let maxHeight;

const createSlide = (slideshow, data) => {
	const carousel = document.querySelector(`${slideshow} > .carousel-inner`);
	const indicators = document.querySelector(
		`${slideshow} > .carousel-indicators`
	);

	if (!carousel) return;
	//slide
	const item = document.createElement('div');
	item.classList.add('carousel-item');

	//flair at upper left of slide
	const f1 = document.createElement('div');
	const f2 = document.createElement('div');
	f1.classList.add('flair-div', 'd1');
	f2.classList.add('flair-div', 'd2');
	item.appendChild(f1);
	item.appendChild(f2);

	//contents
	const contents = document.createElement('div');
	contents.classList.add('slide-contents');
	item.appendChild(contents);
	const [header, body, footer] = ['header', 'body', 'footer'].map((el) => {
		const element = document.createElement('div');
		element.classList.add(`slide-${el}`);
		element.classList.add('slide-content-wrapper');
		// element.setAttribute('id', `${el}-${data.question}`);
		contents.appendChild(element);
		const inner = document.createElement('div');
		inner.classList.add('fill-container');
		element.appendChild(inner);
		return inner;
	});
	carousel.appendChild(item);
	footer.classList.add('emphasis');
	footer.setAttribute('data-question', data.question - 1);
	footer.setAttribute('data-answer', data.answer);
	document.addEventListener('mousedown', revealAnswer);
	document.addEventListener('touchstart', revealAnswer);
	document.addEventListener('mouseup', revealAnswer);
	document.addEventListener('touchend', revealAnswer);
	footer.innerHTML = 'Hold to reveal answer';

	//indicator
	if (indicators) {
		const ind = document.createElement('button');
		ind.setAttribute('type', 'button');
		ind.setAttribute('data-bs-target', slideshow);
		ind.setAttribute('data-bs-slide-to', data.question - 1);
		carousel.querySelector('.carousel-item.active')?.classList.remove('active');
		const currentButton = indicators.querySelector('button.active');
		if (currentButton) {
			currentButton.classList.remove('active');
			currentButton.setAttribute('aria-current', '');
		}

		item.classList.add('active');
		ind.setAttribute('aria-current', true);
		ind.classList.add('active');

		ind.setAttribute('aria-label', `Slide ${data.question}`);
		indicators.appendChild(ind);
	}

	return item;
};

let menuShowing = false;
let menuTimeout = undefined;
const toggleMenu = (e) => {
	if (menuTimeout) clearTimeout(menuTimeout);

	if (!menu) return;

	menuShowing = !menuShowing;

	if (menuShowing) {
		menuContent.style.display = 'block';
		menuContent.style.top = `${navbar.offsetHeight}px`;
	} else {
		menuContent.style.top = `-${menuContent.offsetHeight}px`;
		menuTimeout = setTimeout(() => {
			menuContent.style.display = 'none';
		}, 200);
	}
};

window.addEventListener('load', () => {
	//set the margin top for the main content
	const flyers = getElementArray(document, '.banner-text').sort((a, b) => {
		return (
			parseInt(a.getAttribute('data-order')) -
			parseInt(b.getAttribute('data-order'))
		);
	});

	flyers.forEach((f, i) => {
		let t = 1000 * i;
		setTimeout(() => {
			f.classList.add('fade-in');
			f.style.opacity = 1;
		}, t);
	});

	const links = getElementArray(document, '.navlink');
	links.forEach((l) => {
		if (l.getAttribute('data-target')) {
			l.addEventListener('click', scrollToSection);
		}
	});

	if (menu) {
		menu.addEventListener('click', toggleMenu);
		menuContent.style.top = `-${menuContent.offsetHeight}px`;
		menuContent.style.display = 'none';
	}
});

if (contactForm) {
	contactForm.addEventListener('submit', handleSubmit);
}

function handleSubmit(e) {
	e.preventDefault();

	const req = new XMLHttpRequest();

	const name = document.getElementById('name').value;
	const email = document.getElementById('email').value;
	const subject = document.getElementById('subject').value;
	const message = document.getElementById('message').value;
	const contactDiv = document.getElementById('form-container');
	const bgDiv = document.querySelector('.background-div');

	const body = {
		name,
		email,
		subject,
		message,
	};

	if (req.readyState == 0 || req.readyState == 4) {
		var requestStr = '/contact';
		req.open('POST', requestStr, true);
		req.onreadystatechange = () => {
			if (req.readyState == 4) {
				const res = JSON.parse(req.response);
				if (res.status === 'success') {
					bgDiv.innerHTML =
						'Thanks for your message! I will reply to you as soon as possible.';
				} else {
					bgDiv.innerHTML = res.message;
				}
				bgDiv.style = '';
				setTimeout(() => {
					bgDiv.style.opacity = 1;
					// contactDiv.style.opacity = 0;
					contactDiv.innerHTML = '';
				}, 100);
			}
		};
		req.setRequestHeader('Content-type', 'application/json; charset=utf-8');
		req.send(JSON.stringify(body));
	}
}
const handleQuestions = () => {
	const items = getElementArray(
		document,
		'#question-carousel-inner > .carousel-item'
	);
	items.forEach((e) => e.remove());

	const inds = getElementArray(
		document,
		'#question-carousel > .carousel-indicators > button'
	);
	inds.forEach((e) => e.remove());

	questions.forEach((q, i) => {
		const newSlide = createSlide(`#question-carousel`, {
			...q,
			question: i + 1,
		});
		const contents = newSlide.querySelector('.slide-contents');

		if (!maxHeight)
			maxHeight = getElementArray(contents, 'div.slide-content-wrapper').reduce(
				(prev, curr) => {
					return prev + curr.offsetHeight;
				},
				0
			);

		const [header, body, footer] = [
			newSlide.querySelector(`.slide-header > .fill-container`),
			newSlide.querySelector(`.slide-body > .fill-container`),
			newSlide.querySelector(`.slide-footer > .fill-container`),
		];

		header.innerHTML = `<p>Question ${i + 1}<br>${q.value} points</p>`;

		let j = 0;
		while (q.text.indexOf('**') >= 0) {
			j++;
			q.text = q.text.replace(
				'**',
				j % 2 === 0 ? '</span>' : '<span class="emphasis">'
			);
		}
		body.innerHTML = q.text;

		let height = getElementArray(contents, 'div.fill-container').reduce(
			(prev, curr) => {
				return prev + curr.offsetHeight;
			},
			0
		);

		let fontSize = parseFloat(
			window.getComputedStyle(body, null).getPropertyValue('font-size')
		);
		while (height > maxHeight && fontSize >= 6) {
			fontSize = fontSize - 1;
			header.style.fontSize = `${fontSize}px`;
			body.style.fontSize = `${fontSize}px`;
			footer.style.fontSize = `${fontSize}px`;
			height = getElementArray(contents, 'div.fill-container').reduce(
				(prev, curr) => {
					return prev + curr.offsetHeight;
				},
				0
			);
		}
	});
	bsQuestionCarousel.to(0);

	pictures.answers.forEach((p, i) => {
		const newSlide = createSlide('#picture-carousel', {
			answer: p,
			question: i + 1,
		});

		const [header, body] = [
			newSlide.querySelector(`.slide-header > .fill-container`),
			newSlide.querySelector(`.slide-body > .fill-container`),
		];

		header.innerHTML = `<p>${pictures.title}<br>Picture ${i + 1}</p>`;

		const img = document.createElement('img');
		img.setAttribute('src', `/img/picture_round/${i + 1}.png`);
		body.appendChild(img);

		// const ratio = img.offsetWidth / img.offsetHeight;
		// const bodyRatio = body.offsetWidth / body.offsetHeight;

		// if (ratio > bodyRatio) {
		// 	img.style.width = '80%';
		// } else {
		// 	img.style.height = '80%';
		// }
	});
	bsPictureCarousel.to(0);

	wildcard.questions.forEach((w, i) => {
		const newSlide = createSlide('#wildcard-carousel', {
			answer: w.answer,
			question: i + 1,
		});

		const [header, body] = [
			newSlide.querySelector(`.slide-header > .fill-container`),
			newSlide.querySelector(`.slide-body > .fill-container`),
		];

		header.innerHTML = `<p>${wildcard.title}<br>Question ${i + 1}</p>`;
		body.innerHTML = w.text;
	});
	bsWildcardCarousel.to(0);
};
handleQuestions();

socket.on('live-now', (data) => {
	if (liveInterval) {
		clearInterval(liveInterval);
	}
	liveNow.classList.add('invisible-div');

	if (data.live) {
		liveInterval = setInterval(blinkLive, 1000);
	}
});
