import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthenticatedUser, getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';
import { useDispatch, useSelector } from 'react-redux';
import { useCourseConfig } from './hooks/useCourseConfig';
import { useQuizData } from './hooks/useQuizData';
import {
  Container,
  Button,
  Card,
  Row,
  Col,
  Toast,
  StandardModal,
  Form,
  FormControl,
  FormCheck,
} from '@openedx/paragon';
import {
  Home as HomeIcon,
  List as ListIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Edit as EditIcon,
  PlayCircle as VideoIcon,
  Description as SlideIcon,
  Quiz as QuizIcon,
  MoreVert as MenuIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Upload as UploadIcon,
  Settings as SettingsIcon,
} from '@openedx/paragon/icons';
import { XBlock } from '@src/data/types';
import { addVideoFile, deleteVideoFile, fetchVideos, fetchUnitVideos, addVideoUrlToUnit } from '../files-and-videos/videos-page/data/thunks';
import { hasUnitVideos, hasUnitSlides, getUnitVideos } from '../files-and-videos/videos-page/data/selectors';
import { fetchCourseOutlineIndexQuery, fetchCourseSectionQuery } from './data/thunk';
import { addSlideFile, deleteSlideFile, fetchSlides, fetchUnitSlides } from '../files-and-videos/slides-page/data/thunks';
import { RequestStatus } from '../data/constants';
import { useModels } from '../generic/model-store';
import FileViewerModal from './file-viewer/FileViewerModal';
import { updateCourseDetail } from './data/api';

interface CourseEditingLayoutProps {
  courseId: string;
  courseName: string;
  instructorName?: string;
  totalHours?: number;
  sections: XBlock[];
  selectedSectionId?: string;
  onSectionSelect: (sectionId: string) => void;
  onConfigurationEdit: () => void;
}

