import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Form, Alert, Spinner, Badge, Tabs, Tab, Toast,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { useIntl } from '@edx/frontend-platform/i18n';
import messages from './messages';
import './FinalEvaluationEditor.scss';

const FinalEvaluationEditor = ({ courseId, blockId, unitTitle }) => {
  console.log('🎓 FinalEvaluationEditor rendering with:', { courseId, blockId, unitTitle });
  
  const intl = useIntl();
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [practicalQuestion, setPracticalQuestion] = useState('');
  const [quizFile, setQuizFile] = useState(null);

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
      const client = getAuthenticatedHttpClient();
      const response = await client.get(`${getConfig().STUDIO_BASE_URL}/api/chalix/evaluation/get/${courseId}/`);
      
      if (response.data.success) {
        setEvaluationData(response.data);
        if (response.data.practical_evaluation) {
          setPracticalQuestion(response.data.practical_evaluation.practical_question || '');
        }
      } else {
        setError(response.data.error || 'Failed to load evaluation data');
      }
    } catch (err) {
      console.error('Error loading evaluation data:', err);
      setError('Failed to load evaluation data');
    } finally {
      setLoading(false);
    }
  };

  const savePracticalQuestion = async () => {
    try {
      setSaving(true);
      const client = getAuthenticatedHttpClient();
      const response = await client.post(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/evaluation/update/${courseId}/`,
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
        `${getConfig().STUDIO_BASE_URL}/api/chalix/evaluation/upload-quiz/${courseId}/`,
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

  if (!isFinalEvaluationUnit) {
    return null;
  }

  if (loading) {
    return (
      <Card className="final-evaluation-editor">
        <Card.Header title="Quản lý Kiểm tra cuối khóa" />
        <Card.Body>
          <div className="d-flex justify-content-center p-4">
            <Spinner animation="border" />
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Temporary visual indicator */}
      <Alert variant="info" className="mb-3">
        <strong>🎯 FINAL EVALUATION EDITOR ACTIVE</strong> - This is the custom final evaluation layout
      </Alert>
      
      <Card className="final-evaluation-editor mb-4">
        <Card.Header 
          title="🎓 Quản lý Kiểm tra cuối khóa"
          subtitle="Thiết lập nội dung bài kiểm tra cuối khóa cho học viên"
        />
        <Card.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
            {success}
          </Alert>
        )}

        {evaluationData && (
          <>
            {/* Evaluation Types Info */}
            <div className="mb-3">
              <h6>Loại hình kiểm tra có sẵn:</h6>
              <div className="d-flex gap-2">
                {evaluationData.has_practical && (
                  <Badge variant="primary">📝 Nộp bài thu hoạch</Badge>
                )}
                {evaluationData.has_quiz && (
                  <Badge variant="secondary">📊 Làm bài trắc nghiệm</Badge>
                )}
                {!evaluationData.has_practical && !evaluationData.has_quiz && (
                  <Badge variant="warning">⚠️ Chưa có loại kiểm tra nào được thiết lập</Badge>
                )}
              </div>
            </div>

            <Tabs variant="tabs" className="mb-3">
              {/* Practical Assignment Tab */}
              {evaluationData.has_practical && (
                <Tab eventKey="practical" title="📝 Nộp bài thu hoạch">
                  <div className="p-3">
                    <h6>Câu hỏi thực hành</h6>
                    <p className="text-muted small">
                      Nhập yêu cầu hoặc hướng dẫn cho bài tập thực hành mà học viên cần thực hiện.
                    </p>
                    
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
                </Tab>
              )}

              {/* Quiz Tab */}
              {evaluationData.has_quiz && (
                <Tab eventKey="quiz" title="📊 Làm bài trắc nghiệm">
                  <div className="p-3">
                    <h6>Quản lý bài trắc nghiệm</h6>
                    
                    {evaluationData.quiz_evaluation?.has_quiz_file ? (
                      <Alert variant="info">
                        <strong>File hiện tại:</strong> {evaluationData.quiz_evaluation.quiz_file_name}
                        <div className="mt-2">
                          <Button variant="outline-primary" size="sm">
                            Xem trước câu hỏi
                          </Button>
                        </div>
                      </Alert>
                    ) : (
                      <Alert variant="warning">
                        Chưa có file câu hỏi nào được tải lên.
                      </Alert>
                    )}

                    <Form.Group className="mb-3">
                      <Form.Label>Tải lên file Excel câu hỏi:</Form.Label>
                      <Form.Control
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setQuizFile(e.target.files[0])}
                      />
                      <Form.Text className="text-muted">
                        <strong>Định dạng yêu cầu:</strong> Cột A: Câu hỏi, Cột B-E: Đáp án A-D, Cột F: Đáp án đúng (A/B/C/D)
                      </Form.Text>
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        onClick={uploadQuizFile}
                        disabled={!quizFile || saving}
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Đang tải lên...
                          </>
                        ) : (
                          '📤 Tải lên file'
                        )}
                      </Button>
                      
                      <Button variant="outline-secondary" size="sm">
                        📋 Tải template Excel
                      </Button>
                    </div>
                  </div>
                </Tab>
              )}
            </Tabs>

            {/* No evaluation types message */}
            {!evaluationData.has_practical && !evaluationData.has_quiz && (
              <Alert variant="warning">
                <Alert.Heading>Chưa có loại kiểm tra nào được thiết lập</Alert.Heading>
                <p>
                  Khóa học này chưa được cấu hình để sử dụng kiểm tra cuối khóa. 
                  Vui lòng liên hệ với quản trị viên để thiết lập loại kiểm tra phù hợp.
                </p>
              </Alert>
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
};

export default FinalEvaluationEditor;