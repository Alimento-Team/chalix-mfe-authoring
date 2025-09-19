import React, { useState, useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { Container, Button, Card, Row, Col, Toast, StandardModal } from '@openedx/paragon';
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
} from '@openedx/paragon/icons';
import { useDispatch, useSelector } from 'react-redux';
import { XBlock } from '@src/data/types';
import { addVideoFile, deleteVideoFile, fetchVideos } from '../files-and-videos/videos-page/data/thunks';
import { RequestStatus } from '../data/constants';
import { useModels } from '../generic/model-store';

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
  const uploadingIdsRef = useRef<{ uploadData: Record<string, any> }>({ uploadData: {} });
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

  // Get current user information
  const currentUser = getAuthenticatedUser();  // Instructor name should come from course details, not current user
  const displayInstructorName = instructorName || 'Chưa được chỉ định';

  // Video click handler
  const handleVideoClick = (selectedUnit: XBlock) => {
    // For now, just open video gallery for the user to select/assign a video
    // In a future iteration, this could open a dedicated video player
    if (courseVideos.length > 0) {
      setSelectedVideoData({
        unit: selectedUnit,
        videos: courseVideos
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
          videos: prevData?.videos.filter(v => v.edxVideoId !== videoId) || []
        }));
        alert('Xoá video thành công!');
      } catch (error) {
        console.error('Failed to delete video:', error);
        alert('Xoá video thất bại. Vui lòng thử lại.');
      }
    }
  };

  // Play video handler
  const handlePlayVideo = (video: any) => {
    console.log('Playing video:', video); // Debug log to see video structure
    
    // Use the original video object without transformation since publicUrl is correct
    setCurrentVideo(video);
    setVideoErrorCount(0); // Reset error count for new video
    setShowVideoModal(false); // Close selection modal
    setShowVideoPlayerModal(true); // Open player modal
  };

    // Video upload handler
    const handleVideoUpload = async (contentType: 'video' | 'slide') => {
      if (isUploading) return;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = contentType === 'video' ? 'video/*' : '.ppt,.pptx,.pdf';
      input.multiple = false;

      input.onchange = async (event) => {
        const files = (event.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          setIsUploading(true);
          setUploadMessage('Đang tải lên...');
          setShowToast(true);

          try {
            const filesArray = Array.from(files);
            const videoIds: string[] = []; // Existing video IDs for the course
            await dispatch(addVideoFile(
              courseId,
              filesArray,
              videoIds,
              uploadingIdsRef
            ));
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
    if (selectedSectionId) {
      const unit = allUnits.find(u => u.id === selectedSectionId);
      if (unit && (!selectedSection || selectedSection.id !== unit.id)) {
        setSelectedSection(unit);
      }
    } else if (allUnits.length > 0 && (!selectedSection || selectedSection.id !== allUnits[0].id)) {
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
    }
  }, [courseId, dispatch]);

  // Get content items for selected unit (videos, slides, quizzes)
  // Get all videos for the course (not just unit-specific ones)
  const allVideos = useSelector(state => state.models?.videos || {});
  const courseVideos = Object.values(allVideos);
  const hasVideos = courseVideos.length > 0;

  // Debug logging
  console.log('Debug - allVideos from state:', allVideos);
  console.log('Debug - courseVideos array:', courseVideos);
  console.log('Debug - hasVideos:', hasVideos);

  const getContentItems = (selectedUnit: XBlock, hasVideos: boolean) => {
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
        subtitle: 'Chưa có slide cho chuyên đề này',
        icon: SlideIcon,
        primaryAction: 'Tải lên mới',
        secondaryAction: 'Xoá',
        hasContent: false, // Initially empty
      },
      {
        type: 'quiz',
        title: 'Trắc nghiệm',
        subtitle: 'Chưa có câu hỏi trắc nghiệm',
        icon: QuizIcon,
        primaryAction: 'Tạo mới',
        secondaryAction: 'Xoá',
        hasContent: false, // Initially empty
      }
    ];
  };

  const contentItems = selectedSection ? getContentItems(selectedSection, hasVideos) : [];

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
                    <div>
                      <span className="text-muted">
                        <strong>Tổng số giờ phải khóa học:</strong> {totalHours}h
                      </span>
                    </div>
                  </div>
                </Col>
                <Col xs="auto">
                  <Button 
                    variant="primary" 
                    onClick={onConfigurationEdit}
                    size="md"
                    className="fw-bold px-3 py-2"
                  >
                    Chỉnh sửa cấu hình
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
                            style={item.type === 'video' && item.hasContent ? { cursor: 'pointer' } : {}}
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
                                onClick={item.type === 'video' ? (e => { e.stopPropagation(); handleVideoUpload(item.type); }) : undefined}
                                disabled={isUploading && item.type === 'video'}
                              >
                                {item.primaryAction}
                              </Button>
                              <div style={{ width: '8px' }} />
                              {item.secondaryAction && (
                                <Button 
                                  size="sm" 
                                  variant="secondary"
                                  className="mb-1"
                                  onClick={item.type === 'video' ? (e => e.stopPropagation()) : undefined}
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
                  <Card key={video.edxVideoId || index} className="mb-3">
                    <Card.Body>
                      <div className="d-flex align-items-center" style={{ gap: '6px' }}>
                        <VideoIcon className="me-3 text-primary" style={{ fontSize: '2rem', margin: '4px' }} />
                        <div className="flex-grow-1" style={{ padding: '10px' }}>
                          <h6 className="mb-1">{video.displayName || video.clientVideoId || 'Untitled Video'}</h6>
                          <small className="text-muted">
                            Video ID: {video.edxVideoId}
                            {video.duration && ` • Thời lượng: ${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`}
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
                              handleDeleteVideo(video.edxVideoId, video.displayName || video.clientVideoId || 'Untitled Video');
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
        title={`Phát Video: ${currentVideo?.displayName || currentVideo?.clientVideoId || 'Untitled Video'}`}
        isOpen={showVideoPlayerModal}
        onClose={() => setShowVideoPlayerModal(false)}
        size="xl"
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {currentVideo?.publicUrl || currentVideo?.downloadLink || currentVideo?.url || currentVideo?.clientVideoId ? (
            <video 
              controls 
              style={{ width: '100%', maxHeight: '500px' }}
              src={
                currentVideo?.publicUrl || 
                currentVideo?.downloadLink || 
                currentVideo?.url ||
                `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`
              }
              title={currentVideo?.displayName || currentVideo?.clientVideoId}
              onError={(e) => {
                console.error('Video error:', e);
                console.log('Current video object:', currentVideo);
                console.log('Failed URL:', e.target.src);
                console.log('Error count:', videoErrorCount);
                
                // Prevent infinite loops by limiting retry attempts
                if (videoErrorCount >= 3) {
                  console.log('Too many errors, stopping retries');
                  return;
                }
                
                setVideoErrorCount(prev => prev + 1);
                
                // Simple fallback logic - try the next available URL
                const currentSrc = e.target.src;
                if (currentSrc === currentVideo?.publicUrl && currentVideo?.downloadLink) {
                  console.log('Trying downloadLink fallback...');
                  e.target.src = currentVideo.downloadLink;
                } else if (currentSrc === currentVideo?.downloadLink && currentVideo?.url) {
                  console.log('Trying url fallback...');
                  e.target.src = currentVideo.url;
                } else if (!currentSrc.includes('/stream/') && (currentVideo?.clientVideoId || currentVideo?.edxVideoId)) {
                  console.log('Trying streaming endpoint fallback...');
                  e.target.src = `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`;
                }
              }}
              onLoadStart={() => {
                const videoSrc = currentVideo?.publicUrl || 
                  currentVideo?.downloadLink || 
                  currentVideo?.url ||
                  `/cms/api/contentstore/v0/videos/stream/${currentVideo?.clientVideoId || currentVideo?.edxVideoId}`;
                console.log('Video load started, URL:', videoSrc);
                console.log('Video metadata:', {
                  publicUrl: currentVideo?.publicUrl,
                  downloadLink: currentVideo?.downloadLink,
                  url: currentVideo?.url,
                  clientVideoId: currentVideo?.clientVideoId,
                  edxVideoId: currentVideo?.edxVideoId
                });
              }}
            >
              Trình duyệt của bạn không hỗ trợ thẻ video.
            </video>
          ) : (
            <div>
              <p>Không thể phát video này.</p>
              <p>Video ID: {currentVideo?.edxVideoId}</p>
              <p>Status: {currentVideo?.status || 'Unknown'}</p>
              <p>Download Link: {currentVideo?.downloadLink || 'Not available'}</p>
              <p>Public URL: {currentVideo?.publicUrl || 'Not available'}</p>
              <p>URL: {currentVideo?.url || 'Not available'}</p>
              <p>Có thể video chưa được tải lên hoàn tất hoặc không có đường dẫn phát.</p>
              <button onClick={() => console.log('Full currentVideo object:', currentVideo)}>
                Log Video Object
              </button>
            </div>
          )}
        </div>
      </StandardModal>
    </div>
  );
};

export default CourseEditingLayout;