const catchAsync = require('../utils/catchAsync');

exports.httpsRedirect = (req, res, next) => {
	// console.log(req.header('x-forwarded-proto'));
	// console.log(req.header('host'));
	// console.log(req.url);
	if (process.env.LOCAL === 'true') {
		return next();
	} else if (req.headers.host !== `localhost:${process.env.PORT}`) {
		console.log(req.headers.host);
		if (req.header('x-forwarded-proto') !== 'https') {
			console.log(`redirecting to https://${req.header('host')}${req.url}`);
			return res.redirect(`https://${req.header('host')}${req.url}`);
			// next();
		} else {
			console.log(`HTTPS detected`);
		}
	}
	next();
};

exports.loginRedirect = catchAsync(async (req, res, next) => {
	if (!res.locals.user) {
		return res.status(200).render('login', {
			title: 'Log into your account',
			redirect: req.url,
		});
	}
	next();
});

exports.getHomepage = catchAsync(async (req, res, next) => {
	// 2) build template

	if (req.params.id) {
		console.log(req.params.id);
	}

	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('home', {
		title: 'Home',
	});
});

exports.play = catchAsync(async (req, res, next) => {
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('play', {
		title: 'Play',
	});
});

exports.getLogin = catchAsync(async (req, res, next) => {
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('login', {
		title: 'Login',
	});
});

exports.getProfile = catchAsync(async (req, res, next) => {
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('profile', {
		title: 'Profile',
		user: res.locals.user,
	});
});
