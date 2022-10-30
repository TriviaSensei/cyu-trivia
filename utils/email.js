const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
	constructor(user, url, fromEmail = process.env.EMAIL_FROM) {
		this.name = `${user.fName} ${user.lName}`;
		this.fName = user.fName;
		this.lName = user.lName;
		this.url = url;
		this.from = fromEmail;
		if (process.env.NODE_ENV === 'production') {
			this.sgMail = require('@sendgrid/mail');
			this.sgMail.setApiKey(process.env.SG_API_KEY);
		}
		this.sendRealMail = true;
		this.testEmail = 'chuck@mailsac.com';
		this.to = user.email;
		// process.env.NODE_ENV === 'development' || this.sendRealMail
		//   ? user.email
		//   : this.testEmail;
	}

	newTransport() {
		if (process.env.NODE_ENV === 'production') {
			//create transporter for sendgrid
			return 1;
		}
		return nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PW,
			},
		});
	}

	//send the actual email
	async send(template, subject) {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(
				`${__dirname}/../views/email/${template}.pug`,
				{
					name: `${this.fName} ${this.lName}`,
					url: this.url,
					subject,
				}
			);

			//2. define email options
			const msg = {
				from: this.from,
				to: this.sendRealMail ? this.to : this.testEmail,
				subject,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			// await this.newTransport().sendMail(mailOptions);
			if (process.env.NODE_ENV === 'production') {
				this.sgMail.setApiKey(process.env.SG_API_KEY);
				await this.sgMail.send(msg);
			} else {
				await this.newTransport().sendMail(msg);
			}
		} catch (err) {
			console.log(err);
		}
	}

	async sendWelcome() {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(`${__dirname}/../views/email/welcome.pug`, {
				name: this.fName,
				url: this.url,
			});

			//2. define email options
			const msg = {
				from: process.env.EMAIL_FROM,
				to: this.sendRealMail ? this.to : this.testEmail,
				subject: 'Welcome to CYu@Trivia!',
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			if (process.env.NODE_ENV === 'development') {
				await this.newTransport().sendMail(msg);
			} else {
				const result = await this.sgMail.send(msg);
				return result;
			}
		} catch (err) {
			console.log('something went wrong');
			console.log(err);
		}
	}

	async sendPasswordReset() {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(
				`${__dirname}/../views/email/passwordReset.pug`,
				{
					name: this.fName,
					url: this.url,
				}
			);

			//2. define email options
			const msg = {
				from: process.env.NR_FROM,
				to: this.sendRealMail ? this.to : this.testEmail,
				reply_to: process.env.NR_FROM,
				subject: `Your CYu@Trivia password reset token (valid for 10 minutes)`,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			// await this.newTransport().sendMail(mailOptions);
			await this.sgMail.send(msg);
		} catch (err) {
			console.log(err);
		}
		// await this.send(
		//   'passwordReset',
		//   'Your G-Jeopardy password reset token (valid for 10 minutes)',
		//   process.env.EMAIL_FROM
		// );
	}

	async sendClue(category, value, clueText, message) {
		try {
			//1. render html for email, based on pug template
			const html = pug.renderFile(`${__dirname}/../views/email/clue.pug`, {
				category,
				value,
				clueText,
				name: this.name,
				message: message !== '' ? message.replace('<br>', '\n') : undefined,
			});

			//2. define email options
			const msg = {
				from: process.env.CLUE_FROM,
				to: this.sendRealMail ? this.to : this.testEmail,
				reply_to: process.env.HOST_EMAIL,
				subject: `QOTD: ${category} for $${value}`,
				html,
				text: htmlToText.fromString(html),
			};

			//3. create a transport and send the e-mail
			// await this.newTransport().sendMail(mailOptions);
			await this.sgMail.send(msg);
		} catch (err) {
			console.log(err);
		}
	}
};
