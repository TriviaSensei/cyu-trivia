import { showMessage, hideMessage } from './utils/messages.js';
import { handleMultiRequest, handleRequest } from './utils/requestHandler.js';

const createUserModal = new bootstrap.Modal(
	document.getElementById('create-user-modal')
);
const userCreatedModal = new bootstrap.Modal(
	document.getElementById('user-created-modal')
);
const confirmDeleteModal = new bootstrap.Modal(
	document.getElementById('delete-user-modal')
);

const confirmDeleteButton = document.getElementById('confirm-delete-user');
const createUserForm = document.querySelector('#new-user-modal-form');
const browseUsers = document.getElementById('browse-users');
const userListContainer = document.getElementById('user-table-container');
const loadingDiv = document.getElementById('loading-div');
const createUserButton = document.getElementById('create-new-user');

const createVenueModal = new bootstrap.Modal(
	document.getElementById('create-venue-modal')
);
const createVenueButton = document.getElementById('confirm-create');
const createVenueForm = document.getElementById('new-venue-modal-form');
const vName = document.getElementById('venue-name');
const vDescription = document.getElementById('venue-description');
const vGameTimes = document.getElementById('venue-game-times');
const vAddress = document.getElementById('venue-address');
const vPhoto = document.getElementById('venue-photo');

let action = undefined;
let uid = undefined;
let venueAction = undefined;
let vid = undefined;

const setUID = (e) => {
	const button = e.target.closest('button');
	if (!button) return;
	uid = button.getAttribute('data-id');
	const action = button.getAttribute('data-action');
	if (action === 'delete') {
		confirmDeleteModal.show();
	} else if (action === 'restore') {
		deleteUser(null);
	}
};

const deleteUser = (e) => {
	if (!uid) return;
	const handler = (res) => {
		if (res.status === 'success') {
			const button = document.querySelector(`.delete-button[data-id="${uid}"]`);

			if (res.action === 'delete') {
				showMessage(
					'info',
					'User marked for deletion and will be removed from the database in 5 minutes.',
					2000
				);
				button.classList.add('restore-button');
				button.setAttribute('data-action', 'restore');
			} else if (res.action === 'restore') {
				showMessage('info', 'User successfully restored.', 1000);
				button.classList.remove('restore-button');
				button.setAttribute('data-action', 'delete');
			}

			uid = undefined;
			action = undefined;
		} else {
			showMessage('error', res.message, 1000);
		}
	};
	handleRequest(`/api/v1/users/delete/${uid}`, 'PATCH', null, handler);
};
confirmDeleteButton.addEventListener('click', deleteUser);

const loadUsers = (e) => {
	if (loadingDiv) loadingDiv.classList.remove('invisible-div');
	userListContainer.innerHTML = '';
	const handler = (res) => {
		if (res.status === 'success') {
			loadingDiv?.classList.add('invisible-div');
			const userTable = document.createElement('table');
			const tableHeader = document.createElement('tr');
			userTable.appendChild(tableHeader);
			['Name', 'Role', 'Active?', 'Actions'].forEach((s) => {
				const th = document.createElement('th');
				th.innerHTML = s;
				tableHeader.appendChild(th);
			});
			res.data.forEach((u) => {
				const row = document.createElement('tr');
				const values = [
					`${u.lastName}, ${u.firstName}`,
					u.role,
					u.active ? '✅' : '❌',
				];
				values.forEach((v) => {
					const cell = document.createElement('td');
					cell.innerHTML = v;
					row.appendChild(cell);
				});

				const actionCell = document.createElement('td');
				actionCell.classList.add('action-cell');
				const editButton = document.createElement('button');
				editButton.setAttribute('alt', 'Edit User');
				editButton.setAttribute('data-id', u._id);
				editButton.setAttribute('data-fname', u.firstName);
				editButton.setAttribute('data-lname', u.lastName);
				editButton.setAttribute('data-displayName', u.displayName);
				editButton.setAttribute('data-email', u.email);
				editButton.setAttribute('data-role', u.role);
				editButton.setAttribute('data-bs-toggle', 'modal');
				editButton.setAttribute('data-bs-target', '#create-user-modal');
				editButton.addEventListener('click', setAction);
				editButton.classList.add('btn-close', 'edit-button');
				const deleteButton = document.createElement('button');
				deleteButton.classList.add('btn-close');
				deleteButton.classList.add('delete-button');
				deleteButton.setAttribute(
					'alt',
					u.deleteUserAfter ? 'Restore User' : 'Delete User'
				);
				deleteButton.setAttribute(
					'data-action',
					u.deleteUserAfter ? 'restore' : 'delete'
				);
				deleteButton.setAttribute('data-id', u.role === 'owner' ? '' : u._id);
				deleteButton.addEventListener('click', setUID);
				if (u.role === 'owner') deleteButton.setAttribute('disabled', true);
				actionCell.appendChild(editButton);
				actionCell.appendChild(deleteButton);
				row.appendChild(actionCell);

				userTable.appendChild(row);
			});
			userListContainer?.appendChild(userTable);
		} else {
			showMessage('error', 'Something went wrong', 1000);
		}
	};
	handleRequest('/api/v1/users/getAll', 'GET', null, handler);
};

