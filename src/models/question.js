// @flow

const debug = require('debug')('models:question')
import { Model } from './model'
import type { ID, Category, Difficulty } from '../types'
import { db } from '../utils/db'
const { PROJECTIONS } = require('../../api/api');
import { utils } from '../utils'


export class Question extends Model {
  _id: ID;
  /**
   * Website from where the question was taken
   */
  source: string;

  /**
   * Category declared by source
   */
  source_category: string;
  category: Category;
  question: string;
  correct_answer: string;
  incorrect_answers: string[]
  difficulty: Difficulty;
  language: string;
  /**
   * Number of times the question was answered correctly
   */
  hit: number;
  /**
   * Opposite of hit
   */
  miss: number;
}
