'use strict';

const Alexa = require('alexa-sdk');

const speechOutput = {
    "SKILL_NAME": "Hitch",
    "WELCOME_MESSAGE": "Welcome to hitch.",
    "HELP_MESSAGE": "You can start hitch by saying 'start hitch'",
    "HELP_REPROMPT": "How can I help you?",
    "STOP_MESSAGE": "See you!"
};

exports.handler = (event, context, callback) => {
    const alexa = Alexa.handler(event, context);
    alexa.appId = 'amzn1.ask.skill.fa292120-c0ab-439d-9b61-60bea0b14abd';
    alexa.dynamoDBTableName = 'hitch';
    alexa.registerHandlers(handlers);
    alexa.execute();
};

const handlers = {
    'LaunchRequest' () {
        this.emit(':ask', speechOutput.WELCOME_MESSAGE);
    }
};
