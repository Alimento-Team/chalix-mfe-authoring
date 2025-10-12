import { useState, useEffect } from 'react';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

interface CourseConfig {
  title?: string;
  short_description?: string;
  course_type?: string;
  course_level?: string;
  estimated_hours?: number;
  online_course_link?: string;
  instructor?: string;
  start_date?: string | null;
  end_date?: string | null;
  final_evaluation_type?: string; // "Nộp bài thu hoạch" | "Làm bài trắc nghiệm" | ""
  units?: Array<{
    title: string;
    name: string;
    description?: string;
  }>;
}

interface UseCourseConfigReturn {
  courseConfig: CourseConfig | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch course configuration from Chalix API
 */
export const useCourseConfig = (courseId: string): UseCourseConfigReturn => {
  const [courseConfig, setCourseConfig] = useState<CourseConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseConfig = async () => {
    if (!courseId) return;

    setIsLoading(true);
    setError(null);

    try {
      const httpClient = getAuthenticatedHttpClient();
      const baseUrl = getConfig().STUDIO_BASE_URL || window.location.origin;
      
      // Encode the course key to handle special characters
      const encodedCourseId = encodeURIComponent(courseId);
      const apiUrl = `${baseUrl}/api/chalix/dashboard/course-detail/${encodedCourseId}/`;
      
      console.log('Fetching course config from:', apiUrl);
      
      const response = await httpClient.get(apiUrl);
      
      console.log('Course config response:', response.data);
      
      setCourseConfig({
        title: response.data.title || '',
        short_description: response.data.short_description || '',
        course_type: response.data.course_type || '',
        course_level: response.data.course_level || '',
        estimated_hours: response.data.estimated_hours,
        online_course_link: response.data.online_course_link,
        instructor: response.data.instructor,
        // Include canonical start_date (and allow legacy start if present)
        start_date: response.data.start_date || response.data.start || null,
        end_date: response.data.end_date || response.data.end || null,
        final_evaluation_type: response.data.final_evaluation_type || '',
        units: response.data.units || [],
      });
    } catch (err) {
      console.error('Failed to fetch course config:', err);
      
      // Set default empty config on error so UI shows "Chưa đặt"
      setCourseConfig({
        title: '',
        short_description: '',
        course_type: '',
        course_level: '',
        estimated_hours: 0,
        online_course_link: '',
        instructor: '',
        start_date: null,
        end_date: null,
        final_evaluation_type: '',
        units: [],
      });
      
      setError(err instanceof Error ? err.message : 'Failed to fetch course configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseConfig();
  }, [courseId]);

  return {
    courseConfig,
    isLoading,
    error,
    refetch: fetchCourseConfig,
  };
};