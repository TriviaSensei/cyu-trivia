import { showMessage, hideMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const createUserModal = new bootstrap.Modal(
	document.getElementById('create-user-modal')
);
const userCreatedModal = new bootstrap.Modal(
	document.getElementById('user-created-modal')
);

const createUserForm = document.querySelector('#new-user-modal-form');
const browseUsers = document.getElementById('browse-users');
const userListContainer = document.getElementById('user-table-container');
const loadingDiv = document.getElementById('loading-div');
const createUserButton = document.getElementById('create-new-user');

let action = undefined;

const loadUsers = (e) => {
	loadingDiv?.classList.remove('invisible-div');
	const handler = (res) => {
		console.log(res);
		if (res.status === 'success') {
			loadingDiv?.classList.add('invisible-div');
			userListContainer.innerHTML = '';
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
				editButton.innerHTML = '✏️';
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
				const deleteButton = document.createElement('button');
				deleteButton.innerHTML = '❌';
				deleteButton.setAttribute('alt', 'Delete User');
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
		action === 'add' ? 'Add' : 'Edit';
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

if (browseUsers) {
	browseUsers.addEventListener('click', loadUsers);
}
