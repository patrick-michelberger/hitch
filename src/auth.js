'use strict'

/**
 *  Dependencies
 */
const firebase = require('firebase');
const admin = require("firebase-admin");
const fs = require('fs');
const path = require('path');
const loginHtml = fs.readFileSync('./templates/index.html', "utf8");
const randomID = require('random-id')
const jwt = require('jsonwebtoken');
const config = require("./config.json");

/**
 *  Handlers
 */
module.exports.showLoginPage = function(event, context, callback) {
    const response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html'
        },
        body: loginHtml
    };
    callback(null, response);
};

module.exports.authorizeToken = function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false; //<---Important

    // Initialize Firebase
    if (admin.apps.length == 0) { // <---Important!!! In lambda, it will cause double initialization.
        admin.initializeApp({
            credential: admin.credential.cert(path.join(__dirname, "./firebase-admin.json")),
            databaseURL: config.firebase.databaseURL,
        })
    }
    if (firebase.apps.length == 0) { // <---Important!!! In lambda, it will cause double initialization.
        firebase.initializeApp(config.firebase);
    }

    const original_token = event.queryStringParameters.token;

    if (!original_token) {
        handleError(422, "Missing token query parameter.", callback);
    } else {
        admin.auth()
            .verifyIdToken(original_token)
            .then(tokend => {
                if (!tokend.email) {
                    handleError(400, "No email address associated with this account", callback);
                } else {
                    const token = randomID(6, "0");
                    firebase.database().ref(`tokens/${token}`).set({
                        token: token,
                        created: firebase.database.ServerValue.TIMESTAMP
                    }).then((data) => {
                        handleResponse(200, token, callback);
                    }).catch((error) => {
                        handleError(400, "Error occurred generating token.", callback);
                    });
                }
            });
    }
};

module.exports.authorizeByLogin = function(event, context, callback) {
    const original_token = event.queryStringParameters.token;

    if (!original_token) {
        handleError(400, "Missing token query parameter.", callback);
    }

    const client_id = event.queryStringParameters.client_id;
    if (!client_id) {
        handleError(400, "Missing client_id query parameter.", callback);
    } else if (client_id !== "alexa-skill") {
        handleError(400, `Expected client_id to be alexa-skill`, callback);
    }

    const response_type = event.queryStringParameters.response_type;
    if (!response_type) {
        handleError(400, "Missing response_type query parameter.", callback);
    } else if (response_type !== "token") {
        handleError(400, `Expected response_type`, callback);
    }

    const state = event.queryStringParameters.state;
    if (!state) {
        handleError(400, `Expected state`, callback);
    }

    /**
     * TODO Refactor
     */
    if (admin.apps.length == 0) { // <---Important!!! In lambda, it will cause double initialization.
        admin.initializeApp({
            credential: admin.credential.cert(path.join(__dirname, "./firebase-admin.json")),
            databaseURL: "https://hitch-d9986.firebaseio.com",
        })
    }
    if (firebase.apps.length == 0) { // <---Important!!! In lambda, it will cause double initialization.
        firebase.initializeApp(config.firebase);
    }

    admin.auth()
        .verifyIdToken(original_token)
        .then(decoded_token => {
            jwt.sign({
                "uid": decoded_token.uid
            }, config.jwtSecret, {}, (error, final_token) => {
                if (error) {
                    handleError(400, `Could not make JWT`, callback);
                }

                const return_url =
                    config.alexa.redirect +
                    "#state=" + state +
                    "&access_token=" + final_token +
                    "&token_type=Bearer";

                context.succeed({
                    location: return_url
                });
            })
        })
        .catch(error => {
            handleError(400, `Could not verify token`, callback);
        });
}

module.exports.authorizeByCode = function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false; //<---Important

    const client_id = event.queryStringParameters.client_id;
    if (!client_id) {
        handleError(400, "Missing client_id query parameter.", callback);
    } else if (client_id !== config.alexa.client_id) {
        handleError(400, `Expected client_id to be ${config.alexa.client_id}`, callback);
    }

    const response_type = event.queryStringParameters.response_type;
    if (!response_type) {
        handleError(400, "Missing response_type query parameter.", callback);
    } else if (response_type !== "token") {
        handleError(400, "Wrong response_type query parameter.", callback);
    }

    const state = event.queryStringParameters.state;
    if (!state) {
        handleError(400, "Missing state query parameter.", callback);
    }

    const code = event.queryStringParameters.code;
    if (!code) {
        handleError(400, "Missing code query parameter.", callback);
    }

    /**
     * TODO Refactor
     */
    if (firebase.apps.length == 0) { // <---Important!!! In lambda, it will cause double initialization.
        firebase.initializeApp(config.firebase);
    }

    const ref = firebase.database().ref('tokens/' + code);
    ref.once("value").then((snapshot) => {
        const d = snapshot.val();
        return ref.remove().then(() => {
            jwt.sign({
                "uid": d.token
            }, config.jwtSecret, {}, (error, final_token) => {
                if (error) {
                    handleError(400, `Could not make JWT`, callback);
                } else {
                    const return_url =
                        config.alexa.redirect +
                        "#state=" + state +
                        "&access_token=" + final_token +
                        "&token_type=Bearer";
                    handleRedirectResponse(return_url, callback);
                }
            });
        })
    }).catch((error) => {
        console.log("error: ", error);
        handleError(400, error, callback);
    });
}

/**
 *  Helpers
 */
const handleResponse = (status, data, callback) => {
    const response = {
        statusCode: status,
        body: JSON.stringify(data)
    };
    callback(null, response);
};

const handleRedirectResponse = (url, callback) => {
    const response = {
        statusCode: 302,
        headers: {
            "Location": url
        }
    };
    callback(null, response);
};

const handleError = (status, message, callback) => {
    const response = {
        statusCode: status,
        body: JSON.stringify({
            "message": message
        })
    };
    callback(null, response);
};;
