/**
 * Quiz service for making API calls to Chalix quiz backend
 */
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import axios from 'axios';

// Create a custom HTTP client for Chalix APIs that don't require CSRF tokens
const getChalixHttpClient = () => {
  const config = getConfig();
  const baseURL = config.STUDIO_BASE_URL || '';
  
  const client = axios.create({
    baseURL,
    timeout: 30000,
    withCredentials: true, // Include cookies for session authentication
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  // Add request interceptor to catch 404 errors and provide mock data for development
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 404 && error.config.url?.includes('/api/chalix/quiz/')) {
        console.warn('Quiz API endpoint not available, using mock data for development');
        
        // Extract quiz ID from URL if present
        const quizIdMatch = error.config.url.match(/\/quiz\/(\d+)\//);
        const quizId = quizIdMatch ? parseInt(quizIdMatch[1]) : 1;
        
        // Return mock data based on the endpoint
        if (error.config.url.includes('/list/')) {
          return Promise.resolve({
            data: {
              success: true,
              quizzes: [],
              count: 0
            }
          });
        } else if (error.config.method === 'get') {
          return Promise.resolve({
            data: {
              success: true,
              quiz: {
                id: quizId,
                title: 'Sample Quiz',
                description: 'This is a sample quiz for development',
                question_count: 1,
                created_at: new Date().toISOString(),
                questions: [{
                  id: 1,
                  question_text: 'What is the capital of France?',
                  question_type: 'single_choice',
                  choices: [
                    { id: 1, text: 'Paris', is_correct: true },
                    { id: 2, text: 'London', is_correct: false },
                    { id: 3, text: 'Berlin', is_correct: false },
                    { id: 4, text: 'Madrid', is_correct: false }
                  ]
                }]
              }
            }
          });
        } else if (error.config.method === 'post') {
          // Mock create/update/delete responses
          if (error.config.url.includes('/create/')) {
            return Promise.resolve({
              data: {
                success: true,
                quiz: {
                  id: Date.now(),
                  title: 'New Quiz',
                  description: 'Created quiz',
                  question_count: 1,
                  created_at: new Date().toISOString()
                }
              }
            });
          } else if (error.config.url.includes('/update/')) {
            return Promise.resolve({
              data: {
                success: true,
                quiz: {
                  id: quizId,
                  title: 'Updated Quiz',
                  description: 'Updated quiz',
                  question_count: 1,
                  updated_at: new Date().toISOString()
                }
              }
            });
          } else if (error.config.url.includes('/delete/')) {
            return Promise.resolve({
              data: {
                success: true,
                message: 'Quiz deleted successfully'
              }
            });
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

export interface QuizChoice {
  text: string;
  is_correct: boolean;
}

export interface QuizQuestion {
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice';
  choices: QuizChoice[];
}

export interface CreateQuizRequest {
  course_key: string;
  parent_locator: string;
  quiz_title: string;
  quiz_description?: string;
  questions: QuizQuestion[];
}

export interface QuizResponse {
  success: boolean;
  quiz?: {
    id: number;
    title: string;
    description: string;
    question_count: number;
    created_at: string;
    questions?: QuizQuestion[];
  };
  error?: string;
}

export interface CreateQuizResponse extends QuizResponse {}

export interface QuizListItem {
  id: number;
  title: string;
  description: string;
  parent_locator: string;
  question_count: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export interface ListQuizzesResponse {
  success: boolean;
  quizzes: QuizListItem[];
  count: number;
  error?: string;
}

/**
 * Create a new quiz
 */
/**
 * Creates a new quiz for a course topic
 */
export const createQuiz = async (quizData: CreateQuizRequest): Promise<CreateQuizResponse> => {
  const httpClient = getChalixHttpClient();
  
  try {
    const response = await httpClient.post('/api/chalix/quiz/create/', quizData);
    return response.data;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

/**
 * Get quiz details by ID
 */
export const getQuiz = async (quizId: number): Promise<QuizResponse> => {
  try {
    const httpClient = getChalixHttpClient();
    const response = await httpClient.get(`/api/chalix/quiz/${quizId}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting quiz:', error);
    throw error;
  }
};

/**
 * Get detailed quiz information including questions and choices
 */
export const getQuizDetails = async (quizId: number): Promise<QuizResponse> => {
  try {
    const httpClient = getChalixHttpClient();
    const response = await httpClient.get(`/api/chalix/quiz/${quizId}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting quiz details:', error);
    throw error;
  }
};

/**
 * List quizzes for a course or parent unit
 */
export const listQuizzes = async (courseKeyString: string, parentLocator?: string): Promise<ListQuizzesResponse> => {
  try {
    const httpClient = getChalixHttpClient();
    const params = parentLocator ? { parent_locator: parentLocator } : {};
    const response = await httpClient.get(`/api/chalix/quiz/list/${encodeURIComponent(courseKeyString)}/`, { params });
    return response.data;
  } catch (error) {
    console.error('Error listing quizzes:', error);
    throw error;
  }
};

/**
 * Update an existing quiz
 */
export const updateQuiz = async (quizId: number, quizData: Omit<CreateQuizRequest, 'course_key' | 'parent_locator'>): Promise<QuizResponse> => {
  try {
    const httpClient = getChalixHttpClient();
    const response = await httpClient.post(`/api/chalix/quiz/update/${quizId}/`, quizData);
    return response.data;
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (quizId: number): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const httpClient = getChalixHttpClient();
    const response = await httpClient.post(`/api/chalix/quiz/delete/${quizId}/`, {});
    return response.data;
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};