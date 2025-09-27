/**
 * React hook for managing quiz data in course authoring
 */
import { useState, useEffect, useCallback } from 'react';
import { listQuizzes, ListQuizzesResponse, QuizListItem } from '../data/quizService';

interface UseQuizDataProps {
  courseId?: string;
  unitId?: string;
}

export const useQuizData = ({ courseId, unitId }: UseQuizDataProps) => {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await listQuizzes(courseId, unitId);
      if (response.success) {
        setQuizzes(response.quizzes);
      } else {
        setError(response.error || 'Failed to load quizzes');
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, [courseId, unitId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const refetch = useCallback(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const hasQuizzes = quizzes.length > 0;

  return {
    quizzes,
    loading,
    error,
    hasQuizzes,
    refetch,
  };
};