const setAction = (e) => {
	if (e.target === createUserButton) {
		action = 'create';
		['fname', 'lname', 'displayName', 'email'].forEach((el) => {
			document.getElementById(el).value = '';
		});
	} else {
		action = 'edit';
		document.getElementById('edit-user-id').value =
			e.target.getAttribute('data-id');
		['fname', 'lname', 'displayName', 'email'].forEach((el) => {
			document.getElementById(el).value = e.target.getAttribute(`data-${el}`);
		});
		document.getElementById('host-role-radio').disabled = false;
		document.getElementById('admin-role-radio').disabled = false;
		document.getElementById('host-role-radio').checked = false;
		document.getElementById('admin-role-radio').checked = false;
		const str = `input[name="role"][value="${e.target.getAttribute(
			'data-role'
		)}"]`;
		const checkedRadio = document.querySelector(str);
		console.log(str);
		console.log(checkedRadio);
		if (checkedRadio) {
			checkedRadio.checked = true;
		}
		if (e.target.getAttribute('data-role') === 'owner') {
			document.getElementById('host-role-radio').disabled = true;
			document.getElementById('admin-role-radio').disabled = true;
		}
	}
	document.getElementById('confirm-create').innerHTML =
		action === 'create' ? 'Create' : 'Edit';
};

if (createUserButton) {
	createUserButton.addEventListener('click', setAction);
}

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
				if (action === 'create') userCreatedModal.show();
				else {
					showMessage('info', 'User successfully edited', 1000);
					loadUsers(null);
				}
			} else {
				showMessage('error', res.message);
			}
			action = undefined;
		};

		if (action === 'create') {
			handleRequest(
				'/api/v1/users/signup',
				'POST',
				{
					fname: fname.value,
					lname: lname.value,
					email: email.value,
					displayName: displayName.value,
					role: role?.value,
				},
				handler
			);
		} else if (action === 'edit') {
			handleRequest(
				`/api/v1/users/editUser/${
					document.getElementById('edit-user-id').value
				}`,
				'PATCH',
				{
					fname: fname.value,
					lname: lname.value,
					email: email.value,
					displayName: displayName.value,
					role: role ? role.value : undefined,
				},
				handler
			);
		}
	});
}

if (createVenueModal && createVenueForm) {
	createVenueForm.addEventListener('submit', (e) => {
		e.preventDefault();
		const formData = new FormData(createVenueForm);
		console.log(formData);

		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Successfully created venue.');
			} else {
				showMessage('error', 'Something went wrong');
			}
		};

		showMessage('info', 'Creating...', 1000);
		handleMultiRequest('/api/v1/venues', 'POST', formData, handler);
	});
}

if (browseUsers) {
	browseUsers.addEventListener('click', loadUsers);
}
