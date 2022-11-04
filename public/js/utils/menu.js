const menuContent = document.querySelector('.menu-content-mobile');
const menu = document.querySelector('.menu-button');

let menuShowing = false;
let menuTimeout = undefined;

if (menu) {
	const toggleMenu = (e) => {
		if (menuTimeout) clearTimeout(menuTimeout);

		if (!menu) return;

		if (!e.target.closest('.menu-button')) {
			menuShowing = false;
		} else {
			menuShowing = !menuShowing;
		}

		if (menuShowing) {
			menuContent.style.display = 'block';
			const navbar = e.target.closest('button').parentElement;
			menuContent.style.top = `${navbar.offsetHeight}px`;
		} else {
			menuContent.style.top = `-${menuContent.offsetHeight}px`;
			menuTimeout = setTimeout(() => {
				menuContent.style.display = 'none';
			}, 200);
		}
	};

	document.addEventListener('click', toggleMenu);
	menuContent.style.top = `-${menuContent.offsetHeight}px`;
	menuContent.style.display = 'none';
}
