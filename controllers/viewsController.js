const catchAsync = require('../utils/catchAsync');
const Game = require('../models/gameModel');
const User = require('../models/userModel');
const Venue = require('../models/venueModel');
const getOffset = require('../utils/getOffset');
exports.httpsRedirect = (req, res, next) => {
	if (process.env.LOCAL === 'true') {
		return next();
	} else if (req.headers.host !== `localhost:${process.env.PORT}`) {
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

	const venues = await Venue.find({ isHidden: false });

	const toSend = venues.map((v) => {
		let address = v.address;
		while (address.indexOf(' ') >= 0) {
			address = address.replace(' ', '+');
		}
		const src = `https://www.google.com/maps/embed/v1/place?key=${process.env.GMAP_API_KEY}&q=${address}`;

		return {
			...v.toJSON(),
			src,
		};
	});

	// toSend.push({
	// 	name: 'Test game',
	// 	description: 'This is a test game.',
	// 	gameTime: 'Every monday, 8PM ET',
	// 	public: true,
	// 	address: '1600 Pennsylvania Ave. Washington, DC',
	// 	photo:
	// 		'https://cyutrivia.s3.amazonaws.com/e635166f-a786-4b43-9422-8c124f3b9c0a.png',
	// 	src: `https://www.google.com/maps/embed/v1/place?key=${process.env.GMAP_API_KEY}&q=1600+Pennsylvania+Ave.+Washington,+DC`,
	// });

	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('home', {
		title: 'Home',
		venues: toSend,
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
	if (res.locals.user) {
		return res.redirect('/profile');
	}
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('login', {
		title: 'Login',
	});
});

exports.getProfile = catchAsync(async (req, res, next) => {
	if (!res.locals.user) {
		return res.redirect('/login');
	}
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('profile', {
		title: 'Profile',
		user: res.locals.user,
	});
});

exports.getActivation = catchAsync(async (req, res, next) => {
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	if (res.locals.user) {
		return res.redirect('/profile');
	} else {
		res.status(200).render('activate', {
			title: 'Activate',
			token: req.params.token,
		});
	}
});

exports.getAdmin = catchAsync(async (req, res, next) => {
	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('admin', {
		title: 'Admin',
		offset: getOffset(),
		user: res.locals.user,
	});
});

exports.getHost = catchAsync(async (req, res, next) => {
	// const games = await Game.find({
	// 	assignedHosts: res.locals.user._id,
	// });

	const user = await res.locals.user.populate({
		path: 'assignedGigs',
		populate: ['game', 'venue'],
	});
	const games = user.assignedGigs;

	let offset = getOffset();

	const data = games.map((g) => {
		return {
			_id: g._id,
			title: g.game.title,
			venue: g.venue.name,
			date: new Date(Date.parse(g.date) - offset * 60 * 60 * 1000),
			time: `${g.hour === 12 ? 12 : g.hour % 12}:${
				g.minute === 0 ? '00' : g.minute
			} ${g.hour >= 12 ? 'PM' : 'AM'}`,
		};
	});

	// 3) render template using tour data from (1)
	// this will look in the /views (set in app.js) folder for 'overview.pug' (pug engine also specified in app.js)
	res.status(200).render('host', {
		title: 'Host',
		data,
		user: res.locals.user,
	});
});

exports.getSlideShow = catchAsync(async (req, res, next) => {
	res.status(200).render('host/slideshow', {
		title: 'Host',
	});
});
