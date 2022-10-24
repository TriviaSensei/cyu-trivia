const navbar = document.querySelector('.navbar');
const contactForm = document.getElementById('contact-form');

const getElementArray = (selector) => {
	return Array.from(document.querySelectorAll(selector), (x) => x);
};

let socket = io();

document.addEventListener('DOMContentLoaded', () => {
	//set the margin top for the main content
	const flyers = getElementArray('.banner-text').sort((a, b) => {
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
	console.log(data);
});
