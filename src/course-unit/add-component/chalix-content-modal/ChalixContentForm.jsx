import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  Row,
  Col,
  ActionRow,
  Alert,
  Hyperlink,
} from '@openedx/paragon';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';

import { COMPONENT_TYPES } from '../../../generic/block-type-utils/constants';
import messages from './messages';

const ChalixContentForm = ({ contentType, onSubmit, onCancel }) => {
  const intl = useIntl();
  const [formData, setFormData] = useState({});
  const [questions, setQuestions] = useState([{ question: '', choices: [{ text: '', correct: false }] }]);
  const [errors, setErrors] = useState({});

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handleQuestionChange = useCallback((questionIndex, field, value) => {
    setQuestions(prev => prev.map((q, idx) => 
      idx === questionIndex ? { ...q, [field]: value } : q
    ));
  }, []);

  const handleChoiceChange = useCallback((questionIndex, choiceIndex, field, value) => {
    setQuestions(prev => prev.map((q, qIdx) => 
      qIdx === questionIndex 
        ? {
            ...q,
            choices: q.choices.map((c, cIdx) => 
              cIdx === choiceIndex ? { ...c, [field]: value } : c
            )
          }
        : q
    ));
  }, []);

  const addQuestion = useCallback(() => {
    setQuestions(prev => [...prev, { question: '', choices: [{ text: '', correct: false }] }]);
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const addChoice = useCallback((questionIndex) => {
    setQuestions(prev => prev.map((q, idx) => 
      idx === questionIndex 
        ? { ...q, choices: [...q.choices, { text: '', correct: false }] }
        : q
    ));
  }, []);

  const removeChoice = useCallback((questionIndex, choiceIndex) => {
    setQuestions(prev => prev.map((q, qIdx) => 
      qIdx === questionIndex 
        ? { ...q, choices: q.choices.filter((_, cIdx) => cIdx !== choiceIndex) }
        : q
    ));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title?.trim()) {
      newErrors.title = intl.formatMessage(messages.titleRequired);
    }

    switch (contentType) {
      case COMPONENT_TYPES.onlineClass:
        if (!formData.meetingLink?.trim()) {
          newErrors.meetingLink = intl.formatMessage(messages.meetingLinkRequired);
        }
        if (!formData.meetingTime?.trim()) {
          newErrors.meetingTime = intl.formatMessage(messages.meetingTimeRequired);
        }
        break;

      case COMPONENT_TYPES.unitVideo:
        if (!formData.videoUrl?.trim() && !formData.youtubeId?.trim()) {
          newErrors.video = intl.formatMessage(messages.videoSourceRequired);
        }
        break;

      case COMPONENT_TYPES.slide:
        if (!formData.fileUrl?.trim()) {
          newErrors.fileUrl = intl.formatMessage(messages.fileUrlRequired);
        }
        break;

      case COMPONENT_TYPES.quiz:
        if (questions.length === 0) {
          newErrors.questions = intl.formatMessage(messages.questionsRequired);
        } else {
          questions.forEach((q, qIdx) => {
            if (!q.question?.trim()) {
              newErrors[`question_${qIdx}`] = intl.formatMessage(messages.questionTextRequired);
            }
            if (q.choices.length < 2) {
              newErrors[`choices_${qIdx}`] = intl.formatMessage(messages.minimumChoicesRequired);
            }
            if (!q.choices.some(c => c.correct)) {
              newErrors[`correct_${qIdx}`] = intl.formatMessage(messages.correctAnswerRequired);
            }
          });
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, contentType, questions, intl]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const contentData = { title: formData.title };

    switch (contentType) {
      case COMPONENT_TYPES.onlineClass:
        contentData.meeting_link = formData.meetingLink;
        contentData.meeting_time = formData.meetingTime;
        contentData.duration = formData.duration || '';
        break;

      case COMPONENT_TYPES.unitVideo:
        contentData.video_url = formData.videoUrl || '';
        contentData.youtube_id = formData.youtubeId || '';
        contentData.download_video = formData.downloadVideo || false;
        break;

      case COMPONENT_TYPES.slide:
        contentData.file_url = formData.fileUrl;
        contentData.file_type = formData.fileType || 'pdf';
        break;

      case COMPONENT_TYPES.quiz:
        contentData.instructions = formData.instructions || 'Complete the following quiz:';
        contentData.questions = questions;
        break;

      default:
        break;
    }

    onSubmit(contentData);
  }, [formData, contentType, questions, validateForm, onSubmit]);

  const renderOnlineClassForm = () => (
    <>
      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.meetingLinkLabel} />
          <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="url"
          value={formData.meetingLink || ''}
          onChange={(e) => handleInputChange('meetingLink', e.target.value)}
          placeholder="https://zoom.us/j/... or https://meet.google.com/..."
          isInvalid={!!errors.meetingLink}
        />
        {errors.meetingLink && (
          <Form.Control.Feedback type="invalid">
            {errors.meetingLink}
          </Form.Control.Feedback>
        )}
      </Form.Group>

      <Row>
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              <FormattedMessage {...messages.meetingTimeLabel} />
              <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="datetime-local"
              value={formData.meetingTime || ''}
              onChange={(e) => handleInputChange('meetingTime', e.target.value)}
              isInvalid={!!errors.meetingTime}
            />
            {errors.meetingTime && (
              <Form.Control.Feedback type="invalid">
                {errors.meetingTime}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              <FormattedMessage {...messages.durationLabel} />
            </Form.Label>
            <Form.Control
              type="text"
              value={formData.duration || ''}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              placeholder="e.g., 1 hour"
            />
          </Form.Group>
        </Col>
      </Row>
    </>
  );

  const renderUnitVideoForm = () => (
    <>
      <Alert variant="info" className="mb-3">
        <FormattedMessage {...messages.videoSourceInfo} />
      </Alert>
      
      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.videoUrlLabel} />
        </Form.Label>
        <Form.Control
          type="url"
          value={formData.videoUrl || ''}
          onChange={(e) => handleInputChange('videoUrl', e.target.value)}
          placeholder="https://example.com/video.mp4"
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.youtubeIdLabel} />
        </Form.Label>
        <Form.Control
          type="text"
          value={formData.youtubeId || ''}
          onChange={(e) => handleInputChange('youtubeId', e.target.value)}
          placeholder="dQw4w9WgXcQ"
        />
        <Form.Text className="text-muted">
          <FormattedMessage {...messages.youtubeIdHelp} />
        </Form.Text>
      </Form.Group>

      {errors.video && (
        <Alert variant="danger">
          {errors.video}
        </Alert>
      )}

      <Form.Group>
        <Form.Check
          type="checkbox"
          label={intl.formatMessage(messages.downloadVideoLabel)}
          checked={formData.downloadVideo || false}
          onChange={(e) => handleInputChange('downloadVideo', e.target.checked)}
        />
      </Form.Group>
    </>
  );

  const renderSlideForm = () => (
    <>
      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.fileUrlLabel} />
          <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="url"
          value={formData.fileUrl || ''}
          onChange={(e) => handleInputChange('fileUrl', e.target.value)}
          placeholder="https://example.com/slides.pdf"
          isInvalid={!!errors.fileUrl}
        />
        {errors.fileUrl && (
          <Form.Control.Feedback type="invalid">
            {errors.fileUrl}
          </Form.Control.Feedback>
        )}
      </Form.Group>

      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.fileTypeLabel} />
        </Form.Label>
        <Form.Control
          as="select"
          value={formData.fileType || 'pdf'}
          onChange={(e) => handleInputChange('fileType', e.target.value)}
        >
          <option value="pdf">PDF</option>
          <option value="pptx">PowerPoint (PPTX)</option>
          <option value="other">Other</option>
        </Form.Control>
      </Form.Group>
    </>
  );

  const renderQuizForm = () => (
    <>
      <Form.Group>
        <Form.Label>
          <FormattedMessage {...messages.instructionsLabel} />
        </Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={formData.instructions || 'Complete the following quiz:'}
          onChange={(e) => handleInputChange('instructions', e.target.value)}
          placeholder="Enter quiz instructions..."
        />
      </Form.Group>

      <div className="quiz-questions-section">
        <h5 className="mb-3">
          <FormattedMessage {...messages.questionsLabel} />
          <span className="text-danger">*</span>
        </h5>

        {questions.map((question, qIdx) => (
          <div key={qIdx} className="question-form border p-3 mb-3 rounded">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Question {qIdx + 1}</h6>
              {questions.length > 1 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeQuestion(qIdx)}
                >
                  Remove
                </Button>
              )}
            </div>

            <Form.Group>
              <Form.Label>Question Text</Form.Label>
              <Form.Control
                type="text"
                value={question.question}
                onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)}
                placeholder="Enter question..."
                isInvalid={!!errors[`question_${qIdx}`]}
              />
              {errors[`question_${qIdx}`] && (
                <Form.Control.Feedback type="invalid">
                  {errors[`question_${qIdx}`]}
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <div className="choices-section">
              <Form.Label>Answer Choices</Form.Label>
              {question.choices.map((choice, cIdx) => (
                <div key={cIdx} className="choice-input d-flex align-items-center mb-2">
                  <Form.Check
                    type="radio"
                    name={`correct_${qIdx}`}
                    checked={choice.correct}
                    onChange={() => {
                      setQuestions(prev => prev.map((q, qIndex) => 
                        qIndex === qIdx 
                          ? {
                              ...q,
                              choices: q.choices.map((c, cIndex) => ({
                                ...c,
                                correct: cIndex === cIdx
                              }))
                            }
                          : q
                      ));
                    }}
                    className="me-2"
                  />
                  <Form.Control
                    type="text"
                    value={choice.text}
                    onChange={(e) => handleChoiceChange(qIdx, cIdx, 'text', e.target.value)}
                    placeholder={`Choice ${cIdx + 1}`}
                    className="me-2"
                  />
                  {question.choices.length > 1 && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => removeChoice(qIdx, cIdx)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => addChoice(qIdx)}
                className="mt-1"
              >
                Add Choice
              </Button>

              {errors[`choices_${qIdx}`] && (
                <div className="text-danger small mt-1">{errors[`choices_${qIdx}`]}</div>
              )}
              {errors[`correct_${qIdx}`] && (
                <div className="text-danger small mt-1">{errors[`correct_${qIdx}`]}</div>
              )}
            </div>
          </div>
        ))}

        <Button
          variant="outline-primary"
          onClick={addQuestion}
          className="mb-3"
        >
          Add Question
        </Button>

        {errors.questions && (
          <Alert variant="danger">
            {errors.questions}
          </Alert>
        )}
      </div>
    </>
  );

  const renderFormContent = () => {
    switch (contentType) {
      case COMPONENT_TYPES.onlineClass:
        return renderOnlineClassForm();
      case COMPONENT_TYPES.unitVideo:
        return renderUnitVideoForm();
      case COMPONENT_TYPES.slide:
        return renderSlideForm();
      case COMPONENT_TYPES.quiz:
        return renderQuizForm();
      default:
        return null;
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>
          <FormattedMessage {...messages.titleLabel} />
          <span className="text-danger">*</span>
        </Form.Label>
        <Form.Control
          type="text"
          value={formData.title || ''}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter content title..."
          isInvalid={!!errors.title}
        />
        {errors.title && (
          <Form.Control.Feedback type="invalid">
            {errors.title}
          </Form.Control.Feedback>
        )}
      </Form.Group>

      {renderFormContent()}

      <ActionRow className="mt-4">
        <Button variant="tertiary" onClick={onCancel}>
          <FormattedMessage {...messages.cancelButton} />
        </Button>
        <Button type="submit" variant="primary">
          <FormattedMessage {...messages.createButton} />
        </Button>
      </ActionRow>
    </Form>
  );
};

ChalixContentForm.propTypes = {
  contentType: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ChalixContentForm;
