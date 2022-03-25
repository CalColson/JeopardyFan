import { HandlerInput } from 'ask-sdk-core'
import { Response } from 'ask-sdk-model'
import axios from 'axios'
import { decode as heDecode } from 'he'
import { J6Data } from '../types/api/J6Response'

function cleanSpeechText(speechText : string) {
  let cleanedText = heDecode(speechText)
  cleanedText = cleanedText.toLowerCase()

  // remove quotes... seems to break the speech parser, but only sometimes
  cleanedText = cleanedText.replace(/["]/g, '')
  
  // replace ampersands
  cleanedText = cleanedText.replace(/[&]/g, 'and')

  // remove extra spaces caused by cleaning
  cleanedText = cleanedText.replace(/\s+/g, ' ')
  cleanedText = cleanedText.trim()

  return cleanedText
}

export async function getJ6Data() : Promise<J6Data> {
  const j6Res = await axios.get('https://www.jeopardy.com/api/j6-clues')

  return j6Res.data[0]
}

export function getFullSpeechText(j6Data: J6Data, clueIndex: number): string {
  let speechText = getCategorySpeechText(j6Data, clueIndex) + ':'
  speechText += ' ' + getClueSpeechText(j6Data, clueIndex)

  speechText = cleanSpeechText(speechText)

  return speechText
}

export function getCategorySpeechText(j6data : J6Data, clueIndex: number): string {
  const roundNumber = clueIndex < 6 ? 1 : 2
  const correctedClueIndex = clueIndex < 6 ? clueIndex : clueIndex - 6

  let speechText = j6data[`clues_round_${roundNumber}`][correctedClueIndex].category

  // add prefaces for categories (first and last questions of round are special)
  if (correctedClueIndex === 0 || correctedClueIndex === 6) {
    speechText = 'This round\'s first category is: ' + speechText
  } else if (correctedClueIndex === 5 || correctedClueIndex === 11) {
    speechText = 'This round\'s last category is: ' + speechText
  } else {
    let ordinalClueNumber : string
    switch (correctedClueIndex) {
      case 1: case 7:
        ordinalClueNumber = 'second'
        break
      case 2: case 8:
        ordinalClueNumber = 'third'
        break
      case 3: case 9:
        ordinalClueNumber = 'fourth'
        break
      case 4: case 10:
        ordinalClueNumber = 'fifth'
        break
    
      default:
        break
    }
    speechText = `The ${ordinalClueNumber} category is: ` + speechText
  }

  speechText = cleanSpeechText(speechText)

  return speechText
}

export function getClueSpeechText(j6data : J6Data, clueIndex: number): string {
  const roundNumber = clueIndex < 6 ? 1 : 2
  const correctedClueIndex = clueIndex < 6 ? clueIndex : clueIndex - 6
  
  let speechText = j6data[`clues_round_${roundNumber}`][correctedClueIndex].clue

  speechText = cleanSpeechText(speechText)

  return speechText
}

export function getAnswerSpeechText(j6data: J6Data, clueIndex: number): string {
  const roundNumber = clueIndex < 6 ? 1 : 2
  const correctedClueIndex = clueIndex < 6 ? clueIndex : clueIndex - 6
  const correctAnswerIndex = parseInt(j6data[`clues_round_${roundNumber}`][correctedClueIndex].correct_answer_index) - 1

  let speechText = j6data[`clues_round_${roundNumber}`][correctedClueIndex].answers[correctAnswerIndex]

  speechText = cleanSpeechText(speechText)

  return speechText
}

export function getAnswer(j6Data: J6Data, clueIndex: number): string {
  const answerSpeechText = getAnswerSpeechText(j6Data, clueIndex)

  let answer = answerSpeechText.split(' is ')
  if (answer.length === 1) answer = answerSpeechText.split(' are ')

  // console.log(answer[1])
  answer[1] = cleanSpeechText(answer[1])
  answer[1] = answer[1].replace(/[?]/g, '')

  return answer[1].trim()
}

export function getEndRound1SpeechText(score: number): string {
  return `End of single jeopardy. You scored ${score} out of 6. Would you like to play double jeopardy as well? Please say yes, or no.`
}

export function getConcludingSpeechText(score : number): string {
  return `Thank you for playing! You scored ${score} out of 12. Goodbye!`
}

export function getResponse(
  input : HandlerInput,
  speechText : string,
  repromptSpeechText = null,
  shouldEndSession = false
) : Response {

  if (shouldEndSession) {
    return input.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse()

  } else {
    if (!repromptSpeechText) {
      repromptSpeechText = 'please answer the clue in the form of a question'
    }
    return input.responseBuilder
      .speak(speechText)
      .reprompt(repromptSpeechText)
      .getResponse()
  }

}