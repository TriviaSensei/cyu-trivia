const navbar = document.querySelector('.navbar');
const contactForm = document.getElementById('contact-form');
const questionCarousel = document.getElementById('question-carousel-inner');
const questionIndicators = document.querySelector(
	'#question-carousel > .carousel-indicators'
);
const bsQuestionCarousel = new bootstrap.Carousel(
	document.getElementById('question-carousel'),
	{
		interval: false,
	}
);

const getElementArray = (item, selector) => {
	return Array.from(item.querySelectorAll(selector), (x) => x);
};

let socket = io();
let questions;

const revealAnswer = (e) => {
	const q = parseInt(e.target.getAttribute('data-question'));
	if (isNaN(q)) return;

	if (q < 0 || questions.length <= q) return;

	e.target.innerHTML = questions[q].answer;
};

let maxHeight;
const createSlide = (data) => {
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
		element.setAttribute('id', `${el}-${data.question}`);
		contents.appendChild(element);
		const inner = document.createElement('div');
		inner.classList.add('fill-container');
		element.appendChild(inner);
		return inner;
	});
	questionCarousel.appendChild(item);
	footer.classList.add('emphasis');
	footer.setAttribute('data-question', data.question - 1);
	footer.addEventListener('click', revealAnswer);
	footer.innerHTML = 'Click to reveal answer';
	//indicator
	const ind = document.createElement('button');
	ind.setAttribute('type', 'button');
	ind.setAttribute('data-bs-target', '#question-carousel');
	ind.setAttribute('data-bs-slide-to', data.question - 1);
	questionCarousel
		.querySelector('.carousel-item.active')
		?.classList.remove('active');
	const currentButton = questionIndicators.querySelector('button.active');
	if (currentButton) {
		currentButton.classList.remove('active');
		currentButton.setAttribute('aria-current', '');
	}

	item.classList.add('active');
	ind.setAttribute('aria-current', true);
	ind.classList.add('active');

	ind.setAttribute('aria-label', `Slide ${data.question}`);
	questionIndicators.appendChild(ind);

	if (!maxHeight)
		maxHeight = getElementArray(contents, 'div.slide-content-wrapper').reduce(
			(prev, curr) => {
				return prev + curr.offsetHeight;
			},
			0
		);

	header.innerHTML = `<p>Question ${data.question}<br>${data.value} points</p>`;

	let i = 0;
	while (data.text.indexOf('**') >= 0) {
		i++;
		data.text = data.text.replace(
			'**',
			i % 2 === 0 ? '</span>' : '<span class="emphasis">'
		);
	}
	body.innerHTML = data.text;

	let height = getElementArray(contents, 'div.fill-container').reduce(
		(prev, curr) => {
			return prev + curr.offsetHeight;
		},
		0
	);

	const s = window.getComputedStyle(body, null).getPropertyValue('font-size');
	let iter = 0;
	let fontSize = parseFloat(
		window.getComputedStyle(body, null).getPropertyValue('font-size')
	);
	while (height > maxHeight && fontSize >= 6) {
		iter++;
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

	return item;
};

document.addEventListener('DOMContentLoaded', () => {
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

	socket.emit('request-questions', null);
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

socket.on('questions', (data) => {
	questions = data;
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
		createSlide({
			...q,
			question: i + 1,
		});
	});
	bsQuestionCarousel.to(0);
});
