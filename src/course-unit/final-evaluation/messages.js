import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  evaluationEditorTitle: {
    id: 'course-authoring.final-evaluation.editor.title',
    defaultMessage: 'Final Evaluation Management',
    description: 'Title for the final evaluation editor',
  },
  evaluationEditorSubtitle: {
    id: 'course-authoring.final-evaluation.editor.subtitle', 
    defaultMessage: 'Set up final evaluation content for learners',
    description: 'Subtitle for the final evaluation editor',
  },
  practicalQuestionLabel: {
    id: 'course-authoring.final-evaluation.practical.question.label',
    defaultMessage: 'Practical Assignment Question',
    description: 'Label for practical question input',
  },
  practicalQuestionPlaceholder: {
    id: 'course-authoring.final-evaluation.practical.question.placeholder',
    defaultMessage: 'Enter the question or instructions for the practical assignment...',
    description: 'Placeholder text for practical question input',
  },
  practicalQuestionHelp: {
    id: 'course-authoring.final-evaluation.practical.question.help',
    defaultMessage: 'Learners will see this content and submit file results (DOCX, PPTX, PDF).',
    description: 'Help text for practical question',
  },
  quizFileLabel: {
    id: 'course-authoring.final-evaluation.quiz.file.label',
    defaultMessage: 'Upload Excel Quiz File',
    description: 'Label for quiz file upload',
  },
  quizFileHelp: {
    id: 'course-authoring.final-evaluation.quiz.file.help',
    defaultMessage: 'Required format: Column A: Question, Columns B-E: Answers A-D, Column F: Correct Answer (A/B/C/D)',
    description: 'Help text for quiz file format',
  },
  saveButton: {
    id: 'course-authoring.final-evaluation.save.button',
    defaultMessage: 'Save Changes',
    description: 'Save button text',
  },
  uploadButton: {
    id: 'course-authoring.final-evaluation.upload.button',
    defaultMessage: 'Upload File',
    description: 'Upload button text',
  },
  savingText: {
    id: 'course-authoring.final-evaluation.saving.text',
    defaultMessage: 'Saving...',
    description: 'Text shown when saving',
  },
  uploadingText: {
    id: 'course-authoring.final-evaluation.uploading.text',
    defaultMessage: 'Uploading...',
    description: 'Text shown when uploading',
  },
  successSave: {
    id: 'course-authoring.final-evaluation.success.save',
    defaultMessage: 'Changes saved successfully!',
    description: 'Success message after saving',
  },
  successUpload: {
    id: 'course-authoring.final-evaluation.success.upload',
    defaultMessage: 'File uploaded successfully!',
    description: 'Success message after uploading',
  },
  errorLoad: {
    id: 'course-authoring.final-evaluation.error.load',
    defaultMessage: 'Failed to load evaluation data',
    description: 'Error message when loading fails',
  },
  errorSave: {
    id: 'course-authoring.final-evaluation.error.save',
    defaultMessage: 'Failed to save changes',
    description: 'Error message when saving fails',
  },
  errorUpload: {
    id: 'course-authoring.final-evaluation.error.upload',
    defaultMessage: 'Failed to upload file',
    description: 'Error message when upload fails',
  },
});

export default messages;