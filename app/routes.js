const express = require('express')
const router = express.Router()

const db = require('../db.js')
const database = db.database()

// Add your routes here - above the module.exports line

router.get('/test', (req, res) => {
	const user = {
		name: 'Test user',
		email: 'test@test.test',
		type: 'seller',
		signupDate: new Date()
	}

	const setUser = database
		.collection('users')
		.doc(db.uuid())
		.set(user)

	return setUser.then(res => {
		console.log('Set: ', res)
	})
})

module.exports = router
