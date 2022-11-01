import { showMessage, hideMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { srvr } from './utils/url.js';

const loginForm = document.getElementById('login-form');
const email = document.getElementById('email');
const pw = document.getElementById('password');
const logout = document.getElementById('logout');

if (loginForm) {
	loginForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Successfully logged in', 1000);
				setTimeout(() => {
					location.href = `${srvr}/profile`;
				}, 1000);
			} else {
				showMessage('error', res.message, 1000);
			}
		};

		handleRequest(
			'/api/v1/users/login',
			'POST',
			{
				email: email.value,
				password: pw.value,
			},
			handler
		);
	});
}

if (logout) {
	logout.addEventListener('click', (e) => {
		const handler = (res) => {
			console.log(res);
			if (res.status === 'success') {
				showMessage('info', 'Successfully logged out', 1000);
				setTimeout(() => {
					location.href = `${srvr}/login`;
				}, 1000);
			} else {
				showMessage('error', res.message, 1000);
			}
		};

		handleRequest('/api/v1/users/logout', 'GET', null, handler);
	});
}
