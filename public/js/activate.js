import { showMessage, hideMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const activateForm = document.getElementById('activate-form');
const activationToken = document.getElementById('activation-token').value;
const [password, passwordConfirm] = ['password', 'passwordConfirm'].map(
	(el) => {
		return document.getElementById(el);
	}
);

activateForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully activated account', 1000);
			setTimeout(() => {
				location.href = '/profile';
			}, 1000);
		} else {
			showMessage('error', res.message, 1000);
		}
	};
	handleRequest(
		'/api/v1/users/activate',
		'PATCH',
		{
			password: password.value,
			passwordConfirm: passwordConfirm.value,
			activationToken,
		},
		handler
	);
});
