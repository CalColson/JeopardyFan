import {
  ErrorHandler,
  RequestHandler,
  getSlotValue,
  SkillBuilders
} from 'ask-sdk-core'

import { J6Data } from './types/api/J6Response'
import { getJ6Data, getFullSpeechText, getAnswer, getConcludingSpeechText, getEndRound1SpeechText } from './utils/utils'

let j6Data : J6Data
let curClueIndex : number
let score : number
let isBetweenRounds = false

const repromptSpeechText = 'please answer the clue in the form of a question'

const LaunchRequestHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },

  async handle(input) {
    // initialize values
    j6Data = await getJ6Data()
    curClueIndex = 0
    score = 0
    isBetweenRounds = false

    let speechText = 'Welcome to Jeopardy Fan. Here are your single jeopardy clues for the day.'
    speechText += ' ' + getFullSpeechText(j6Data, curClueIndex)

    return input.responseBuilder
      .speak(speechText)
      .reprompt(repromptSpeechText)
      .getResponse()
  }
}

const AnswerIntentHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request
    
    return request.type === 'IntentRequest'
      && request.intent.name === 'AnswerIntent'
  },

  handle(input) {
    const receivedAnswer = getSlotValue(input.requestEnvelope, 'answer').toLowerCase()
    const correctAnswer = getAnswer(j6Data, curClueIndex).toLowerCase()

    let speechText

    if (receivedAnswer.includes(correctAnswer)) {
      speechText = `Correct! The answer is: ${correctAnswer}. <break strength="x-strong" />`
      score++ 
    } else {
      speechText = `Sorry. You answered ${receivedAnswer}. The correct answer is: ${correctAnswer}.`
    }
    curClueIndex++

    if (curClueIndex === 6) {
      isBetweenRounds = true
      speechText += ' ' + getEndRound1SpeechText(score)

      return input.responseBuilder
        .speak(speechText)
        .reprompt(repromptSpeechText)
        .getResponse()

    } else if (curClueIndex < 12) {
      // ask next question
      speechText += ' ' + getFullSpeechText(j6Data, curClueIndex)
  
      return input.responseBuilder
        .speak(speechText)
        .reprompt(repromptSpeechText)
        .getResponse()

    } else {
      // report score and close
      speechText += ' ' + getConcludingSpeechText(score)

      return input.responseBuilder
        .speak(speechText)
        .withShouldEndSession(true)
        .getResponse()
    }
  }
}

// used to handle confirmation for double jeopardy
const YesIntentHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.YesIntent'
  },

  handle(input) {
    if (isBetweenRounds) {
      isBetweenRounds = false
      const speechText = 'Ok. Here are your double jeopardy clues for the day. ' + getFullSpeechText(j6Data, curClueIndex)

      return input.responseBuilder
        .speak(speechText)
        .reprompt(repromptSpeechText)
        .getResponse()

    } else {
      return FallbackIntentHandler.handle(input)
    }
  }
}
// used to handle rejection for double jeopardy
const NoIntentHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.NoIntent'
  },

  handle(input) {
    if (isBetweenRounds) {
      isBetweenRounds = false
      const speechText = 'Ok. Thank you for playing. Goodbye!'

      return input.responseBuilder
        .speak(speechText)
        .withShouldEndSession(true)
        .getResponse()

    } else {
      return FallbackIntentHandler.handle(input)
    }
  }
}

const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent')
  },

  handle(input) {
    const speechText = 'Closing Jeopardy Fan'

    return input.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse()
  }
}

const FallbackIntentHandler: RequestHandler = {
  canHandle(_input) {
    return true
  },

  handle(input) {

    return input.responseBuilder
      .speak(repromptSpeechText)
      .reprompt(repromptSpeechText)
      .getResponse()
  }
}

const myErrorHandler: ErrorHandler = {
  canHandle(_input) {
    return true
  },

  handle(input, err) {
    console.log(`handling error: ${err.message}`)

    return input.responseBuilder
      .speak('An error occurred, please repeat your request')
      .reprompt('An error occurred, please repeat your request')
      .getResponse()
  }
}

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AnswerIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler
  )
  .addErrorHandlers(myErrorHandler)
  .lambda()

