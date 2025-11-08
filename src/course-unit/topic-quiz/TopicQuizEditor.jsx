import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card, Button, Form, Alert, Spinner,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import './TopicQuizEditor.scss';

const TopicQuizEditor = ({ unitLocator, blockId, unitTitle, onViewQuestions, quizCount }) => {
  console.log('📝 TopicQuizEditor rendering with:', { unitLocator, blockId, unitTitle, quizCount });
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [quizFile, setQuizFile] = useState(null);

  useEffect(() => {
    loadQuizData();
  }, [unitLocator]);

  const loadQuizData = async () => {
    try {
      setLoading(true);
      setError(null);
      const client = getAuthenticatedHttpClient();
      const response = await client.get(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/topic-quiz/get/${encodeURIComponent(unitLocator)}/`
      );
      
      if (response.data.success) {
        setQuizData(response.data.quiz);
      } else {
        setError(response.data.error || 'Could not load quiz data');
      }
    } catch (err) {
      console.error('Error loading topic quiz data:', err);
      if (err.response?.status === 404) {
        setQuizData(null); // No quiz yet
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Could not connect to server. Please check your network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadQuizFile = async (file) => {
    try {
      setUploading(true);
      setError(null);
      const client = getAuthenticatedHttpClient();
      const formData = new FormData();
      formData.append('quiz_file', file);

      const response = await client.post(
        `${getConfig().STUDIO_BASE_URL}/api/chalix/topic-quiz/upload/${encodeURIComponent(unitLocator)}/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        setSuccess(`Uploaded successfully! ${response.data.questions_count} questions added.`);
        setQuizFile(null);
        loadQuizData(); // Reload to show updated data
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to upload quiz file');
      }
    } catch (err) {
      console.error('Error uploading topic quiz file:', err);
      setError('Failed to upload quiz file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-4">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="topic-quiz-editor">
      {/* Success/Error messages */}
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

      <Card className="topic-quiz-card mb-4">
        <Card.Header>
          <h5 className="mb-0">📝 Topic Quiz Configuration</h5>
        </Card.Header>
        <Card.Body>
          {/* Info alert about topic quiz settings */}
          <Alert variant="info" className="mb-4">
            <strong>ℹ️ Topic Quiz Settings:</strong>
            <ul className="mb-0 mt-2">
              <li>Max attempts: <strong>1</strong></li>
              <li>Time limit: <strong>None</strong></li>
              <li>Correct answers shown: <strong>Immediately after submission</strong></li>
            </ul>
          </Alert>

          {/* Quiz upload/status section */}
          {quizData ? (
            <Alert variant="success" className="mb-4">
              <div className="d-flex justify-content-between align-items-center" style={{ gap: '1rem' }}>
                <div>
                  <strong>✅ Quiz uploaded</strong>
                  <div className="mt-1 text-muted">
                    {quizData.questions_count} questions
                  </div>
                </div>
                <div className="d-flex" style={{ gap: '16px' }}>
                  {onViewQuestions && quizData.questions_count > 0 && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={onViewQuestions}
                    >
                      📋 View Questions
                    </Button>
                  )}
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      document.querySelector('input.topic-quiz-file-input')?.click();
                    }}
                  >
                    📤 Upload New File
                  </Button>
                </div>
              </div>
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-4">
              <div className="d-flex justify-content-between align-items-center" style={{ gap: '1rem' }}>
                <div>
                  <strong>📋 Upload topic quiz</strong>
                  <div className="mt-1 text-muted">
                    Format: Column A: Question | Column B-E: Choices A-D | Column F: Correct Answer (A/B/C/D)
                  </div>
                </div>
                <div className="d-flex" style={{ gap: '16px' }}>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => {
                      document.querySelector('input.topic-quiz-file-input')?.click();
                    }}
                  >
                    📤 Upload Excel
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={async () => {
                      const { downloadQuizTemplate } = await import('../../course-outline/data/excelTemplateGenerator');
                      downloadQuizTemplate();
                    }}
                  >
                    📋 Download Template
                  </Button>
                </div>
              </div>
            </Alert>
          )}

          {/* Hidden file input */}
          <Form.Control
            type="file"
            accept=".xlsx,.xls"
            className="topic-quiz-file-input"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                await uploadQuizFile(file);
                e.target.value = ''; // Reset input
              }
            }}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </Card.Body>
      </Card>
    </div>
  );
};

TopicQuizEditor.propTypes = {
  unitLocator: PropTypes.string.isRequired,
  blockId: PropTypes.string.isRequired,
  unitTitle: PropTypes.string.isRequired,
  onViewQuestions: PropTypes.func,
  quizCount: PropTypes.number,
};

export default TopicQuizEditor;
