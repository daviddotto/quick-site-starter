var db = {}

// Local config for DB authentication

const serviceAccount = require('C:/Users/me/OneDrive/Documents/Local Repos/certificates/theholidayhomegroup-firebase-adminsdk-mqwlv-227c350962.json')

// Firebase setup

db.admin = require('firebase-admin')
db.ref = db.admin.initializeApp({
	credential: db.admin.credential.cert(serviceAccount),
	databaseURL: 'https://theholidayhomegroup.firebaseio.com'
})

db.database = () => {
	const initializedStore = db.ref
	const database = initializedStore.firestore()
	return database
}

db.uuid = () => {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

module.exports = db
