/**
 * Course Progress Tab Component
 * 
 * Displays a list of enrolled learners with their submission status.
 * Allows teachers to view submissions and grade them.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  DataTable,
  Button,
  Badge,
  Spinner,
  Alert,
  ModalDialog,
  Form,
  Container,
  Row,
  Col,
  Card,
  ActionRow,
} from '@openedx/paragon';
import {
  CheckCircle,
  Cancel,
  Download,
  Visibility,
} from '@openedx/paragon/icons';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

const CourseProgress = ({ courseId }) => {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasEvaluation, setHasEvaluation] = useState(false);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState(null);

  const baseUrl = getConfig().STUDIO_BASE_URL;

  // Fetch learners list
  const fetchLearners = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getAuthenticatedHttpClient().get(
        `${baseUrl}/api/chalix/course-progress/learners/${courseId}/`
      );

      if (response.data.success) {
        setLearners(response.data.learners);
        setHasEvaluation(response.data.has_evaluation);
      } else {
        setError(response.data.error || 'Failed to load learners');
      }
    } catch (err) {
      console.error('Error fetching learners:', err);
      setError(err.response?.data?.error || 'Failed to load course progress');
    } finally {
      setLoading(false);
    }
  };

  // Fetch submission details
  const fetchSubmission = async (userId) => {
    try {
      const response = await getAuthenticatedHttpClient().get(
        `${baseUrl}/api/chalix/course-progress/submission/${courseId}/${userId}/`
      );

      if (response.data.success) {
        setSubmissionData(response.data.submission);
        setGrade(response.data.submission.grade || '');
        setFeedback(response.data.submission.feedback || '');
      } else {
        setError(response.data.error || 'Failed to load submission');
      }
    } catch (err) {
      console.error('Error fetching submission:', err);
      setError(err.response?.data?.error || 'Failed to load submission');
    }
  };

  // Open grade modal
  const handleViewSubmission = async (learner) => {
    setSelectedLearner(learner);
    setSubmissionData(null);
    setShowGradeModal(true);
    setGradeError(null);
    await fetchSubmission(learner.id);
  };

  // Close grade modal
  const handleCloseModal = () => {
    setShowGradeModal(false);
    setSelectedLearner(null);
    setSubmissionData(null);
    setGrade('');
    setFeedback('');
    setGradeError(null);
  };

  // Submit grade
  const handleSubmitGrade = async () => {
    if (!grade || grade < 0 || grade > 100) {
      setGradeError('Điểm phải từ 0 đến 100');
      return;
    }

    try {
      setGrading(true);
      setGradeError(null);

      const response = await getAuthenticatedHttpClient().post(
        `${baseUrl}/api/chalix/course-progress/grade/${courseId}/${selectedLearner.id}/`,
        {
          grade: parseFloat(grade),
          feedback: feedback,
        }
      );

      if (response.data.success) {
        // Refresh learners list
        await fetchLearners();
        handleCloseModal();
        // Show success message
        alert('Chấm điểm thành công! Học viên đã nhận được thông báo qua email.');
      } else {
        setGradeError(response.data.error || 'Failed to submit grade');
      }
    } catch (err) {
      console.error('Error submitting grade:', err);
      setGradeError(err.response?.data?.error || 'Failed to submit grade');
    } finally {
      setGrading(false);
    }
  };

  // Download submission file
  const handleDownloadSubmission = (userId) => {
    const downloadUrl = `${baseUrl}/api/chalix/course-progress/download/${courseId}/${userId}/`;
    window.open(downloadUrl, '_blank');
  };

  // Load learners on mount
  useEffect(() => {
    fetchLearners();
  }, [courseId]);

  // Table columns
  const columns = [
    {
      Header: 'Học viên',
      accessor: 'full_name',
      Cell: ({ row }) => (
        <div>
          <div className="font-weight-bold">{row.original.full_name}</div>
          <div className="small text-muted">{row.original.email}</div>
        </div>
      ),
    },
    {
      Header: 'Ngày ghi danh',
      accessor: 'enrollment_date',
      Cell: ({ value }) => value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A',
    },
    {
      Header: 'Trạng thái nộp bài',
      accessor: 'has_submission',
      Cell: ({ value, row }) => {
        if (!hasEvaluation) {
          return <span className="text-muted">Không có đánh giá</span>;
        }
        
        if (value) {
          const submittedDate = new Date(row.original.submission_date).toLocaleDateString('vi-VN');
          return (
            <div>
              <Badge variant="success">
                <CheckCircle className="mr-1" style={{ width: 16, height: 16 }} />
                Đã nộp
              </Badge>
              <div className="small text-muted mt-1">{submittedDate}</div>
            </div>
          );
        }
        
        return (
          <Badge variant="warning">
            <Cancel className="mr-1" style={{ width: 16, height: 16 }} />
            Chưa nộp
          </Badge>
        );
      },
    },
    {
      Header: 'Điểm',
      accessor: 'grade',
      Cell: ({ value, row }) => {
        if (!hasEvaluation || !row.original.has_submission) {
          return <span className="text-muted">-</span>;
        }
        
        if (row.original.graded) {
          return (
            <Badge variant="primary">
              {value}/100
            </Badge>
          );
        }
        
        return <span className="text-muted">Chưa chấm</span>;
      },
    },
    {
      Header: 'Thao tác',
      accessor: 'id',
      Cell: ({ row }) => {
        if (!hasEvaluation || !row.original.has_submission) {
          return null;
        }
        
        return (
          <div className="d-flex gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => handleViewSubmission(row.original)}
            >
              <Visibility className="mr-1" style={{ width: 16, height: 16 }} />
              {row.original.graded ? 'Xem & Sửa điểm' : 'Chấm điểm'}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleDownloadSubmission(row.original.id)}
            >
              <Download style={{ width: 16, height: 16 }} />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải tiến độ lớp học...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Lỗi</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!hasEvaluation) {
    return (
      <Container className="py-4">
        <Alert variant="info">
          <Alert.Heading>Chưa có đánh giá</Alert.Heading>
          <p>Khóa học này chưa có bài đánh giá thu hoạch. Các bài nộp của học viên sẽ xuất hiện ở đây </p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h3>Tiến độ lớp học</h3>
          <p className="text-muted">
            Tổng số học viên: {learners.length} | 
            Đã nộp bài: {learners.filter(l => l.has_submission).length} | 
            Đã chấm điểm: {learners.filter(l => l.graded).length}
          </p>
        </Col>
      </Row>

      <DataTable
        data={learners}
        columns={columns}
        itemCount={learners.length}
        pageCount={1}
      />

      {/* Grade Modal */}
      <ModalDialog
        isOpen={showGradeModal}
        onClose={handleCloseModal}
        size="lg"
        hasCloseButton
        title={`Chấm điểm bài nộp - ${selectedLearner?.full_name || ''}`}
      >
        <ModalDialog.Header>
          <ModalDialog.Title>
            Chấm điểm bài nộp - {selectedLearner?.full_name}
          </ModalDialog.Title>
        </ModalDialog.Header>
        <ModalDialog.Body>
          {!submissionData ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Đang tải bài nộp...</p>
            </div>
          ) : (
            <>
              <Card className="mb-4">
                <Card.Body>
                  <h5 className="mb-3">Câu hỏi thu hoạch</h5>
                  <p className="text-muted">{submissionData.practical_question}</p>
                </Card.Body>
              </Card>

              <Card className="mb-4">
                <Card.Body>
                  <h5 className="mb-3">Bài nộp của học viên</h5>
                  <p>
                    <strong>File:</strong>{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDownloadSubmission(selectedLearner.id);
                      }}
                    >
                      {submissionData.submission_file_name}
                    </a>
                  </p>
                  <p className="small text-muted">
                    Nộp lúc: {new Date(submissionData.submitted_at).toLocaleString('vi-VN')}
                  </p>
                </Card.Body>
              </Card>

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Điểm số (0-100) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Nhập điểm"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nhận xét</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Nhập nhận xét cho học viên..."
                  />
                </Form.Group>

                {gradeError && (
                  <Alert variant="danger" className="mb-3">
                    {gradeError}
                  </Alert>
                )}

                {submissionData.graded && (
                  <Alert variant="info" className="mb-3">
                    <strong>Đã chấm trước đó:</strong> Điểm {submissionData.grade}/100 bởi {submissionData.graded_by} 
                    vào {new Date(submissionData.graded_at).toLocaleString('vi-VN')}
                  </Alert>
                )}
              </Form>
            </>
          )}
        </ModalDialog.Body>
        <ModalDialog.Footer>
          <ActionRow>
            <Button variant="tertiary" onClick={handleCloseModal}>
              Đóng
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitGrade}
              disabled={grading || !submissionData}
            >
              {grading ? (
                <>
                  <Spinner animation="border" size="sm" className="mr-2" />
                  Đang lưu...
                </>
              ) : (
                'Lưu điểm và gửi thông báo'
              )}
            </Button>
          </ActionRow>
        </ModalDialog.Footer>
      </ModalDialog>
    </Container>
  );
};

CourseProgress.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default CourseProgress;
