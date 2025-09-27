import React, { useState, useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
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
} from '@openedx/paragon/icons';
import { XBlock } from '@src/data/types';
import { addVideoFile, deleteVideoFile, fetchVideos, fetchUnitVideos } from '../files-and-videos/videos-page/data/thunks';
import { hasUnitVideos, hasUnitSlides, getUnitVideos } from '../files-and-videos/videos-page/data/selectors';
import { addSlideFile, deleteSlideFile, fetchSlides, fetchUnitSlides } from '../files-and-videos/slides-page/data/thunks';
import { RequestStatus } from '../data/constants';
import { useModels } from '../generic/model-store';
import FileViewerModal from './file-viewer/FileViewerModal';

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
  const intl = useIntl();
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
  const displayTotalHours = courseConfig?.estimated_hours || totalHours;
  const displayOnlineCourseLink = courseConfig?.online_course_link;

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
        setSelectedSection(unit);
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
    }
  }, [selectedSection?.id, dispatch]);

  // Get content items for selected unit (videos, slides, quizzes)
  // Now using unit-specific video and slide checking below

  const getContentItems = (selectedUnit: XBlock, hasVideos: boolean, hasSlides: boolean, hasQuizzes: boolean) => {
    // For new units, start with empty content that can be uploaded/created
    const unitIndex = allUnits.findIndex(u => u.id === selectedUnit.id) + 1;
    return [
      {
        type: 'video',
        title: 'Video bài giảng',
        subtitle: hasVideos ? `${unitIndex}. ${selectedUnit.displayName} - Bấm để xem Video bài giảng` : `${unitIndex}. ${selectedUnit.displayName} - Chưa có video`,
        icon: VideoIcon,
        primaryAction: 'Tải lên mới',
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

  // Import useSelector for unit-specific video checking
  const unitHasVideos = useSelector(state => {
    const result = selectedSection ? hasUnitVideos(state, selectedSection.id) : false;
    console.log('unitHasVideos selector result:', result, 'for unit:', selectedSection?.id);
    if (selectedSection?.id) {
      const allVideos = state.models?.videos || {};
      const allVideosList = Object.values(allVideos);
      console.log('All videos in state:', allVideosList.length, allVideosList.map(v => ({ id: v.id, unitId: v.unitId, displayName: v.displayName })));
      const unitVideos = allVideosList.filter(video => video.unitId === selectedSection.id);
      console.log('Unit videos found:', unitVideos.length, unitVideos);
    }
    return result;
  });
  
  // Get unit videos for the click handler
  const unitVideos = useSelector(state => selectedSection ? getUnitVideos(state, selectedSection.id) : []);
  
  // Temporarily use course-level slide checking until we create unit slide selectors
  const allSlides = useSelector(state => state.models?.slides || {});
  const courseSlides = Object.values(allSlides);
  const unitHasSlides = courseSlides.length > 0;
  
  const contentItems = selectedSection ? getContentItems(selectedSection, unitHasVideos, unitHasSlides, hasQuizzes) : [];

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
                <span className="me-4">dungdl</span>
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
                    <div className="mb-2">
                      <span className="text-muted">
                        <strong>Giảng viên:</strong> {displayInstructorName}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-muted">
                        <strong>Thời lượng dự kiến:</strong> {
                          isConfigLoading ? 'Đang tải...' : 
                          displayTotalHours ? `${displayTotalHours} giờ` : 'Chưa đặt'
                        }
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-muted">
                        <strong>Liên kết lớp học trực tuyến:</strong> {/* Add clickable link if present */}
                        {isConfigLoading ? (
                          <span style={{ marginLeft: 4 }}>Đang tải...</span>
                        ) : displayOnlineCourseLink ? (
                          <a href={displayOnlineCourseLink} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4 }}>
                            {displayOnlineCourseLink}
                          </a>
                        ) : (
                          <span style={{ marginLeft: 4 }}>Chưa đặt</span>
                        )}
                      </span>
                    </div>
                  </div>
                </Col>
                <Col xs="auto">
                  <Button
                    variant="primary"
                    onClick={() => {
                      // Call the original handler
                      onConfigurationEdit();
                      // Refetch course config after a delay to get updated data
                      setTimeout(() => {
                        refetchConfig();
                      }, 1000);
                    }}
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
                    <Card.Header className="bg-info text-white">
                      <Row className="align-items-center">
                        <Col xs="auto">
                          <MenuIcon size="md" className="me-2" />
                        </Col>
                        <Col>
                          <h6 className="mb-1">
                            {selectedSection.displayName}
                          </h6>
                          <small>Nội dung chuyên đề</small>
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
                                  if (item.type === 'video' || item.type === 'slide') {
                                    handleVideoUpload(item.type);
                                  } else if (item.type === 'quiz' && item.onQuizCreate) {
                                    item.onQuizCreate();
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
                              <video width="100%" height="320" controls src={item.videoUrl} />
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

      {/* Video Player Modal */}
      <StandardModal
        title={`Phát Video: ${currentVideo?.displayName || currentVideo?.fileName || currentVideo?.clientVideoId || 'Untitled Video'}`}
        isOpen={showVideoPlayerModal}
        onClose={() => setShowVideoPlayerModal(false)}
        size="xl"
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {currentVideo?.publicUrl || currentVideo?.downloadLink || currentVideo?.url || currentVideo?.uploadUrl || currentVideo?.clientVideoId ? (
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
          )}
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
    </div>
  );
};

export default CourseEditingLayout;
