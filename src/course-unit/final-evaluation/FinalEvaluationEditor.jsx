import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Form, Alert, Spinner, Badge, Toast,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import './FinalEvaluationEditor.scss';

const FinalEvaluationEditor = ({ courseId, blockId, unitTitle, onViewQuestions, quizCount }) => {
  console.log('🎓 FinalEvaluationEditor rendering with:', { courseId, blockId, unitTitle, quizCount });
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [practicalQuestion, setPracticalQuestion] = useState('');
  const [quizFile, setQuizFile] = useState(null);
  const [quizTimeLimit, setQuizTimeLimit] = useState('');
  const [quizPassingScore, setQuizPassingScore] = useState('');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('0');

  // Check if this is a final evaluation unit
  const isFinalEvaluationUnit = unitTitle && (
    unitTitle.includes('Kiểm tra cuối khoá') ||
    unitTitle.includes('kiểm tra cuối khóa') ||
    unitTitle.includes('Bài kiểm tra')
  );

  useEffect(() => {
    if (isFinalEvaluationUnit) {
      loadEvaluationData();
    }
  }, [courseId, isFinalEvaluationUnit]);

  const loadEvaluationData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const client = getAuthenticatedHttpClient();
      const response = await client.get(`${getConfig().STUDIO_BASE_URL}/api/chalix/dashboard/evaluation/get/${courseId}/`);
      
      if (response.data.success) {
        // Transform backend response to expected format
        const backendData = response.data.evaluation || {};
        const transformedData = {
          has_practical: backendData.evaluation_type === 'practical',
          has_quiz: backendData.evaluation_type === 'quiz',
          practical_evaluation: backendData.evaluation_type === 'practical' ? {
            practical_question: backendData.practical_question || ''
          } : null,
          quiz_evaluation: backendData.evaluation_type === 'quiz' ? {
            quiz_time_limit: backendData.quiz_time_limit,
            quiz_passing_score: backendData.quiz_passing_score,
            quiz_max_attempts: backendData.quiz_max_attempts,
            has_quiz_file: backendData.has_quiz_file,
            quiz_file_name: backendData.quiz_file_name
          } : null
        };
        
        setEvaluationData(transformedData);
        
        if (transformedData.practical_evaluation) {
          setPracticalQuestion(transformedData.practical_evaluation.practical_question || '');
        }
        // Populate quiz config fields if present
        if (transformedData.quiz_evaluation) {
          const q = transformedData.quiz_evaluation;
          setQuizTimeLimit(q.quiz_time_limit != null ? String(q.quiz_time_limit) : '');
          setQuizPassingScore(q.quiz_passing_score != null ? String(q.quiz_passing_score) : '');
          // Use '0' to represent unlimited in the select control
          setQuizMaxAttempts(typeof q.quiz_max_attempts === 'number' ? String(q.quiz_max_attempts) : '0');
        }
      } else {
        setError(response.data.error || 'Không thể tải dữ liệu kiểm tra. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error loading evaluation data:', err);
      // More user-friendly error message
      if (err.response?.status === 404) {
        setError('Không tìm thấy dữ liệu kiểm tra cho khóa học này. Vui lòng kiểm tra cấu hình khóa học.');
      } else if (err.response?.status >= 500) {
        setError('Lỗi máy chủ. Vui lòng thử lại sau.');
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
      }
    } finally {
      setLoading(false);
    }
  };

  const savePracticalQuestion = async () => {
    try {
      setSaving(true);
      const client = getAuthenticatedHttpClient();
      const response = await client.post(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/dashboard/evaluation/update/${courseId}/`,
        { practical_question: practicalQuestion }
      );

      if (response.data.success) {
        setSuccess('Practical question saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to save practical question');
      }
    } catch (err) {
      console.error('Error saving practical question:', err);
      setError('Failed to save practical question');
    } finally {
      setSaving(false);
    }
  };

  const uploadQuizFile = async () => {
    if (!quizFile) {
      setError('Please select a quiz file');
      return;
    }

    try {
      setSaving(true);
      const client = getAuthenticatedHttpClient();
      const formData = new FormData();
      formData.append('quiz_file', quizFile);

      const response = await client.post(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/dashboard/evaluation/upload-quiz/${courseId}/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setSuccess('Quiz file uploaded successfully!');
        setQuizFile(null);
        loadEvaluationData(); // Reload to show updated data
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to upload quiz file');
      }
    } catch (err) {
      console.error('Error uploading quiz file:', err);
      setError('Failed to upload quiz file');
    } finally {
      setSaving(false);
    }
  };

  const saveQuizConfiguration = async () => {
    try {
      setSaving(true);
      const client = getAuthenticatedHttpClient();

      // Validate inputs minimally before sending
      const payload = {
        quiz_time_limit: quizTimeLimit ? parseInt(quizTimeLimit, 10) : null,
        quiz_passing_score: quizPassingScore ? parseFloat(quizPassingScore) : null,
        quiz_max_attempts: quizMaxAttempts ? parseInt(quizMaxAttempts, 10) : 0,
      };

      const response = await client.post(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/dashboard/evaluation/update/${courseId}/`,
        payload
      );

      if (response.data.success) {
        setSuccess('Quiz configuration saved successfully!');
        // Refresh evaluation data to pick up any changes
        await loadEvaluationData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to save quiz configuration');
      }
    } catch (err) {
      console.error('Error saving quiz configuration:', err);
      setError('Failed to save quiz configuration');
    } finally {
      setSaving(false);
    }
  };

  if (!isFinalEvaluationUnit) {
    return null;
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-4">
        <Spinner animation="border" />
      </div>
    );
  }

  // Handle error state - show friendly error with retry option
  if (error && !evaluationData) {
    return (
      <Alert variant="danger" className="mb-3">
        <Alert.Heading>Không thể tải cấu hình kiểm tra</Alert.Heading>
        <p className="mb-2">{error}</p>
        <Button variant="outline-danger" size="sm" onClick={loadEvaluationData}>
          🔄 Thử lại
        </Button>
      </Alert>
    );
  }

  // No evaluation configured
  if (evaluationData && !evaluationData.has_practical && !evaluationData.has_quiz) {
    return (
      <Alert variant="warning">
        <Alert.Heading>⚠️ Chưa có loại kiểm tra nào được thiết lập</Alert.Heading>
        <p className="mb-0">
          Khóa học này chưa được cấu hình để sử dụng kiểm tra cuối khóa. 
          Vui lòng vào <strong>Cài đặt khóa học</strong> để chọn loại kiểm tra (Nộp bài thu hoạch hoặc Làm bài trắc nghiệm).
        </p>
      </Alert>
    );
  }

  return (
    <div>
      {/* Success/Error toast messages */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible className="mb-3">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible className="mb-3">
          {success}
        </Alert>
      )}

      <Card className="final-evaluation-editor mb-4">
        <Card.Header 
          title="🎓 Cấu hình bài kiểm tra cuối khóa"
        />
        <Card.Body>
          {evaluationData && (
            <>
              {/* Practical Assignment Configuration */}
              {evaluationData.has_practical && (
                <div className="p-3 border rounded">
                  <Form.Group className="mb-3">
                    <Form.Label>Yêu cầu bài tập:</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={practicalQuestion}
                      onChange={(e) => setPracticalQuestion(e.target.value)}
                      placeholder="Nhập câu hỏi hoặc hướng dẫn cho bài thực hành..."
                    />
                    <Form.Text className="text-muted">
                      Học viên sẽ thấy nội dung này và nộp file kết quả (DOCX, PPTX, PDF).
                    </Form.Text>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    onClick={savePracticalQuestion}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Đang lưu...
                      </>
                    ) : (
                      '💾 Lưu câu hỏi'
                    )}
                  </Button>
                </div>
              )}

              {/* Quiz Configuration */}
              {evaluationData.has_quiz && (
                <div className="p-3 border rounded">
                  {/* Quiz summary and actions - shown only when quiz file exists */}
                  {evaluationData.quiz_evaluation?.has_quiz_file && (
                      <Alert variant="success" className="mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>✅ Đã tải lên đề thi trắc nghiệm</strong>
                            <div className="mt-1 text-muted">
                              {quizCount ? `${quizCount} câu hỏi` : 'File'}: <strong>{evaluationData.quiz_evaluation.quiz_file_name}</strong>
                            </div>
                          </div>
                          <div className="d-flex" style={{ gap: '16px' }}>
                            {onViewQuestions && (
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={onViewQuestions}
                              >
                                📋 Xem câu hỏi
                              </Button>
                            )}
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={() => {
                                // Trigger file input for replacing quiz
                                document.querySelector('input[type="file"][accept=".xlsx,.xls"]')?.click();
                              }}
                            >
                              📋 Tải file mới
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    )}

                    {/* When no quiz file - show upload options */}
                    {!evaluationData.quiz_evaluation?.has_quiz_file && (
                      <Alert variant="info" className="mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>📋 Tải lên đề thi trắc nghiệm</strong>
                            <div className="mt-1 text-muted">
                              Định dạng: Cột A: Câu hỏi | Cột B-E: Đáp án A-D | Cột F: Đáp án đúng (A/B/C/D)
                            </div>
                          </div>
                          <div className="d-flex" style={{ gap: '16px' }}>
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                document.querySelector('input[type="file"][accept=".xlsx,.xls"]')?.click();
                              }}
                            >
                              📤 Tải lên Excel
                            </Button>
                            <Button 
                              variant="outline-secondary" 
                              size="sm"
                              onClick={async () => {
                                const { downloadQuizTemplate } = await import('../../course-outline/data/excelTemplateGenerator');
                                downloadQuizTemplate();
                              }}
                            >
                              📋 Tải template
                            </Button>
                          </div>
                        </div>
                      </Alert>
                    )}

                    {/* Quiz configuration section */}
                    <div className="mb-4">
                      <h6 className="mb-3">Cấu hình thông số</h6>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Thời gian làm bài (phút)</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={1440}
                          placeholder="Để trống nếu không giới hạn"
                          value={quizTimeLimit}
                          onChange={(e) => setQuizTimeLimit(e.target.value)}
                        />
                        <Form.Text className="text-muted">Để trống nếu không muốn giới hạn thời gian</Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Điểm tối thiểu để đạt (%)</Form.Label>
                        <Form.Control
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="Ví dụ: 70"
                          value={quizPassingScore}
                          onChange={(e) => setQuizPassingScore(e.target.value)}
                        />
                        <Form.Text className="text-muted">Điểm phần trăm tối thiểu để vượt qua (0-100)</Form.Text>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Số lần làm bài</Form.Label>
                        <Form.Control
                          as="select"
                          value={quizMaxAttempts}
                          onChange={(e) => setQuizMaxAttempts(e.target.value)}
                        >
                          <option value="1">1 lần</option>
                          <option value="3">3 lần</option>
                          <option value="0">Không giới hạn</option>
                        </Form.Control>
                        <Form.Text className="text-muted">Số lần học viên được phép làm bài</Form.Text>
                      </Form.Group>

                      <Button variant="success" onClick={saveQuizConfiguration} disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Đang lưu...
                          </>
                        ) : (
                          '💾 Lưu cấu hình'
                        )}
                      </Button>
                    </div>

                    {/* Hidden file input for quiz upload/replace - triggered by buttons in alert above */}
                    <Form.Control
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setQuizFile(file);
                          // Auto-upload when file is selected
                          try {
                            setSaving(true);
                            const client = getAuthenticatedHttpClient();
                            const formData = new FormData();
                            formData.append('quiz_file', file);

                            const response = await client.post(
                              `${getConfig().STUDIO_BASE_URL}/api/chalix/dashboard/evaluation/upload-quiz/${courseId}/`,
                              formData,
                              { headers: { 'Content-Type': 'multipart/form-data' } }
                            );

                            if (response.data.success) {
                              setSuccess('Tải lên file câu hỏi thành công!');
                              setQuizFile(null);
                              loadEvaluationData(); // Reload to show updated data
                              setTimeout(() => setSuccess(null), 3000);
                            } else {
                              setError(response.data.error || 'Không thể tải lên file');
                            }
                          } catch (err) {
                            console.error('Error uploading quiz file:', err);
                            setError('Không thể tải lên file. Vui lòng thử lại.');
                          } finally {
                            setSaving(false);
                            // Reset file input
                            e.target.value = '';
                          }
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

FinalEvaluationEditor.propTypes = {
  courseId: PropTypes.string.isRequired,
  blockId: PropTypes.string.isRequired,
  unitTitle: PropTypes.string.isRequired,
  onViewQuestions: PropTypes.func,
  quizCount: PropTypes.number,
};

export default FinalEvaluationEditor;