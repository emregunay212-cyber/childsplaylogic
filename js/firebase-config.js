/* ============================================
   Firebase Configuration
   ============================================ */
const firebaseConfig = {
    apiKey: "AIzaSyBFF2v3Rm0vwvwQwtApmXgjQa6DYM_HDAw",
    authDomain: "childsplaylogic.firebaseapp.com",
    databaseURL: "https://childsplaylogic-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "childsplaylogic",
    storageBucket: "childsplaylogic.firebasestorage.app",
    messagingSenderId: "27619900067",
    appId: "1:27619900067:web:bf0f3aa99670b6a9dfdd16"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
