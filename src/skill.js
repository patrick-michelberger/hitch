'use strict';

/**
 *  Dependencies
 */
const Alexa = require('alexa-sdk');

const speechOutput = {
    "SKILL_NAME": "Hitch",
    "WELCOME_MESSAGE": "Welcome to hitch.",
    "HELP_MESSAGE": "You can start hitch by saying ' '",
    "HELP_REPROMPT": "How can I help you?",
    "STOP_MESSAGE": "See you!"
};

/**
 *  Main
 */
exports.handler = (event, context, callback) => {
    const alexa = Alexa.handler(event, context);
    alexa.appId = 'amzn1.ask.skill.fa292120-c0ab-439d-9b61-60bea0b14abd';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest' () {
        this.emit(':ask', speechOutput.WELCOME_MESSAGE);
    },
    'SendMessageIntent' (events) {
        this.emit(':tellWithLinkAccountCard', "You must have a hitch account to use this skill. Please use the Alexa desktop website to link your Amazon account with your Hitch Account.");
    },
    'AMAZON.HelpIntent': () {
        this.response.speak(speechOutput.HELP_MESSAGE);
        this.emit(':responseReady');
    }
};
