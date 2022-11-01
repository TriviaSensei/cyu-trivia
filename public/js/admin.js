import { showMessage, hideMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const createUserModal = new bootstrap.Modal(
	document.getElementById('create-user-modal')
);
const userCreatedModal = new bootstrap.Modal(
	document.getElementById('user-created-modal')
);
const createUserForm = document.querySelector('#new-user-modal-form');

if (createUserModal && createUserForm) {
	createUserForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const [fname, lname, displayName, email] = [
			'fname',
			'lname',
			'displayName',
			'email',
		].map((el) => {
			return document.getElementById(el);
		});
		const role = document.querySelector('input[name="role"]:checked');

		const handler = (res) => {
			if (res.status === 'success') {
				createUserModal.hide();
				userCreatedModal.show();
			} else {
				showMessage('error', res.message);
			}
		};

		handleRequest(
			'/api/v1/users/signup',
			'POST',
			{
				fname: fname.value,
				lname: lname.value,
				email: email.value,
				displayName: displayName.value,
				role: role.value,
			},
			handler
		);
	});
}
