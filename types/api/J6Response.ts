export interface J6Data {
  game_id: string,
  date: string,
  clues_round_1: Clue[],
  clues_round_2: Clue[]
}

export interface Clue {
  answers: string[],
  category: string,
  clue: string,
  correct_answer_index: string
}