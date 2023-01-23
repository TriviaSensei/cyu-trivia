import { showMessage, hideMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const profileForm = document.getElementById('profile-form');
const pwForm = document.getElementById('password-form');
const [fname, lname, displayName, email, currentPW, pw, pwConfirm] = [
	'fname',
	'lname',
	'displayName',
	'email',
	'currentPW',
	'pw',
	'pwConfirm',
].map((el) => {
	return document.getElementById(el);
});

profileForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully updated information', 1000);
		} else {
			showMessage('error', res.message, 1000);
		}
	};

	handleRequest(
		'/api/v1/users/updateMe',
		'PATCH',
		{
			firstName: fname.value,
			lastName: lname.value,
			displayName: displayName.value,
			email: email.value,
		},
		handler
	);
});

pwForm.addEventListener('submit', (e) => {
	e.preventDefault();
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully changed password', 1000);
			currentPW.value = '';
			pw.value = '';
			pwConfirm.value = '';
		} else {
			showMessage('error', res.message, 1000);
		}
	};

	handleRequest(
		'/api/v1/users/changePassword',
		'PATCH',
		{
			currentPassword: currentPW.value,
			password: pw.value,
			passwordConfirm: pwConfirm.value,
		},
		handler
	);
});
