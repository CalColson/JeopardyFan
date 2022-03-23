import { getJ6Data, getFullSpeechText, getAnswerSpeechText, getAnswer } from './utils/utils'

getJ6Data().then(j6Data => {
  for(let i = 0; i < 12; i++) {
    console.log(getFullSpeechText(j6Data, i))
    console.log(getAnswerSpeechText(j6Data, i))
    console.log(getAnswer(j6Data, i))
    console.log('----------------------\n')
  }
})