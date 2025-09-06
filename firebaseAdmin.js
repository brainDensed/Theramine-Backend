// Firebase Admin SDK initialization
const admin = require("firebase-admin");

// Replace with the path to your Firebase service account key JSON file
const serviceAccount = require("./firebaseServiceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
