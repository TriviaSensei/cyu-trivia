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
	if (data.picture) {
		header.classList.add('picture-header');
		header.classList.remove('slide-header');
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
		const p1 = createElement('p');
		p1.innerHTML = replaceBreaks(str);
		body.appendChild(p1);
		if (data.qr) {
			body.classList.add('d-flex', 'flex-column');
			const qrd = createElement('.fill-container.f-1');
			const i = createElement('img');
			i.setAttribute('src', '/img/qr.svg');
			qrd.appendChild(i);
			body.appendChild(qrd);
		}
	} else if (data.picture) {
		const container = createElement('.fill-container');
		const img = createElement('img');
		img.setAttribute('src', data.picture);
		container.appendChild(img);
		body.appendChild(container);
		body.classList.add('.picture-body');
		body.classList.remove('.slide-body');
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
	const footer = createElement('.slide-footer.emphasis');
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
	const d1 = createElement('.flair-div.d1');
	const d2 = createElement('.flair-div.d2');
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

export const createPictureSlide = (data) => {
	const len = data.length;
	if (len > 10 || len === 0) return null;

	const slide = createElement('.carousel-item');
	const contents = createElement('.picture-slide-contents');
	const d1 = createElement('.flair-div.d1');
	const d2 = createElement('.flair-div.d2');
	contents.appendChild(d1);
	contents.appendChild(d2);

	const header = createHeader({
		header: `Round ${data[0].round} - Pictures\n${data[0].desc}`,
	});
	contents.appendChild(header);

	const body = createElement('.slide-body');
	const rows = Math.floor((len - 1) / 5) + 1;
	for (var i = 0; i < rows; i++) {
		for (var j = 0; j < 5; j++) {
			const ind = i * 5 + j;
			if (ind >= len) break;
			const d = createElement('div');
			const fillDiv = createElement('.fill-container');
			const img = createElement('img');
			img.setAttribute('src', data[ind].picture);
			d.appendChild(fillDiv);
			fillDiv.appendChild(img);
			body.appendChild(d);
		}

		for (var j = 0; j < 5; j++) {
			const ind = i * 5 + j;
			if (ind >= len) break;
			const d = createElement('.pic-label');
			d.innerHTML = ind + 1;
			body.appendChild(d);
		}
	}
	contents.appendChild(body);

	slide.appendChild(contents);
	return slide;
};

export const modifySlide = (currentSlide, data) => {
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
