import type { Word } from '../types';
import type { Difficulty } from '../lib/gamification';

export interface CheckResult {
  correct: boolean;
  /** Text of the correct answer to show in the feedback panel */
  solution?: string;
  solutionSub?: string;
  note?: string;
  /** Words the learner got wrong (defaults to the exercise's words) */
  missed?: Word[];
}

export interface ExProps<E> {
  ex: E;
  difficulty: Difficulty;
  locked: boolean;
  setCheck: (fn: (() => CheckResult) | null) => void;
  submit: () => void;
}