const CourseEditingLayout: React.FC<CourseEditingLayoutProps> = ({
  courseId,
  courseName,
  instructorName,
  totalHours,
  sections,
  selectedSectionId,
  onSectionSelect,
  onConfigurationEdit,
}) => {
  // Helper to read CSRF token from cookies (Django default csrftoken)
  const getCSRFToken = useCallback(() => {
    try {
      // Try multiple common CSRF cookie names
      const cookieNames = ['csrftoken', 'csrf_token', 'X-CSRFToken'];
      
      for (const cookieName of cookieNames) {
        const match = document.cookie.match(new RegExp('(^|; )' + cookieName + '=([^;]+)'));
        if (match && match[2]) {
          const token = decodeURIComponent(match[2]).trim();
          if (token && token.length > 0) {
            console.log(`🍪 Found CSRF token in ${cookieName} cookie:`, token.substring(0, 8) + '...');
            return token;
          }
        }
      }
      
      console.warn('🍪 No CSRF token found in any cookies');
      return '';
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Unable to read CSRF token from cookies', e);
      return '';
    }
  }, []);
  const dispatch = useDispatch();
  const [selectedSection, setSelectedSection] = useState<XBlock | null>(null);
  const uploadingIdsRef = useRef<{ uploadData: Record<string, any>; uploadCount: number }>({ 
    uploadData: {}, 
    uploadCount: 0 
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Add state for collapse
  const [videoCollapsed, setVideoCollapsed] = useState(true);

  // Add state for video player modal
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideoData, setSelectedVideoData] = useState(null);

  // Add state for video player modal
  const [showVideoPlayerModal, setShowVideoPlayerModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoErrorCount, setVideoErrorCount] = useState(0); // Track error count to prevent infinite loops

  // Add state for slide functionality
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [selectedSlideData, setSelectedSlideData] = useState(null);
  const [showFileViewerModal, setShowFileViewerModal] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(null);

  // Final evaluation: project question modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectQuestion, setProjectQuestion] = useState('');

  // Final evaluation: quiz upload modal state
  const [showQuizUploadModal, setShowQuizUploadModal] = useState(false);
  const [selectedQuizFile, setSelectedQuizFile] = useState<File | null>(null);
  const [quizUploadPreview, setQuizUploadPreview] = useState<any>(null);

  // Add state for quiz functionality
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuizListModal, setShowQuizListModal] = useState(false);
  const [showQuizPreviewModal, setShowQuizPreviewModal] = useState(false);
  const [selectedQuizData, setSelectedQuizData] = useState(null);
  const [currentPreviewQuiz, setCurrentPreviewQuiz] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [quizData, setQuizData] = useState({
    question: '',
    choices: [''],
    correctAnswers: [],
    multipleChoice: false,
  });

  // Video source selection modal state
  const [showVideoSourceModal, setShowVideoSourceModal] = useState(false);
  const [selectedVideoUnit, setSelectedVideoUnit] = useState<XBlock | null>(null);

  // Video URL input modal state
  const [showVideoUrlModal, setShowVideoUrlModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoUrlError, setVideoUrlError] = useState('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  // Fetch course configuration from Chalix API
  const { courseConfig, isLoading: isConfigLoading, error: configError, refetch: refetchConfig } = useCourseConfig(courseId);
  
  // Fetch quiz data for the selected unit
  const { quizzes, loading: quizzesLoading, hasQuizzes, refetch: refetchQuizzes } = useQuizData({
    courseId,
    unitId: selectedSection?.id,
  });
  
  // Get current user information
  const currentUser = getAuthenticatedUser(); // Instructor name should come from course details, not current user
  
  // Use course config data if available, otherwise fall back to props or default values
  const displayInstructorName = courseConfig?.instructor || instructorName || 'Chưa được chỉ định';
  // Display current authenticated user's full name in the header (prefer profile.name, then first/last name, then username/email)
  const displayUserName = currentUser
    ? (currentUser.profile?.name || `${(currentUser.first_name || '').trim()} ${(currentUser.last_name || '').trim()}`.trim() || currentUser.username || currentUser.email)
    : '';
  const displayTotalHours = courseConfig?.estimated_hours || totalHours;
  const displayOnlineCourseLink = courseConfig?.online_course_link;

  // Additional course-level display fields
  const displayCourseType = courseConfig?.courseType || courseConfig?.type || '';
  const displayCourseLevel = courseConfig?.courseLevel || courseConfig?.level || '';
  const displayShortDescription = courseConfig?.short_description || courseConfig?.shortDescription || '';
  const displayStartDateRaw = courseConfig?.start_date || (courseConfig as any)?.start || null;
  const displayEndDateRaw = courseConfig?.end_date || (courseConfig as any)?.end || null;
  const displayStartDate = displayStartDateRaw ? new Date(displayStartDateRaw).toLocaleDateString('vi-VN') : null;
  const displayEndDate = displayEndDateRaw ? new Date(displayEndDateRaw).toLocaleDateString('vi-VN') : null;

  // Helper to determine if course has started. Prefer canonical start_date then legacy start.
  const isCourseStarted = (cfg?: { start_date?: string | null }) => {
    if (!cfg) return false;
    const raw = cfg.start_date || (cfg as any).start || null;
    if (!raw) return false;
    const start = new Date(raw);
    return start <= new Date();
  };

  // Handler to start the course now by setting start_date to current time
  const handleStartCourseNow = async () => {
    try {
      // Use only the current date (no time) to represent "today" in a backend-friendly format
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayDate = `${yyyy}-${mm}-${dd}`; // e.g. 2025-10-04
      
      // Only send start_date - don't include other fields to avoid overwriting them
      const payload = {
        start_date: todayDate,
      };
      
      await updateCourseDetail(courseId, payload);
      // Refresh local config to show updated start date
      refetchConfig();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to start course now', err);
      alert('Không thể bắt đầu khóa học ngay bây giờ. Vui lòng thử lại.');
    }
  };

  // Video click handler
  const handleVideoClick = (selectedUnit: XBlock) => {
    // Use the unit videos from the selector
    // For now, just open video gallery for the user to select/assign a video
    // In a future iteration, this could open a dedicated video player
    if (unitVideos.length > 0) {
      setSelectedVideoData({
        unit: selectedUnit,
        videos: unitVideos,
      });
      setShowVideoModal(true);
    }
  };

  // Delete video handler
  const handleDeleteVideo = async (videoId: string, videoName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá video "${videoName}"?`)) {
      try {
        await dispatch(deleteVideoFile(courseId, videoId));
        // Refresh the video list after deletion
        setSelectedVideoData(prevData => ({
          ...prevData,
          videos: prevData?.videos.filter(v => v.edxVideoId !== videoId) || [],
        }));
        alert('Xoá video thành công!');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete video:', error);
        alert('Xoá video thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Play video handler
  const handlePlayVideo = (video: any) => {
    // Use the original video object without transformation since publicUrl is correct
    setCurrentVideo(video);
    setVideoErrorCount(0); // Reset error count for new video
    setShowVideoModal(false); // Close selection modal
    setShowVideoPlayerModal(true); // Open player modal
  };  // Slide click handler
  const handleSlideClick = (selectedUnit: XBlock) => {
    if (courseSlides.length > 0) {
      setSelectedSlideData({
        unit: selectedUnit,
        slides: courseSlides,
      });
      setShowSlideModal(true);
    }
  };

  // Delete slide handler
  const handleDeleteSlide = async (slideId: string, slideName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá slide "${slideName}"?`)) {
      try {
        await dispatch(deleteSlideFile(courseId, slideId));
        // Refresh the slide list after deletion
        setSelectedSlideData(prevData => ({
          ...prevData,
          slides: prevData?.slides.filter(s => s.slideId !== slideId) || [],
        }));
        alert('Xoá slide thành công!');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete slide:', error);
        alert('Xoá slide thất bại. Vui lòng thử lại.');
      }
    }
  };

  // View slide handler
  const handleViewSlide = (slide: any) => {
    setCurrentSlide(slide);
    setShowSlideModal(false); // Close selection modal
    setShowFileViewerModal(true); // Open viewer modal
  };

  // Quiz click handler (to view quiz list)
  const handleQuizClick = (selectedUnit: XBlock) => {
    if (hasQuizzes && quizzes.length > 0) {
      setSelectedQuizData({
        unit: selectedUnit,
        quizzes: quizzes,
      });
      setShowQuizListModal(true);
    }
  };

  // Delete quiz handler
  const handleDeleteQuiz = async (quizId: number, quizTitle: string) => {
    if (confirm(`Bạn có chắc chắn muốn xoá câu hỏi "${quizTitle}"?`)) {
      try {
        const { deleteQuiz } = await import('./data/quizService');
        const response = await deleteQuiz(quizId);
        
        if (response.success) {
          // Refresh quiz data and update the modal
          refetchQuizzes();
          setSelectedQuizData(prevData => ({
            ...prevData,
            quizzes: prevData?.quizzes.filter(q => q.id !== quizId) || [],
          }));
          alert('Xoá câu hỏi thành công!');
        } else {
          throw new Error(response.error || 'Không thể xoá câu hỏi');
        }
      } catch (error) {
        console.error('Failed to delete quiz:', error);
        alert('Xoá câu hỏi thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Quiz creation handler
  const handleQuizCreate = () => {
    resetQuizForm();
    setShowQuizModal(true);
  };

  // Quiz form handlers
  const addChoice = () => {
    setQuizData(prev => ({
      ...prev,
      choices: [...prev.choices, '']
    }));
  };

  const removeChoice = (index: number) => {
    if (quizData.choices.length > 1) {
      const newChoices = quizData.choices.filter((_, i) => i !== index);
      const newCorrectAnswers = quizData.correctAnswers.filter(i => i !== index).map(i => i > index ? i - 1 : i);
      setQuizData(prev => ({
        ...prev,
        choices: newChoices,
        correctAnswers: newCorrectAnswers
      }));
    }
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...quizData.choices];
    newChoices[index] = value;
    setQuizData(prev => ({
      ...prev,
      choices: newChoices
    }));
  };

  const toggleCorrectAnswer = (index: number) => {
    let newCorrectAnswers;
    if (quizData.multipleChoice) {
      // Multiple choice: toggle answer
      if (quizData.correctAnswers.includes(index)) {
        newCorrectAnswers = quizData.correctAnswers.filter(i => i !== index);
      } else {
        newCorrectAnswers = [...quizData.correctAnswers, index];
      }
    } else {
      // Single choice: only one answer
      newCorrectAnswers = quizData.correctAnswers.includes(index) ? [] : [index];
    }
    
    setQuizData(prev => ({
      ...prev,
      correctAnswers: newCorrectAnswers
    }));
  };

  // Handle quiz preview
  const handlePreviewQuiz = async (quiz) => {
    try {
      // Import the getQuizDetails function dynamically
      const { getQuizDetails } = await import('./data/quizService');
      const response = await getQuizDetails(quiz.id);
      
      if (response.success && response.quiz?.questions) {
        setCurrentPreviewQuiz({
          ...quiz,
          questions: response.quiz.questions
        });
        setShowQuizPreviewModal(true);
      } else {
        alert('Không thể tải chi tiết câu hỏi');
      }
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      alert('Lỗi khi tải chi tiết câu hỏi');
    }
  };

  // Handle quiz edit
  const handleEditQuiz = async (quiz) => {
    try {
      // Import the getQuizDetails function dynamically
      const { getQuizDetails } = await import('./data/quizService');
      const response = await getQuizDetails(quiz.id);
      
      if (response.success && response.quiz?.questions) {
        const firstQuestion = response.quiz.questions[0];
        if (firstQuestion) {
          // Populate the form with existing data
          setQuizData({
            question: firstQuestion.question_text,
            choices: firstQuestion.choices.map(choice => choice.text),
            correctAnswers: firstQuestion.choices
              .map((choice, index) => choice.is_correct ? index : -1)
              .filter(index => index !== -1),
            multipleChoice: firstQuestion.question_type === 'multiple_choice',
          });
          setEditingQuizId(quiz.id);
          setShowQuizModal(true);
          setShowQuizListModal(false);
        }
      } else {
        alert('Không thể tải chi tiết câu hỏi để chỉnh sửa');
      }
    } catch (error) {
      console.error('Error fetching quiz details for edit:', error);
      alert('Lỗi khi tải chi tiết câu hỏi');
    }
  };

  // Reset quiz form
  const resetQuizForm = () => {
    setQuizData({
      question: '',
      choices: [''],
      correctAnswers: [],
      multipleChoice: false,
    });
    setEditingQuizId(null);
  };

  // 🎯 Final Evaluation Handlers
  const handleProjectQuestionConfig = () => {
    // Open modal to edit project question
    console.log('🎯 Opening project question configuration');
    setProjectQuestion(courseConfig?.final_evaluation_project_question || '');
    setShowProjectModal(true);
  };

  const handleQuizExcelUpload = () => {
    console.log('🎯 Opening quiz Excel upload');
    setSelectedQuizFile(null);
    setShowQuizUploadModal(true);
  };

  const handleEvaluationConfig = () => {
    console.log('🎯 Opening evaluation configuration');
    // Navigate to course settings
    if (onConfigurationEdit) {
      onConfigurationEdit();
    } else {
      alert('Vào cài đặt khóa học để chọn hình thức kiểm tra cuối khóa');
    }
  };

  // Save project question (final evaluation - Nộp bài thu hoạch)
  const saveProjectQuestion = async () => {
    try {
      setIsUploading(true);
      await updateCourseDetail(courseId, { final_evaluation_project_question: projectQuestion });
      // refresh config
      refetchConfig();
      setShowProjectModal(false);
      setUploadMessage('Lưu câu hỏi thành công!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      console.error('Failed to save project question', err);
      setUploadMessage('Lưu câu hỏi thất bại.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  // Upload quiz Excel file for final evaluation (Làm bài trắc nghiệm)
  const uploadQuizExcel = async () => {
    if (!selectedQuizFile) {
      alert('Vui lòng chọn file Excel để tải lên');
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage('Đang xử lý file Excel...');
      setShowToast(true);

      // Parse Excel file locally
      const { parseQuizExcel, createIndividualQuizzes } = await import('./data/excelQuizParser');
      const parseResult = await parseQuizExcel(selectedQuizFile);

      if (!parseResult.success) {
        throw new Error(parseResult.error);
      }

      setUploadMessage('Đang tạo câu hỏi trắc nghiệm...');
      setQuizUploadPreview({
        summary: parseResult.summary,
        sampleQuestions: parseResult.quizzes.slice(0, 3) // Show first 3 questions as preview
      });

      // Create quizzes using existing quiz service
      const { createQuiz } = await import('./data/quizService');
      const results = await createIndividualQuizzes(
        parseResult.quizzes,
        courseId,
        selectedSection?.id,
        createQuiz
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        setUploadMessage(`Tạo thành công ${successCount} câu hỏi${failCount > 0 ? `, ${failCount} câu thất bại` : ''}!`);
        // Refresh quiz data to show new quizzes
        refetchQuizzes();
      } else {
        throw new Error('Không thể tạo câu hỏi nào');
      }

      setTimeout(() => setShowToast(false), 3000);
      // Keep modal open to show results
    } catch (err) {
      console.error('Quiz Excel processing failed:', err);
      setUploadMessage(`Xử lý thất bại: ${err.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuizSubmit = async () => {
    // Validate form
    if (!quizData.question.trim()) {
      alert('Vui lòng nhập câu hỏi');
      return;
    }
    if (quizData.choices.some(choice => !choice.trim())) {
      alert('Vui lòng nhập tất cả các lựa chọn');
      return;
    }
    if (quizData.correctAnswers.length === 0) {
      alert('Vui lòng chọn ít nhất một đáp án đúng');
      return;
    }

    if (!selectedSection && !editingQuizId) {
      alert('Vui lòng chọn chuyên đề để tạo quiz');
      return;
    }

    try {
      const isEditing = editingQuizId !== null;
      
      // Show loading state
      setUploadMessage(isEditing ? 'Đang cập nhật câu hỏi...' : 'Đang tạo câu hỏi...');
      setShowToast(true);

      console.log('Selected section:', selectedSection);
      console.log('Course ID:', courseId);
      console.log('Editing quiz ID:', editingQuizId);

      if (isEditing) {
        // Update existing quiz
        const quizUpdateData = {
          quiz_title: quizData.question.substring(0, 100), // Use first part of question as title
          quiz_description: '',
          questions: [{
            question_text: quizData.question,
            question_type: quizData.multipleChoice ? 'multiple_choice' as const : 'single_choice' as const,
            choices: quizData.choices.map((choice, index) => ({
              text: choice,
              is_correct: quizData.correctAnswers.includes(index)
            }))
          }]
        };

        console.log('Quiz update payload:', quizUpdateData);

        // Import the updateQuiz function dynamically
        const { updateQuiz } = await import('./data/quizService');
        const response = await updateQuiz(editingQuizId, quizUpdateData);

        if (response.success) {
          setUploadMessage('Cập nhật câu hỏi thành công!');
          setTimeout(() => setShowToast(false), 3000);
          
          // Refresh quiz data to show the updated quiz
          refetchQuizzes();
          
          // Close modal and reset form
          setShowQuizModal(false);
          resetQuizForm();

          console.log('Quiz updated successfully:', response.quiz);
        } else {
          throw new Error(response.error || 'Không thể cập nhật câu hỏi');
        }
      } else {
        // Create new quiz
        const quizRequest = {
          course_key: courseId,
          parent_locator: selectedSection.id,
          quiz_title: quizData.question.substring(0, 100), // Use first part of question as title
          quiz_description: '',
          questions: [{
            question_text: quizData.question,
            question_type: quizData.multipleChoice ? 'multiple_choice' as const : 'single_choice' as const,
            choices: quizData.choices.map((choice, index) => ({
              text: choice,
              is_correct: quizData.correctAnswers.includes(index)
            }))
          }]
        };

        console.log('Quiz request payload:', quizRequest);

        // Import the createQuiz function dynamically to avoid import issues
        const { createQuiz } = await import('./data/quizService');
        const response = await createQuiz(quizRequest);

        if (response.success) {
          setUploadMessage('Tạo câu hỏi thành công!');
          setTimeout(() => setShowToast(false), 3000);
          
          // Refresh quiz data to show the new quiz
          refetchQuizzes();
          
          // Close modal and reset form
          setShowQuizModal(false);
          resetQuizForm();

          console.log('Quiz created successfully:', response.quiz);
        } else {
          throw new Error(response.error || 'Không thể tạo câu hỏi');
        }
      }
    } catch (error) {
      console.error('Error with quiz operation:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      let errorMessage = editingQuizId 
        ? 'Cập nhật câu hỏi thất bại. Vui lòng thử lại.' 
        : 'Tạo câu hỏi thất bại. Vui lòng thử lại.';
      if (error.response?.status === 403) {
        errorMessage = 'Không có quyền tạo câu hỏi cho khóa học này.';
      } else if (error.response?.status === 400) {
        errorMessage = `Dữ liệu không hợp lệ: ${error.response?.data?.error || 'Vui lòng kiểm tra lại thông tin.'}`;
      } else if (error.response?.status >= 500) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
      }
      
      setUploadMessage(errorMessage);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  // Video/Slide upload handler
  const handleVideoUpload = async (contentType: 'video' | 'slide') => {
    console.log('handleVideoUpload called with contentType:', contentType);
    if (isUploading) { 
      console.log('Upload already in progress, returning early');
      return; 
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = contentType === 'video' ? 'video/*' : '.pdf,.docx';
    input.multiple = false;

    input.onchange = async (event) => {
      console.log('File input change event triggered');
      const { files } = (event.target as HTMLInputElement);
      console.log('Selected files:', files);
      
      if (files && files.length > 0) {
        console.log('Starting upload process for', files.length, 'files');
        setIsUploading(true);
        setUploadMessage('Đang tải lên...');
        setShowToast(true);

        try {
          const filesArray = Array.from(files);
          console.log('Files array:', filesArray);
          
          if (contentType === 'video') {
            console.log('Uploading video files');
            const videoIds: string[] = []; // Existing video IDs for the course
            const unitId = selectedSection?.id; // Get the current unit ID
            await dispatch(addVideoFile(
              courseId,
              filesArray,
              videoIds,
              uploadingIdsRef,
              unitId, // Pass unit ID for unit-specific upload
            ));
            // Refresh video list after successful upload
            if (unitId) {
              await dispatch(fetchUnitVideos(unitId));
            } else {
              await dispatch(fetchVideos(courseId));
            }
          } else if (contentType === 'slide') {
            console.log('Uploading slide files');
            console.log('courseId:', courseId);
            console.log('unitId:', selectedSection?.id);
            console.log('uploadingIdsRef.current:', uploadingIdsRef.current);
            const slideIds: string[] = []; // Existing slide IDs for the course
            const unitId = selectedSection?.id; // Get the current unit ID
            await dispatch(addSlideFile(
              courseId,
              filesArray,
              slideIds,
              uploadingIdsRef,
              unitId, // Pass unit ID for unit-specific upload
            ));
            console.log('addSlideFile dispatch completed');
            // Refresh slide list after successful upload
            if (unitId) {
              await dispatch(fetchUnitSlides(unitId));
            } else {
              await dispatch(fetchSlides(courseId));
            }
          }
          setUploadMessage('Tải lên thành công!');
          setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
          console.error('Upload failed:', error);
          setUploadMessage('Tải lên thất bại. Vui lòng thử lại.');
          setTimeout(() => setShowToast(false), 3000);
        } finally {
          setIsUploading(false);
        }
      }
    };

    console.log('Triggering file input click');
    input.click();
  };

  // New video creation handler - shows source selection popup
  const handleVideoCreate = (unit: XBlock) => {
    setSelectedVideoUnit(unit);
    setShowVideoSourceModal(true);
  };

  // Handle video source selection
  const handleVideoSourceSelection = (sourceType: 'upload' | 'url') => {
    setShowVideoSourceModal(false);
    
    if (sourceType === 'upload') {
      // Use existing upload flow
      handleVideoUpload('video');
    } else if (sourceType === 'url') {
      // Show URL input modal
      setVideoUrl('');
      setVideoUrlError('');
      setShowVideoUrlModal(true);
    }
  };

  // Handle video URL submission - Use Redux flow like file uploads
  const handleVideoUrlSubmit = async () => {
    console.log('🎬 handleVideoUrlSubmit called with URL:', videoUrl);
    
    if (!videoUrl.trim()) {
      setVideoUrlError('Vui lòng nhập URL video');
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      setVideoUrlError('URL không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    // Check if it's a supported video URL (YouTube, Google Drive)
    const isYoutube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(videoUrl);
    const isGoogleDrive = /drive\.google\.com\/file\/d\/([a-zA-Z0-9-_]+)/i.test(videoUrl);
    
    if (!isYoutube && !isGoogleDrive) {
      setVideoUrlError('Hiện tại chỉ hỗ trợ URL từ YouTube và Google Drive');
      return;
    }

    try {
      setVideoUrlError('');
      setIsSubmittingUrl(true);
      
      const unitId = selectedVideoUnit?.id || selectedSection?.id;
      const videoSourceType = isYoutube ? 'youtube' : 'google_drive';
      const displayName = isYoutube ? 'YouTube Video' : 'Google Drive Video';
      
      console.log('� Creating external video using Redux flow:', {
        unitId,
        videoUrl: videoUrl.trim(),
        videoSourceType,
        displayName,
      });
      
      // Use the new Redux action for external video URLs
      const result = await dispatch(addVideoUrlToUnit(
        unitId,
        videoUrl.trim(),
        videoSourceType,
        displayName
      ));
      
      if (result.success) {
        console.log('✅ External video created successfully');
        
        // Close modal and show success message
        setShowVideoUrlModal(false);
        setVideoUrl('');
        setUploadMessage('✅ Đã tạo video thành công!');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } else {
        console.error('❌ Failed to create external video:', result.error);
        setVideoUrlError(result.error || 'Không thể tạo video từ URL này.');
      }
      
    } catch (error) {
      console.error('Error adding video URL:', error);
      setVideoUrlError('Có lỗi xảy ra khi thêm video. Vui lòng thử lại.');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  // Get all units from sections (flattened)
  const getAllUnits = () => {
    const units: Array<XBlock & { sectionTitle?: string }> = [];
    sections.forEach(section => {
      if (section?.childInfo?.children) {
        section.childInfo.children.forEach(subsection => {
          if (subsection?.childInfo?.children) {
            subsection.childInfo.children.forEach(unit => {
              units.push({
                ...unit,
                sectionTitle: section.displayName,
              });
            });
          }
        });
      }
    });
    return units;
  };

  const allUnits = getAllUnits();

  // Find selected unit when selectedSectionId changes (using it as selectedUnitId)
  useEffect(() => {
    console.log('selectedSectionId changed:', selectedSectionId);
    if (selectedSectionId) {
      const unit = allUnits.find(u => u.id === selectedSectionId);
      console.log('Found unit for selectedSectionId:', unit?.id, unit?.displayName);
      if (unit && (!selectedSection || selectedSection.id !== unit.id)) {
        console.log('Setting selectedSection to:', unit.id);
        console.log('Previous selectedSection:', selectedSection?.id);
        console.log('New unit:', unit);
        setSelectedSection(unit);
        console.log('setSelectedSection called');
      } else {
        console.log('NOT setting selectedSection - unit already selected:', unit?.id);
      }
    } else if (allUnits.length > 0 && (!selectedSection || selectedSection.id !== allUnits[0].id)) {
      console.log('Setting selectedSection to first unit:', allUnits[0].id);
      setSelectedSection(allUnits[0]);
      if (onSectionSelect) {
        onSectionSelect(allUnits[0].id);
      }
    }
  }, [selectedSectionId, allUnits]);

  // Fetch course videos on component mount
  useEffect(() => {
    if (courseId) {
      dispatch(fetchVideos(courseId));
      dispatch(fetchSlides(courseId));
    }
  }, [courseId, dispatch]);

  // Fetch unit-specific media when selectedSection changes
  useEffect(() => {
    console.log('selectedSection changed:', selectedSection?.id, selectedSection?.displayName);
    if (selectedSection?.id) {
      console.log('Dispatching fetchUnitVideos for unit:', selectedSection.id);
      dispatch(fetchUnitVideos(selectedSection.id));
      console.log('Dispatching fetchUnitSlides for unit:', selectedSection.id);
      dispatch(fetchUnitSlides(selectedSection.id));
      
      // 🎯 Check if this is a final evaluation unit and show unit editor URL
      if (selectedSection?.displayName?.includes('kiểm tra cuối')) {
        console.log('🎯 FINAL EVALUATION UNIT DETECTED!');
        console.log('🎯 To edit this unit, navigate to: http://apps.local.openedx.io:2001/container/' + selectedSection.id);
        console.log('🎯 Current URL is course outline - you need to click the unit to access the editor');
        
        // Show a prominent alert with navigation button
        setTimeout(() => {
          if (confirm('🎯 Final Evaluation Unit Detected!\n\nThis unit requires the special Final Evaluation Editor.\n\nClick OK to navigate to the unit editor, or Cancel to stay on the course outline.')) {
            window.location.href = 'http://apps.local.openedx.io:2001/container/' + selectedSection.id;
          }
        }, 1000);
      }
    }
  }, [selectedSection?.id, dispatch]);

  // Get content items for selected unit (videos, slides, quizzes)
  const getContentItems = (selectedUnit: XBlock, hasVideos: boolean, hasSlides: boolean, hasQuizzes: boolean) => {
    // For new units, start with empty content that can be uploaded/created
    const unitIndex = allUnits.findIndex(u => u.id === selectedUnit.id) + 1;
    return [
      {
        type: 'video',
        title: 'Video bài giảng',
        subtitle: hasVideos ? `${unitIndex}. ${selectedUnit.displayName} - Bấm để xem Video bài giảng` : `${unitIndex}. ${selectedUnit.displayName} - Chưa có video`,
        icon: VideoIcon,
        primaryAction: 'Tạo mới',
        secondaryAction: 'Xoá',
        hasContent: hasVideos,
        onClick: hasVideos ? () => handleVideoClick(selectedUnit) : undefined,
      },
      {
        type: 'slide',
        title: 'Slide bài giảng',
        subtitle: hasSlides ? `${unitIndex}. ${selectedUnit.displayName} - Bấm để xem Slide bài giảng` : 'Chưa có slide cho chuyên đề này',
        icon: SlideIcon,
        primaryAction: 'Tải lên mới',
        secondaryAction: 'Xoá',
        hasContent: hasSlides,
        onClick: hasSlides ? () => handleSlideClick(selectedUnit) : undefined,
      },
      {
        type: 'quiz',
        title: 'Trắc nghiệm',
        subtitle: hasQuizzes ? `Đã tạo ${quizzes.length} câu hỏi trắc nghiệm` : 'Chưa có câu hỏi trắc nghiệm',
        icon: QuizIcon,
        primaryAction: 'Tạo mới',
        secondaryAction: 'Xoá',
        hasContent: hasQuizzes,
        onClick: hasQuizzes ? () => handleQuizClick(selectedUnit) : undefined,
        onQuizCreate: () => handleQuizCreate(),
      },
    ];
  };

  // Simplified video checking - only check uploaded videos  
  const unitHasVideos = useSelector(state => {
    if (!selectedSection?.id) return false;
    return hasUnitVideos(state, selectedSection.id);
  });
  // Simplified video list - only get uploaded videos
  const unitVideos = useSelector(state => {
    if (!selectedSection?.id) return [];
    return getUnitVideos(state, selectedSection.id);
  });
  
  // Use course-level slide checking
  const allSlides = useSelector(state => state.models?.slides || {});
  const courseSlides = Object.values(allSlides);
  const unitHasSlides = courseSlides.length > 0;
  
  // 🎯 Final Evaluation Detection
  const isFinalEvaluationUnit = !!(
    selectedSection?.displayName?.includes('Kiểm tra cuối') || 
    selectedSection?.displayName?.includes('kiểm tra cuối')
  );

  // Get final evaluation content items based on course configuration
  const getFinalEvaluationItems = (selectedUnit: XBlock) => {
    const evaluationTypeRaw = courseConfig?.final_evaluation_type || '';
    const evaluationType = String(evaluationTypeRaw).toLowerCase();

    // Support both backend short keys ('project' | 'quiz') and Vietnamese labels
    const isProjectSubmission = (
      evaluationType.includes('project') ||
      evaluationType.includes('nộp') ||
      evaluationType.includes('thu hoạch') ||
      evaluationType.includes('nộp bài thu hoạch')
    );
    const isMultipleChoice = (
      evaluationType.includes('quiz') ||
      evaluationType.includes('trắc nghiệm') ||
      evaluationType.includes('làm bài trắc nghiệm') ||
      evaluationType.includes('làm bài')
    );

    console.log('🎯 Final Evaluation Type:', { 
      evaluationType, 
      isProjectSubmission, 
      isMultipleChoice,
      courseType: courseConfig?.course_type,
      fullConfig: courseConfig 
    });

    if (isProjectSubmission) {
      const hasProjectQuestion = !!(courseConfig?.final_evaluation_project_question && courseConfig.final_evaluation_project_question.trim());
      
      return [
        {
          type: 'project-question',
          title: 'Câu hỏi bài thu hoạch',
          subtitle: hasProjectQuestion 
            ? 'Đã thiết lập câu hỏi bài thu hoạch - Bấm để xem/chỉnh sửa'
            : 'Thiết lập câu hỏi cho học viên nộp bài thu hoạch',
          icon: EditIcon,
          primaryAction: hasProjectQuestion ? 'Chỉnh sửa câu hỏi' : 'Cấu hình câu hỏi',
          secondaryAction: 'Xem trước',
          hasContent: hasProjectQuestion,
          onProjectConfig: handleProjectQuestionConfig,
        }
      ];
    } else if (isMultipleChoice) {
      const hasQuizQuestions = hasQuizzes && quizzes.length > 0;
      
      return [
        {
          type: 'quiz-upload',
          title: 'Tải lên đề thi trắc nghiệm',
          subtitle: hasQuizQuestions
            ? `Đã tạo ${quizzes.length} câu hỏi trắc nghiệm - Bấm để xem danh sách`
            : 'Upload file Excel chứa câu hỏi trắc nghiệm',
          icon: UploadIcon,
          primaryAction: hasQuizQuestions ? 'Xem câu hỏi' : 'Tải lên Excel',
          secondaryAction: 'Tải template',
          hasContent: hasQuizQuestions,
          onQuizUpload: hasQuizQuestions ? () => handleQuizClick(selectedUnit) : handleQuizExcelUpload,
        }
      ];
    } else {
      return [
        {
          type: 'evaluation-config',
          title: 'Cấu hình kiểm tra cuối khóa',
          subtitle: 'Chưa thiết lập hình thức kiểm tra. Vào cài đặt khóa học để chọn "Nộp bài thu hoạch" hoặc "Làm bài trắc nghiệm"',
          icon: SettingsIcon,
          primaryAction: 'Cài đặt khóa học',
          hasContent: false,
          onEvaluationConfig: handleEvaluationConfig,
        }
      ];
    }
  };

  const contentItems = selectedSection ? (
    isFinalEvaluationUnit 
      ? getFinalEvaluationItems(selectedSection)
      : getContentItems(selectedSection, unitHasVideos, unitHasSlides, hasQuizzes)
  ) : [];

  return (
    <div className="course-editing-layout bg-white min-vh-100">
      {/* Header */}
      <header className="course-editing-header">
        <div className="course-editing-header-top bg-primary text-white py-3">
          <Container fluid className="px-4">
            <Row className="align-items-center">
              <Col lg={8}>
                <h6 className="mb-0 font-weight-bold">
                  PHẦN MỀM HỌC TẬP THÔNG MINH DÀNH CHO CÔNG CHỨC, VIÊN CHỨC
                </h6>
              </Col>
              <Col lg={4} xs="auto" className="d-flex align-items-center justify-content-end">
                <span className="me-4">{displayUserName || ''}</span>
                <div className="course-editing-user-avatar bg-light rounded-circle p-2 me-3">
                  <PersonIcon size="sm" className="text-primary" />
                </div>
                <NotificationsIcon size="sm" className="text-white" />
              </Col>
            </Row>
          </Container>
        </div>

        <div className="course-editing-header-nav bg-white border-bottom">
          <Container fluid className="px-4">
            <Row className="align-items-center py-3">
              <Col lg={7} xs={12} className="mb-2 mb-lg-0">
                <div className="d-flex course-editing-nav-items justify-content-start">
                  <Button variant="link" className="course-editing-nav-item active">
                    <HomeIcon size="sm" className="me-2" />
                    Trang chủ
                  </Button>
                  <Button variant="link" className="course-editing-nav-item">
                    <ListIcon size="sm" className="me-2" />
                    Danh mục
                  </Button>
                  <Button variant="link" className="course-editing-nav-item">
                    <SchoolIcon size="sm" className="me-2" />
                    Học tập
                  </Button>
                  <Button variant="link" className="course-editing-nav-item">
                    <PersonIcon size="sm" className="me-2" />
                    Cá nhân hóa
                  </Button>
                </div>
              </Col>
              <Col lg={5} xs={12} className="d-flex justify-content-end">
                <div className="course-editing-search-bar position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập từ khóa tìm kiếm"
                    style={{ paddingRight: '40px' }}
                  />
                  <SearchIcon
                    className="position-absolute"
                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    size="sm"
                  />
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </header>

      {/* Content Area */}
      <div className="course-editing-content" style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
        <Container fluid className="px-4 py-4">
          {/* Course Info Section */}
          <Card className="course-info-card mb-4">
            <Card.Body className="px-3 py-3">
              <Row className="align-items-center">
                <Col>
                  <h5 className="mb-2 text-uppercase font-weight-bold">{courseName}</h5>
                  <div className="course-info-details">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 180 }}>Giảng viên:</strong>
                          <div className="text-body">{displayInstructorName}</div>
                        </div>

                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 180 }}>Thời lượng dự kiến:</strong>
                          <div className="text-body">{isConfigLoading ? 'Đang tải...' : (displayTotalHours ? `${displayTotalHours} giờ` : 'Chưa đặt')}</div>
                        </div>

                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 180 }}>Loại khoá học:</strong>
                          <div className="text-body">{displayCourseType || 'Chưa đặt'}</div>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 140 }}>Trình độ:</strong>
                          <div className="text-body">{displayCourseLevel || 'Chưa đặt'}</div>
                        </div>

                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 140 }}>Ngày bắt đầu:</strong>
                          <div className="text-body">{displayStartDate || 'Chưa đặt'}</div>
                        </div>

                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 140 }}>Ngày kết thúc:</strong>
                          <div className="text-body">{displayEndDate || 'Chưa đặt'}</div>
                        </div>
                      </div>

                      {/* Online link moved to bottom spanning full width */}
                      <div className="col-12">
                        <div className="mb-2 d-flex align-items-start">
                          <strong className="me-2 text-muted" style={{ minWidth: 140 }}>Liên kết lớp học trực tuyến:</strong>
                          <div className="text-body" style={{ marginLeft: 8 }}>
                            {isConfigLoading ? (
                              <span>Đang tải...</span>
                            ) : displayOnlineCourseLink ? (
                              <a href={displayOnlineCourseLink} target="_blank" rel="noopener noreferrer">
                                {displayOnlineCourseLink}
                              </a>
                            ) : (
                              <span>Chưa đặt</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="col-12">
                        <div className="mb-2 d-flex">
                          <strong className="me-2 text-muted" style={{ minWidth: 140 }}>Mô tả ngắn:</strong>
                          <div className="text-body">{displayShortDescription || 'Chưa có'}</div>
                        </div>
                      </div>

                      {/* Course Start Status Badge */}
                      { (courseConfig?.start_date || (courseConfig as any)?.start) && (
                        <div className="col-12" style={{ marginTop: 6 }}>
                          <span style={{ marginRight: 8, fontWeight: 600, color: '#333' }}>Trạng thái Khoá học:</span>
                          <span
                            style={{
                              background: isCourseStarted(courseConfig) ? '#e6f4ea' : '#f5f5f5',
                              color: isCourseStarted(courseConfig) ? '#2e7d32' : '#616161',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontWeight: 600,
                              fontSize: 14,
                              display: 'inline-block',
                            }}
                          >
                            {isCourseStarted(courseConfig) ? 'Đã bắt đầu' : 'Chưa bắt đầu'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Buttons moved to bottom of card */}
              <Row className="mt-3">
                <Col />
                <Col xs="auto" className="d-flex align-items-center" style={{ gap: '12px' }}>
                  <Button
                    id="start-course-btn"
                    variant="outline-secondary"
                    onClick={handleStartCourseNow}
                    size="md"
                    disabled={isConfigLoading || isCourseStarted(courseConfig)}
                  >
                    Bắt đầu khoá học
                  </Button>
                  <Button
                    id="edit-course-config-btn"
                    data-testid="edit-course-config-btn"
                    variant="primary"
                    onClick={onConfigurationEdit}
                    size="md"
                    className="fw-bold px-3 py-2"
                    disabled={isConfigLoading}
                  >
                    {isConfigLoading ? 'Đang tải...' : 'Chỉnh sửa cấu hình'}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Main Content Layout */}
          <Row>
            {/* Left Sidebar - Course Units */}
            <Col lg={4} className="mb-4">
              <Card className="course-chapters-card">
                <Card.Body className="p-3">
                  <div className="course-chapters-list">
                    {allUnits.length > 0 ? (
                      allUnits.map((unit, index) => {
                        const isSelected = unit.id === selectedSection?.id;

                        return (
                          <div
                            key={unit.id}
                            className={`course-chapter-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedSection(unit);
                              onSectionSelect(unit.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex align-items-center p-3 rounded">
                              <div className="course-chapter-icon me-2">
                                <MenuIcon size="md" className="text-white" />
                              </div>
                              <div style={{ width: '12px' }} />
                              <div className="flex-grow-1">
                                <h6 className="mb-1 text-white">
                                  Chuyên đề {index + 1}: {unit.displayName}
                                </h6>
                                {unit.sectionTitle && (
                                  <small className="text-white-50">Thuộc: {unit.sectionTitle}</small>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center text-white py-4">
                        <p className="mb-2">Chưa có chuyên đề nào</p>
                        <Button variant="light" size="sm">
                          Thêm chuyên đề mới
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Panel - Content Details */}
            <Col lg={8}>
              <Card className="content-details-card">
                {selectedSection && (
                  <>
                    <Card.Header className={isFinalEvaluationUnit ? "bg-warning text-dark" : "bg-info text-white"}>
                      <Row className="align-items-center">
                        <Col xs="auto">
                          <MenuIcon size="md" className="me-2" />
                        </Col>
                        <Col>
                          <h6 className="mb-1">
                            {isFinalEvaluationUnit ? "🎯 " : ""}{selectedSection.displayName}
                          </h6>
                          <small>{isFinalEvaluationUnit ? "Kiểm tra cuối khóa" : "Nội dung chuyên đề"}</small>
                        </Col>
                        <Col xs="auto">
                          <Button size="sm" className="bg-success border-success">
                            Phát hành
                          </Button>
                        </Col>
                      </Row>
                    </Card.Header>
                    <Card.Body className="p-3">
                      {contentItems.map((item, index) => (
                        <div key={index} className="content-item border rounded p-3 mb-3">
                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={(item.type === 'video' || item.type === 'slide') && item.hasContent ? { cursor: 'pointer' } : {}}
                            onClick={item.type === 'video' ? (e => {
                              if (e.target.tagName !== 'BUTTON') {
                                if (item.hasContent && item.onClick) {
                                  // If video has content and has onClick handler, call it
                                  item.onClick();
                                } else {
                                  // Otherwise just toggle collapse
                                  setVideoCollapsed(!videoCollapsed);
                                }
                              }
                            }) : item.type === 'slide' ? (e => {
                              if (e.target.tagName !== 'BUTTON' && item.hasContent && item.onClick) {
                                item.onClick();
                              }
                            }) : item.type === 'quiz' ? (e => {
                              if (e.target.tagName !== 'BUTTON' && item.hasContent && item.onClick) {
                                item.onClick();
                              }
                            }) : undefined}
                          >
                            <div className="d-flex align-items-center">
                              <div className="content-icon bg-light rounded-circle p-2">
                                <item.icon size="md" className="text-muted" />
                              </div>
                              <div style={{ width: '12px' }} />
                              <div className="ms-3">
                                <h6 className="mb-1">{item.title}</h6>
                                {item.subtitle && (
                                  <small className="text-muted">{item.subtitle}</small>
                                )}
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <Button
                                size="sm"
                                variant="info"
                                className="me-2 mb-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.type === 'video') {
                                    handleVideoCreate(selectedSection);
                                  } else if (item.type === 'slide') {
                                    handleVideoUpload(item.type);
                                  } else if (item.type === 'quiz' && item.onQuizCreate) {
                                    item.onQuizCreate();
                                  } else if (item.type === 'project-question' && item.onProjectConfig) {
                                    item.onProjectConfig();
                                  } else if (item.type === 'quiz-upload' && item.onQuizUpload) {
                                    item.onQuizUpload();
                                  } else if (item.type === 'evaluation-config' && item.onEvaluationConfig) {
                                    item.onEvaluationConfig();
                                  }
                                }}
                                disabled={isUploading && (item.type === 'video' || item.type === 'slide')}
                              >
                                {item.primaryAction}
                              </Button>
                              <div style={{ width: '8px' }} />
                              {item.secondaryAction && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="mb-1"
                                  onClick={(item.type === 'video' || item.type === 'slide') ? (e => e.stopPropagation()) : undefined}
                                >
                                  {item.secondaryAction}
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Collapsible video player for video item */}
                          {item.type === 'video' && item.hasContent && item.videoUrl && !videoCollapsed && (
                            <div className="mt-3">
                              {(() => {
                                const url = item.videoUrl || '';
                                const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
                                const isDrive = /drive\.google\.com/i.test(url);
                                if (isYouTube) {
                                  const embed = (item.publicUrl && String(item.publicUrl)) || url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
                                  return (
                                    <iframe
                                      width="100%"
                                      height="320"
                                      src={embed}
                                      title={item.displayName || 'YouTube Video'}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  );
                                }
                                if (isDrive) {
                                  const preview = (item.publicUrl && String(item.publicUrl)) || url.replace('/view', '/preview');
                                  return (
                                    <iframe
                                      width="100%"
                                      height="320"
                                      src={preview}
                                      title={item.displayName || 'Google Drive Video'}
                                      frameBorder="0"
                                      allowFullScreen
                                    />
                                  );
                                }
                                return (
                                  <video width="100%" height="320" controls src={item.publicUrl || item.videoUrl} />
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ))}
                    </Card.Body>
                  </>
                )}
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Toast for upload status */}
      {showToast && (isUploading || (uploadMessage && uploadMessage !== null)) && (
        <Toast
          open={showToast}
          onClose={() => setShowToast(false)}
          autoHideDuration={3000}
          placement="top"
          variant={uploadMessage === 'Tải lên thành công!' ? 'success' : uploadMessage === 'Đang tải lên...' ? 'info' : 'danger'}
        >
          {uploadMessage}
        </Toast>
      )}

      {/* Footer */}
      <footer className="course-editing-footer bg-primary text-white py-4 mt-auto">
        <Container fluid className="text-center">
          <p className="mb-0">Chịu trách nhiệm nội dung bởi {displayInstructorName}</p>
          <p className="mb-0 small">Copyright@2025</p>
        </Container>
      </footer>

      {/* Video Selection Modal */}
      <StandardModal
        title="Chọn Video để phát"
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        size="lg"
      >
        <div>
          {selectedVideoData && selectedVideoData.videos.length > 0 ? (
            <div>
              <p>Chọn một video để phát cho bài học: <strong>{selectedVideoData.unit?.displayName}</strong></p>
              <div className="video-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedVideoData.videos.map((video, index) => (
                  <Card key={video.id || video.edxVideoId || index} className="mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                        <VideoIcon className="me-3 text-primary" style={{ fontSize: '2rem', margin: '4px' }} />
                        <div className="flex-grow-1" style={{ padding: '10px' }}>
                          <h6 className="mb-1">{video.displayName || video.fileName || video.clientVideoId || 'Untitled Video'}</h6>
                          <small className="text-muted">
                            Video ID: {video.id || video.edxVideoId}
                            {video.duration && ` • Thời lượng: ${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`}
                            {video.formattedFileSize && ` • Kích thước: ${video.formattedFileSize}`}
                          </small>
                        </div>
                        <div className="d-flex" style={{ gap: '6px' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              // Open video player modal
                              handlePlayVideo(video);
                            }}
                          >
                            Phát Video
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(video.id || video.edxVideoId, video.displayName || video.fileName || video.clientVideoId || 'Untitled Video');
                            }}
                          >
                            Xoá
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p>Không có video nào để hiển thị.</p>
          )}
        </div>
      </StandardModal>

      {/* Project Question Modal (Final Evaluation: Nộp bài thu hoạch) */}
      <StandardModal
        title="Cấu hình câu hỏi bài thu hoạch"
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        size="lg"
        footerNode={(
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={() => setShowProjectModal(false)}>Hủy</Button>
            <Button variant="primary" onClick={saveProjectQuestion} disabled={isUploading}>Lưu</Button>
          </div>
        )}
      >
        <Form>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Câu hỏi cho học viên (Hướng dẫn nộp bài)</Form.Label>
            <FormControl
              as="textarea"
              rows={5}
              placeholder="Nhập nội dung câu hỏi / hướng dẫn nộp bài..."
              value={projectQuestion}
              onChange={(e) => setProjectQuestion((e.target as HTMLTextAreaElement).value)}
            />
            <Form.Text className="text-muted">Học viên sẽ thấy câu hỏi này trong LMS và có thể tải lên file docx hoặc pptx làm bài tập.</Form.Text>
          </Form.Group>
        </Form>
      </StandardModal>

      {/* Quiz Upload Modal (Final Evaluation: Làm bài trắc nghiệm) */}
      <StandardModal
        title="Tải lên đề thi trắc nghiệm (Excel)"
        isOpen={showQuizUploadModal}
        onClose={() => {
          setShowQuizUploadModal(false);
          setQuizUploadPreview(null);
          setSelectedQuizFile(null);
        }}
        size="lg"
        footerNode={(
          <div className="d-flex justify-content-between">
            <div>
              <Button variant="outline-info" size="sm" onClick={async () => {
                const { downloadQuizTemplate } = await import('./data/excelTemplateGenerator');
                downloadQuizTemplate();
              }}>
                📄 Tải template Excel
              </Button>
            </div>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={() => {
                setShowQuizUploadModal(false);
                setQuizUploadPreview(null);
                setSelectedQuizFile(null);
              }}>
                {quizUploadPreview ? 'Đóng' : 'Hủy'}
              </Button>
              {!quizUploadPreview && (
                <Button variant="primary" onClick={uploadQuizExcel} disabled={isUploading || !selectedQuizFile}>
                  {isUploading ? 'Đang xử lý...' : 'Xử lý Excel'}
                </Button>
              )}
            </div>
          </div>
        )}
      >
        <div>
          <div className="mb-3">
            <p className="mb-2">
              <strong>Định dạng file Excel yêu cầu:</strong>
            </p>
            <ul className="small text-muted">
              <li>Cột A: <strong>Tên câu hỏi</strong> - Nội dung câu hỏi</li>
              <li>Cột B: <strong>Đáp án đúng</strong> - Số thứ tự đáp án đúng (1, 2, 3, 4)</li>
              <li>Cột C: <strong>Số điểm</strong> - Điểm cho câu hỏi (tùy chọn)</li>
              <li>Cột D-G: <strong>Đáp án 1, 2, 3, 4</strong> - Các lựa chọn</li>
            </ul>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Chọn file Excel</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setSelectedQuizFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              disabled={isUploading}
            />
            <Form.Text className="text-muted">
              Hỗ trợ file .xlsx và .xls
            </Form.Text>
          </Form.Group>

          {selectedQuizFile && !quizUploadPreview && (
            <div className="alert alert-info">
              <small>
                <strong>File đã chọn:</strong> {selectedQuizFile.name} ({(selectedQuizFile.size / 1024).toFixed(1)} KB)
              </small>
            </div>
          )}

          {quizUploadPreview && (
            <div className="mt-3">
              <div className="alert alert-success">
                <h6 className="alert-heading">✅ Xử lý thành công!</h6>
                <p className="mb-2">
                  <strong>File:</strong> {quizUploadPreview.summary?.fileName}<br/>
                  <strong>Tổng số dòng:</strong> {quizUploadPreview.summary?.totalRows}<br/>
                  <strong>Câu hỏi hợp lệ:</strong> {quizUploadPreview.summary?.validQuizzes}
                </p>
              </div>

              {quizUploadPreview.sampleQuestions && (
                <div>
                  <h6>📋 Xem trước một số câu hỏi:</h6>
                  <div style={{ maxHeight: 300, overflow: 'auto', background: '#f8f9fa', padding: 12, border: '1px solid #dee2e6', borderRadius: 4 }}>
                    {quizUploadPreview.sampleQuestions.map((question, index) => (
                      <div key={index} className="mb-3 pb-2 border-bottom">
                        <strong>Câu {index + 1}:</strong> {question.question_text}
                        <ul className="mb-0 mt-1">
                          {question.choices.map((choice, choiceIndex) => (
                            <li key={choiceIndex} className={choice.is_correct ? 'text-success fw-bold' : ''}>
                              {choice.text} {choice.is_correct && '✓'}
                            </li>
                          ))}
                        </ul>
                        {question.points && question.points !== 1 && (
                          <small className="text-muted">Điểm: {question.points}</small>
                        )}
                      </div>
                    ))}
                    {quizUploadPreview.summary?.validQuizzes > 3 && (
                      <div className="text-center text-muted">
                        <small>... và {quizUploadPreview.summary.validQuizzes - 3} câu hỏi khác</small>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </StandardModal>

      {/* Video Player Modal */}
      <StandardModal
        title={`Phát Video: ${currentVideo?.displayName || currentVideo?.fileName || currentVideo?.clientVideoId || 'Untitled Video'}`}
        isOpen={showVideoPlayerModal}
        onClose={() => setShowVideoPlayerModal(false)}
        size="xl"
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {/* Check if this is an external video (YouTube, Google Drive) or an uploaded video with a publicUrl that is an embed */}
          {(() => {
            const pub = currentVideo?.publicUrl || '';
            const url = currentVideo?.external_url || currentVideo?.url || '';
            const combined = String(pub || url || '');
            const isYouTube = /(?:youtube\.com\/embed|youtube\.com|youtu\.be)/i.test(combined) || currentVideo?.video_source_type === 'youtube';
            const isDrive = /drive\.google\.com/i.test(combined) || currentVideo?.video_source_type === 'google_drive';

            if (isYouTube) {
              const embedSrc = pub || (url || '').replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
              return (
                <iframe
                  width="100%"
                  height="500"
                  src={embedSrc}
                  title={currentVideo?.displayName || 'YouTube Video'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              );
            }

            if (isDrive) {
              const driveSrc = pub || (url || '').replace('/view', '/preview');
              return (
                <iframe
                  width="100%"
                  height="500"
                  src={driveSrc}
                  title={currentVideo?.displayName || 'Google Drive Video'}
                  frameBorder="0"
                  allowFullScreen
                />
              );
            }

            return (
              (currentVideo?.publicUrl || currentVideo?.downloadLink || currentVideo?.url || currentVideo?.uploadUrl || currentVideo?.clientVideoId) ? (
            // Regular uploaded videos
            <video
              controls
              style={{ width: '100%', maxHeight: '500px' }}
              src={
                currentVideo?.publicUrl
                || currentVideo?.uploadUrl
                || currentVideo?.downloadLink
                || currentVideo?.url
                || `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`
              }
              title={currentVideo?.displayName || currentVideo?.fileName || currentVideo?.clientVideoId}
              onError={(e) => {
                // eslint-disable-next-line no-console
                console.error('Video error:', e);
                
                // Prevent infinite loops by limiting retry attempts
                if (videoErrorCount >= 3) {
                  return;
                }                setVideoErrorCount(prev => prev + 1);

                // Simple fallback logic - try the next available URL
                const currentSrc = e.target.src;
                if (currentSrc === currentVideo?.publicUrl && currentVideo?.uploadUrl) {
                  e.target.src = currentVideo.uploadUrl;
                } else if (currentSrc === currentVideo?.uploadUrl && currentVideo?.downloadLink) {
                  e.target.src = currentVideo.downloadLink;
                } else if (currentSrc === currentVideo?.downloadLink && currentVideo?.url) {
                  e.target.src = currentVideo.url;
                } else if (!currentSrc.includes('/stream/') && (currentVideo?.clientVideoId || currentVideo?.edxVideoId)) {
                  e.target.src = `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`;
                }
              }}
              onLoadStart={() => {
                const videoSrc = currentVideo?.publicUrl
                  || currentVideo?.uploadUrl
                  || currentVideo?.downloadLink
                  || currentVideo?.url
                  || `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`;
                console.log('Video load started, URL:', videoSrc);
                console.log('Video metadata:', {
                  uploadUrl: currentVideo?.uploadUrl,
                  publicUrl: currentVideo?.publicUrl,
                  downloadLink: currentVideo?.downloadLink,
                  url: currentVideo?.url,
                  clientVideoId: currentVideo?.clientVideoId,
                  edxVideoId: currentVideo?.edxVideoId,
                });
              }}
            >
              Trình duyệt của bạn không hỗ trợ thẻ video.
            </video>
            ) : (
            <div>
              <p>Không thể phát video này.</p>
              <p>Video ID: {currentVideo?.id || currentVideo?.edxVideoId}</p>
              <p>Status: {currentVideo?.status || 'Unknown'}</p>
              <p>Upload URL: {currentVideo?.uploadUrl || 'Not available'}</p>
              <p>Download Link: {currentVideo?.downloadLink || 'Not available'}</p>
              <p>Public URL: {currentVideo?.publicUrl || 'Not available'}</p>
              <p>URL: {currentVideo?.url || 'Not available'}</p>
              <p>Có thể video chưa được tải lên hoàn tất hoặc không có đường dẫn phát.</p>
            </div>
          )
          );
          })()}
        </div>
      </StandardModal>

      {/* Slide Selection Modal */}
      <StandardModal
        title="Chọn Slide để xem"
        isOpen={showSlideModal}
        onClose={() => setShowSlideModal(false)}
        size="lg"
      >
        <div>
          {selectedSlideData && selectedSlideData.slides.length > 0 ? (
            <div>
              <p>Chọn một slide để xem cho bài học: <strong>{selectedSlideData.unit?.displayName}</strong></p>
              <div className="slide-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {selectedSlideData.slides.map((slide, index) => (
                  <Card key={slide.slideId || index} className="mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-center" style={{ gap: '6px', margin: '4px 0px 0px 0px' }}>
                        <SlideIcon className="me-3 text-primary" style={{ fontSize: '2rem', margin: '8px' }} />
                        <div className="flex-grow-1" style={{ padding: '10px' }}>
                          <h6 className="mb-1">{slide.displayName || slide.fileName || 'Untitled Slide'}</h6>
                          <small className="text-muted">
                            Slide ID: {slide.slideId}
                            {slide.fileSize && (
                              <>
                              <br />
                              • Kích thước: {
                                (() => {
                                const size = slide.fileSize;
                                if (size < 1024) return `${size} B`;
                                if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
                                if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
                                return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
                                })()
                              }
                              </>
                            )}
                            {slide.fileType && (
                              <>
                              <br />
                              • Loại: {slide.fileType}
                              {slide.is_pptx && <span className="badge badge-info ms-1" style={{ fontSize: '0.7em', backgroundColor: '#17a2b8', color: 'white' }}>JS Viewer</span>}
                              </>
                            )}
                          </small>
                        </div>
                        <div className="d-flex" style={{ gap: '6px' , padding: '6px'}}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              handleViewSlide(slide);
                            }}
                          >
                            Xem Slide
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlide(slide.slideId, slide.displayName || slide.fileName || 'Untitled Slide');
                            }}
                          >
                            Xoá
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p>Không có slide nào để hiển thị.</p>
          )}
        </div>
      </StandardModal>

      {/* File Viewer Modal */}
      {currentSlide && (
        <FileViewerModal
          isOpen={showFileViewerModal}
          onClose={() => setShowFileViewerModal(false)}
          fileUrl={
            currentSlide.viewer_url
            || currentSlide.publicUrl
            || currentSlide.uploadUrl
            || currentSlide.downloadLink
            || currentSlide.url
          }
          fileName={currentSlide.displayName || currentSlide.fileName || 'Untitled File'}
          fileType={currentSlide.fileType || currentSlide.contentType}
        />
      )}

      {/* Quiz List Modal */}
      <StandardModal
        title="Danh sách câu hỏi trắc nghiệm"
        isOpen={showQuizListModal}
        onClose={() => setShowQuizListModal(false)}
        size="lg"
      >
        <div>
          {selectedQuizData && selectedQuizData.quizzes.length > 0 ? (
            <div>
              <p>Câu hỏi trắc nghiệm cho bài học: <strong>{selectedQuizData.unit?.displayName}</strong></p>
              <div className="quiz-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedQuizData.quizzes.map((quiz, index) => (
                  <Card key={quiz.id || index} className="mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                        <QuizIcon className="me-3 text-primary" style={{ fontSize: '2rem', margin: '4px' }} />
                        <div className="flex-grow-1" style={{ padding: '10px' }}>
                          <h6 className="mb-1">{quiz.title || 'Untitled Quiz'}</h6>
                          <small className="text-muted">
                            Quiz ID: {quiz.id}
                            <br />
                            • Số câu hỏi: {quiz.question_count}
                            <br />
                            • Ngày tạo: {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                            {quiz.description && (
                              <>
                                <br />
                                • Mô tả: {quiz.description}
                              </>
                            )}
                          </small>
                        </div>
                        <div className="d-flex flex-column" style={{ gap: '6px' }}>
                          <div className="d-flex" style={{ gap: '6px' }}>
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handlePreviewQuiz(quiz)}
                              className="d-flex align-items-center"
                            >
                              <PreviewIcon className="me-1" style={{ fontSize: '14px' }} />
                              Xem trước
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleEditQuiz(quiz)}
                              className="d-flex align-items-center"
                            >
                              <EditIcon className="me-1" style={{ fontSize: '14px' }} />
                              Chỉnh sửa
                            </Button>
                          </div>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(quiz.id, quiz.title || 'Untitled Quiz');
                            }}
                            className="d-flex align-items-center justify-content-center"
                          >
                            <DeleteIcon className="me-1" style={{ fontSize: '14px' }} />
                            Xoá
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p>Không có câu hỏi trắc nghiệm nào để hiển thị.</p>
          )}
        </div>
      </StandardModal>

      {/* Quiz Creation/Edit Modal */}
      <StandardModal
        title={editingQuizId ? "Chỉnh sửa câu hỏi trắc nghiệm" : "Tạo câu hỏi trắc nghiệm"}
        isOpen={showQuizModal}
        onClose={() => {
          setShowQuizModal(false);
          resetQuizForm();
        }}
        size="lg"
        footerNode={(
          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowQuizModal(false);
                resetQuizForm();
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleQuizSubmit}
            >
              {editingQuizId ? 'Cập nhật câu hỏi' : 'Tạo câu hỏi'}
            </Button>
          </div>
        )}
      >
        <Form>
          {/* Question Input */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Câu hỏi</Form.Label>
            <FormControl
              as="textarea"
              rows={3}
              placeholder="Nhập câu hỏi..."
              value={quizData.question}
              onChange={(e) => setQuizData(prev => ({ ...prev, question: e.target.value }))}
            />
          </Form.Group>

          {/* Multiple Choice Toggle */}
          <Form.Group className="mb-4">
            <FormCheck
              type="switch"
              id="multiple-choice-switch"
              label="Cho phép chọn nhiều đáp án"
              checked={quizData.multipleChoice}
              onChange={(e) => {
                const isMultiple = e.target.checked;
                setQuizData(prev => ({
                  ...prev,
                  multipleChoice: isMultiple,
                  correctAnswers: isMultiple ? prev.correctAnswers : prev.correctAnswers.slice(0, 1)
                }));
              }}
            />
          </Form.Group>

          {/* Choices */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">
              Các lựa chọn 
              <small className="text-muted ms-2">
                (Tick vào ô bên cạnh để đánh dấu đáp án đúng)
              </small>
            </Form.Label>
            {quizData.choices.map((choice, index) => (
              <div key={index} className="d-flex align-items-center mb-2">
                <FormCheck
                  type={quizData.multipleChoice ? "checkbox" : "radio"}
                  id={`choice-correct-${index}`}
                  name="correct-answers"
                  checked={quizData.correctAnswers.includes(index)}
                  onChange={() => toggleCorrectAnswer(index)}
                  className="me-2"
                />
                <FormControl
                  type="text"
                  placeholder={`Lựa chọn ${index + 1}`}
                  value={choice}
                  onChange={(e) => updateChoice(index, e.target.value)}
                  className="me-2"
                />
                {quizData.choices.length > 1 && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => removeChoice(index)}
                  >
                    <DeleteIcon size="sm" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline-primary"
              size="sm"
              onClick={addChoice}
              className="mt-2"
            >
              <AddIcon size="sm" className="me-1" />
              Thêm lựa chọn
            </Button>
          </Form.Group>

          {/* Preview */}
          {quizData.question && (
            <div className="border rounded p-3 bg-light">
              <h6 className="fw-bold">Xem trước:</h6>
              <p><strong>Câu hỏi:</strong> {quizData.question}</p>
              <p><strong>Loại:</strong> {quizData.multipleChoice ? 'Chọn nhiều đáp án' : 'Chọn một đáp án'}</p>
              <p><strong>Các lựa chọn:</strong></p>
              <ul>
                {quizData.choices.map((choice, index) => (
                  <li 
                    key={index} 
                    className={quizData.correctAnswers.includes(index) ? 'text-success fw-bold' : ''}
                  >
                    {choice || `Lựa chọn ${index + 1}`}
                    {quizData.correctAnswers.includes(index) && ' ✓'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Form>
      </StandardModal>

      {/* Quiz Preview Modal */}
      <StandardModal
        title="Xem trước câu hỏi trắc nghiệm"
        isOpen={showQuizPreviewModal}
        onClose={() => setShowQuizPreviewModal(false)}
        size="lg"
        footerNode={(
          <div className="d-flex justify-content-between">
            <Button
              variant="primary"
              onClick={() => {
                setShowQuizPreviewModal(false);
                if (currentPreviewQuiz) {
                  handleEditQuiz(currentPreviewQuiz);
                }
              }}
            >
              Chỉnh sửa câu hỏi
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowQuizPreviewModal(false)}
            >
              Đóng
            </Button>
          </div>
        )}
      >
        {currentPreviewQuiz && (
          <div>
            <Card className="mb-3">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">{currentPreviewQuiz.title || 'Untitled Quiz'}</h5>
                <small>
                  Quiz ID: {currentPreviewQuiz.id} | 
                  Số câu hỏi: {currentPreviewQuiz.question_count} | 
                  Ngày tạo: {new Date(currentPreviewQuiz.created_at).toLocaleDateString('vi-VN')}
                </small>
              </Card.Header>
              <Card.Body>
                {currentPreviewQuiz.description && (
                  <div className="mb-3">
                    <strong>Mô tả:</strong> {currentPreviewQuiz.description}
                  </div>
                )}
                
                {currentPreviewQuiz.questions && currentPreviewQuiz.questions.length > 0 ? (
                  <div>
                    {currentPreviewQuiz.questions.map((question, questionIndex) => (
                      <div key={questionIndex} className="mb-4">
                        <div className="mb-3">
                          <strong>Câu hỏi {questionIndex + 1}:</strong>
                          <p className="mt-2 p-3 bg-light rounded">{question.question_text}</p>
                        </div>
                        
                        <div className="mb-3">
                          <strong>Loại câu hỏi:</strong> {
                            question.question_type === 'multiple_choice' 
                              ? 'Cho phép chọn nhiều đáp án' 
                              : 'Chọn một đáp án'
                          }
                        </div>
                        
                        <div>
                          <strong>Các lựa chọn:</strong>
                          <div className="mt-2">
                            {question.choices.map((choice, choiceIndex) => (
                              <div 
                                key={choiceIndex} 
                                className={`p-3 mb-2 border rounded ${choice.is_correct ? 'bg-success text-white border-success' : 'bg-light border-secondary'}`}
                                style={{ 
                                  borderWidth: choice.is_correct ? '2px' : '1px',
                                  boxShadow: choice.is_correct ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                }}
                              >
                                <div className="d-flex align-items-center">
                                  <span className="me-3" style={{ fontSize: '16px', fontWeight: 'bold', marginRight: '12px' }}>
                                    {question.question_type === 'multiple_choice' 
                                      ? (choice.is_correct ? '☑' : '☐') 
                                      : (choice.is_correct ? '●' : '○')
                                    }
                                  </span>
                                  <span className="flex-grow-1">{choice.text}</span>
                                  {choice.is_correct && (
                                    <span className="badge bg-light text-success ms-2 fw-bold">✓ Đáp án đúng</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">Không có câu hỏi nào được tìm thấy.</p>
                )}
              </Card.Body>
            </Card>
          </div>
        )}
      </StandardModal>

      {/* Video Source Selection Modal */}
      <StandardModal
        title="Chọn nguồn video"
        isOpen={showVideoSourceModal}
        onClose={() => setShowVideoSourceModal(false)}
        size="md"
        footerNode={(
          <div className="d-flex justify-content-end">
            <Button
              variant="secondary"
              onClick={() => setShowVideoSourceModal(false)}
            >
              Hủy
            </Button>
          </div>
        )}
      >
        <div className="text-center">
          <p className="mb-4">Bạn muốn thêm video bằng cách nào?</p>
          <div className="d-flex justify-content-center gap-3">
            <Button
              variant="primary"
              size="lg"
              className="px-4 py-3"
              onClick={() => handleVideoSourceSelection('upload')}
            >
              <i className="fas fa-upload me-2"></i>
              Tải lên video
            </Button>
            <Button
              variant="outline-primary"
              size="lg"
              className="px-4 py-3"
              onClick={() => handleVideoSourceSelection('url')}
            >
              <i className="fas fa-link me-2"></i>
              Thêm link video
            </Button>
          </div>
          <small className="text-muted mt-3 d-block">
            Bạn có thể tải lên file video hoặc thêm link từ YouTube, Google Drive
          </small>
        </div>
      </StandardModal>

      {/* Video URL Input Modal */}
      <StandardModal
        title="Thêm link video"
        isOpen={showVideoUrlModal}
        onClose={() => {
          setShowVideoUrlModal(false);
          setVideoUrl('');
          setVideoUrlError('');
          setIsSubmittingUrl(false);
        }}
        size="md"
        footerNode={(
          <div className="d-flex justify-content-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowVideoUrlModal(false);
                setVideoUrl('');
                setVideoUrlError('');
                setIsSubmittingUrl(false);
              }}
              disabled={isSubmittingUrl}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleVideoUrlSubmit}
              disabled={isSubmittingUrl}
            >
              {isSubmittingUrl ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang thêm...
                </>
              ) : (
                'Thêm video'
              )}
            </Button>
          </div>
        )}
      >
        <div>
          <p className="mb-3">Nhập URL video từ YouTube hoặc Google Drive:</p>
          
          <Form.Group className="mb-3">
            <Form.Label>URL Video <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="url"
              placeholder="https://www.youtube.com/watch?v=... hoặc https://drive.google.com/file/d/..."
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                if (videoUrlError) setVideoUrlError('');
              }}
              isInvalid={!!videoUrlError}
            />
            {videoUrlError && (
              <div className="invalid-feedback d-block">
                {videoUrlError}
              </div>
            )}
          </Form.Group>

          <div className="mt-3 p-3 bg-light rounded">
            <h6 className="mb-2">Định dạng URL được hỗ trợ:</h6>
            <ul className="mb-0 small">
              <li><strong>YouTube:</strong> https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li><strong>YouTube:</strong> https://youtu.be/VIDEO_ID</li>
              <li><strong>Google Drive:</strong> https://drive.google.com/file/d/FILE_ID/view</li>
            </ul>
          </div>
        </div>
      </StandardModal>
    </div>
  );
};

export default CourseEditingLayout;
