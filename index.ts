import {
  ErrorHandler,
  RequestHandler,
  SkillBuilders
} from 'ask-sdk-core'

import axios from 'axios'

interface J6Data {
  game_id: string,
  date: string,
  clues_round_1: Clue[],
  clues_round_2: Clue[]
}

interface Clue {
  answers: string[],
  category: string,
  clue: string,
  correct_answer_index: string
}

axios.get('https://www.jeopardy.com/api/j6-clues').then((res) => {
  const data : J6Data = res.data[0]
  console.log(data.clues_round_1[0].category)
})

const LaunchRequestHandler: RequestHandler = {
  canHandle(input) {
    const request = input.requestEnvelope.request
    return request.type === 'LaunchRequest'
  },
  async handle(input) {
    const j6Response = await axios.get('https://www.jeopardy.com/api/j6-clues')
    const j6Data : J6Data = j6Response.data[0]

    const speechText = j6Data.clues_round_1[0].category

    return input.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse()
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
  .addRequestHandlers(LaunchRequestHandler, CancelAndStopIntentHandler)
  .addErrorHandlers(myErrorHandler)
  .lambda()

