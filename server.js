const express = require('express');
const dotenv = require('dotenv');
const app = express();
const rateLimit = require('express-rate-limit');

dotenv.config({ path: './config.env' });
const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log(`Application started on port ${port}`);
});

app.use(express.static(__dirname));
app.use(express.json());

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

const limiter = rateLimit({
	max: 3,
	windowMs: 60 * 60 * 1000,
	message: {
		status: 'fail',
		message: 'You are doing that too much. Try again later.',
	},
});

app.use('/contact', limiter);

app.post('/contact', async (req, res) => {
	const sgMail = require('@sendgrid/mail');
	sgMail.setApiKey(process.env.SG_API_KEY);

	const msg = {
		from: process.env.serveremail,
		to: process.env.email,
		reply_to: req.body.email,
		subject: `cyu.dev message from ${req.body.name}: ${req.body.subject}`,
		text: req.body.message,
	};
	try {
		await sgMail.send(msg);
	} catch (e) {
		console.log(e);
		console.log(e.response.body.errors[0]);
		return res
			.status(e.code)
			.json({ status: 'fail', message: e.response.body.errors[0].message });
	}
	res.status(200).json({
		status: 'success',
		message: 'message sent.',
	});
});
