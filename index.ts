import {
  ErrorHandler,
  RequestHandler,
  getSlotValue,
  SkillBuilders
} from 'ask-sdk-core'

import { J6Data } from './types/api/J6Response'
import { getJ6Data, getFullSpeechText, getAnswer, getConcludingSpeechText, getEndRound1SpeechText, getResponse } from './utils/utils'

let j6Data : J6Data
let curClueIndex : number
let score : number
let prevQuestionSpeechText : string
let isBetweenRounds = false

const yesNoRepromptSpeechText = 'Please say yes, or no.'

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
    prevQuestionSpeechText = getFullSpeechText(j6Data, curClueIndex)

    return getResponse(input, speechText)
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

    if (correctAnswer.includes(receivedAnswer) || receivedAnswer.includes(correctAnswer)) {
      // FIXME: Currently this conditional will be overly optimistic. It will cause issues if someone intentionally tries to break it, by saying short answers, such as 'a', that are very likely to be included in the correct answer
      speechText = `Correct! The answer is: ${correctAnswer}. <break strength="x-strong" />`
      score++ 
    } else {
      speechText = `Sorry. You answered ${receivedAnswer}. The correct answer is: ${correctAnswer}.`
    }
    curClueIndex++

    if (curClueIndex === 6) {
      isBetweenRounds = true
      speechText += ' ' + getEndRound1SpeechText(score)

      return getResponse(input, speechText, yesNoRepromptSpeechText)

    } else if (curClueIndex < 12) {
      // ask next question
      speechText += ' ' + getFullSpeechText(j6Data, curClueIndex)
      prevQuestionSpeechText = getFullSpeechText(j6Data, curClueIndex)
  
      return getResponse(input, speechText)

    } else {
      // report score and close
      speechText += ' ' + getConcludingSpeechText(score)

      return getResponse(input, speechText, null, true)
    }
  }
}

// when the question is asked to be repeated
const RepeatIntentHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.RepeatIntent'
  },

  handle(input) {
    if (isBetweenRounds) return getResponse(input, yesNoRepromptSpeechText, yesNoRepromptSpeechText)
    else return getResponse(input, prevQuestionSpeechText)
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
      prevQuestionSpeechText = getFullSpeechText(j6Data, curClueIndex)

      return getResponse(input, speechText)

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

      return getResponse(input, speechText, null, true)

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

    return getResponse(input, speechText, null, true)
  }
}

// used for generic out-of-domain response, as well as catching special purpose intents
const FallbackIntentHandler: RequestHandler = {
  canHandle(_input) {
    return true
  },

  handle(input) {
    // handle a request for a slow repeat of speechText
    if (getSlotValue(input.requestEnvelope, 'fallback').includes('slow')) {
      if (isBetweenRounds) {
        const speechText = `<emphasis level="strong">${yesNoRepromptSpeechText}</emphasis>`
        return getResponse(input, speechText, speechText)
      } else {
        const speechText = `<emphasis level="strong">${prevQuestionSpeechText}</emphasis>`
        return getResponse(input, speechText)
      }
    }

    // general purpose out-of-domain responses
    const speechText = isBetweenRounds ?
      yesNoRepromptSpeechText :
      'please answer the clue in the form of a question'

    return getResponse(input, speechText, speechText)
  }
}

const myErrorHandler: ErrorHandler = {
  canHandle(_input) {
    return true
  },

  handle(input, err) {
    console.log(`handling error: ${err.message}`)

    const speechText = 'An error occurred, please repeat your request'

    return getResponse(input, speechText, speechText)
  }
}

export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AnswerIntentHandler,
    RepeatIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler
  )
  .addErrorHandlers(myErrorHandler)
  .lambda()

