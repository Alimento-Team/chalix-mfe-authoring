import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  modalTitle: {
    id: 'course-authoring.course-unit.add-component.chalix.modal.title',
    defaultMessage: 'Add Chalix Content',
    description: 'Title for the Chalix content selection modal',
  },
  modalDescription: {
    id: 'course-authoring.course-unit.add-component.chalix.modal.description',
    defaultMessage: 'Choose the type of content you want to add to this unit:',
    description: 'Description text for the Chalix content selection modal',
  },
  configureTitle: {
    id: 'course-authoring.course-unit.add-component.chalix.configure.title',
    defaultMessage: 'Configure',
    description: 'Title prefix for the configuration step',
  },
  backButton: {
    id: 'course-authoring.course-unit.add-component.chalix.back',
    defaultMessage: 'Back',
    description: 'Back button text',
  },
  cancelButton: {
    id: 'course-authoring.course-unit.add-component.chalix.cancel',
    defaultMessage: 'Cancel',
    description: 'Cancel button text',
  },
  createButton: {
    id: 'course-authoring.course-unit.add-component.chalix.create',
    defaultMessage: 'Create Content',
    description: 'Create content button text',
  },
  
  // Form labels
  titleLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.title',
    defaultMessage: 'Content Title',
    description: 'Label for content title field',
  },
  meetingLinkLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.meetingLink',
    defaultMessage: 'Meeting Link',
    description: 'Label for meeting link field',
  },
  meetingTimeLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.meetingTime',
    defaultMessage: 'Meeting Time',
    description: 'Label for meeting time field',
  },
  durationLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.duration',
    defaultMessage: 'Duration',
    description: 'Label for duration field',
  },
  videoUrlLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.videoUrl',
    defaultMessage: 'Video URL',
    description: 'Label for video URL field',
  },
  youtubeIdLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.youtubeId',
    defaultMessage: 'YouTube Video ID',
    description: 'Label for YouTube ID field',
  },
  youtubeIdHelp: {
    id: 'course-authoring.course-unit.add-component.chalix.form.youtubeId.help',
    defaultMessage: 'The ID from a YouTube URL (e.g., for https://youtube.com/watch?v=dQw4w9WgXcQ, enter dQw4w9WgXcQ)',
    description: 'Help text for YouTube ID field',
  },
  downloadVideoLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.downloadVideo',
    defaultMessage: 'Allow video download',
    description: 'Label for download video checkbox',
  },
  fileUrlLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.fileUrl',
    defaultMessage: 'File URL',
    description: 'Label for file URL field',
  },
  fileTypeLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.fileType',
    defaultMessage: 'File Type',
    description: 'Label for file type field',
  },
  instructionsLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.instructions',
    defaultMessage: 'Quiz Instructions',
    description: 'Label for quiz instructions field',
  },
  questionsLabel: {
    id: 'course-authoring.course-unit.add-component.chalix.form.questions',
    defaultMessage: 'Questions',
    description: 'Label for questions section',
  },

  // Validation messages
  titleRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.title.required',
    defaultMessage: 'Content title is required',
    description: 'Validation message for required title field',
  },
  meetingLinkRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.meetingLink.required',
    defaultMessage: 'Meeting link is required',
    description: 'Validation message for required meeting link field',
  },
  meetingTimeRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.meetingTime.required',
    defaultMessage: 'Meeting time is required',
    description: 'Validation message for required meeting time field',
  },
  videoSourceRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.videoSource.required',
    defaultMessage: 'Either video URL or YouTube ID is required',
    description: 'Validation message for required video source',
  },
  fileUrlRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.fileUrl.required',
    defaultMessage: 'File URL is required',
    description: 'Validation message for required file URL field',
  },
  questionsRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.questions.required',
    defaultMessage: 'At least one question is required',
    description: 'Validation message for required questions',
  },
  questionTextRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.questionText.required',
    defaultMessage: 'Question text is required',
    description: 'Validation message for required question text',
  },
  minimumChoicesRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.choices.minimum',
    defaultMessage: 'At least 2 choices are required',
    description: 'Validation message for minimum choices requirement',
  },
  correctAnswerRequired: {
    id: 'course-authoring.course-unit.add-component.chalix.validation.correctAnswer.required',
    defaultMessage: 'One correct answer must be selected',
    description: 'Validation message for required correct answer',
  },

  // Info messages
  videoSourceInfo: {
    id: 'course-authoring.course-unit.add-component.chalix.info.videoSource',
    defaultMessage: 'Provide either a direct video URL or a YouTube video ID. YouTube videos will be embedded using the platform\'s video player.',
    description: 'Information about video source options',
  },
});

export default messages;
