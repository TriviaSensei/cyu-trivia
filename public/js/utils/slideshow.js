import { createElement } from './createElementFromSelector.js';
import { getEmbeddedLink } from './videoEmbed.js';

const replaceBreaks = (str) => {
	let temp = str;

	while (temp.indexOf('\n') >= 0) {
		temp = temp.replace('\n', '<br>');
	}

	return temp;
};

const createHeader = (data) => {
	const header = createElement('.slide-header');
	if (data.header) {
		header.innerHTML = replaceBreaks(data.header);
	}
	return header;
};

const createBody = (data) => {
	const body = createElement('.slide-body');
	if (data.body) {
		let str = data.body;
		let count = 0;
		while (str.indexOf('**') >= 0) {
			count = 1 - count;
			str = str.replace(
				'**',
				count === 1 ? '<span class="emphasis">' : '</span>'
			);
		}
		body.innerHTML = replaceBreaks(str);
	} else if (data.picture) {
		const container = createElement('.fill-container');
		const img = createElement('img');
		img.setAttribute('src', data.picture);
		container.appendChild(img);
		body.appendChild(container);
	} else if (data.videoLink) {
		const videoSrc = getEmbeddedLink(
			data.videoLink,
			data.videoStart || 0,
			data.autoplay ? true : false
		);
		const frame = createElement('iframe.fill-container');
		frame.setAttribute('src', videoSrc.link);
		frame.setAttribute('allowfullscreen', 'allowfullscreen');
		if (data.autoplay) frame.setAttribute('allow', 'autoplay');
		body.appendChild(frame);
	}
	return body;
};

const createFooter = (data) => {
	const footer = createElement('.slide-footer emphasis');
	if (data.footer) {
		footer.innerHTML = data.footer;
	} else {
		footer.innerHTML = '';
	}
	return footer;
};

export const createSlide = (data) => {
	const slide = createElement('.carousel-item');

	const contents = createElement('.slide-contents');
	const d1 = createElement('.flair-div d1');
	const d2 = createElement('.flair-div d2');
	contents.appendChild(d1);
	contents.appendChild(d2);

	const header = createHeader(data);
	const body = createBody(data);
	const footer = createFooter(data);

	contents.appendChild(header);
	contents.appendChild(body);
	contents.appendChild(footer);
	slide.appendChild(contents);

	return slide;
};

export const modifySlide = (data) => {
	const carousel = document.getElementById('game-carousel');
	const currentSlide = carousel.querySelector(
		'.carousel-item:last-child .slide-contents'
	);

	if (!currentSlide) return;

	const header = currentSlide.querySelector('.slide-header');
	const body = currentSlide.querySelector('.slide-body');
	const footer = currentSlide.querySelector('.slide-footer');

	if (data.header) {
		const newHeader = createHeader(data);
		currentSlide.insertBefore(newHeader, header);
		header.remove();
	}

	if (data.body) {
		const newBody = createBody(data);
		currentSlide.insertBefore(newBody, body);
		body.remove();
	}

	if (data.footer) {
		const newFooter = createFooter(data);
		currentSlide.insertBefore(newFooter, footer);
		footer.remove();
	}
};
