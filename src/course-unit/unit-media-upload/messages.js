import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  // Upload actions
  selectFile: {
    id: 'course-authoring.unit.media-upload.select-file',
    defaultMessage: 'Select {mediaType} File',
    description: 'Button text to select a file for upload',
  },
  uploadFile: {
    id: 'course-authoring.unit.media-upload.upload',
    defaultMessage: 'Upload File',
    description: 'Button text to upload selected file',
  },
  uploading: {
    id: 'course-authoring.unit.media-upload.uploading',
    defaultMessage: 'Uploading...',
    description: 'Text shown during file upload',
  },
  
  // Drag and drop
  dragDropText: {
    id: 'course-authoring.unit.media-upload.drag-drop',
    defaultMessage: 'Drag and drop a {mediaType} file here or click to browse',
    description: 'Text shown in drag and drop area',
  },
  dragActiveText: {
    id: 'course-authoring.unit.media-upload.drag-active',
    defaultMessage: 'Drop the file here',
    description: 'Text shown when file is being dragged over drop zone',
  },

  // File info
  selectedFile: {
    id: 'course-authoring.unit.media-upload.selected-file',
    defaultMessage: 'Selected file: {filename}',
    description: 'Text showing selected filename',
  },
  fileSize: {
    id: 'course-authoring.unit.media-upload.file-size',
    defaultMessage: 'Size: {size}',
    description: 'Text showing file size',
  },

  // Progress
  uploadProgress: {
    id: 'course-authoring.unit.media-upload.progress',
    defaultMessage: 'Upload Progress: {progress}%',
    description: 'Upload progress label',
  },

  // Validation errors
  fileSizeError: {
    id: 'course-authoring.unit.media-upload.error.file-size',
    defaultMessage: 'File size must be less than {maxSize}MB',
    description: 'Error message for files that are too large',
  },
  fileTypeError: {
    id: 'course-authoring.unit.media-upload.error.file-type',
    defaultMessage: 'File type {extension} is not supported. Accepted types: {acceptedTypes}',
    description: 'Error message for unsupported file types',
  },
  uploadError: {
    id: 'course-authoring.unit.media-upload.error.upload',
    defaultMessage: 'Upload failed: {error}',
    description: 'Generic upload error message',
  },
  networkError: {
    id: 'course-authoring.unit.media-upload.error.network',
    defaultMessage: 'Network error occurred during upload. Please try again.',
    description: 'Network error message',
  },

  // Success messages
  uploadSuccess: {
    id: 'course-authoring.unit.media-upload.success',
    defaultMessage: 'File uploaded successfully!',
    description: 'Success message after file upload',
  },
  deleteSuccess: {
    id: 'course-authoring.unit.media-upload.delete.success',
    defaultMessage: 'File deleted successfully!',
    description: 'Success message after file deletion',
  },

  // Existing media
  existingMedia: {
    id: 'course-authoring.unit.media-upload.existing.title',
    defaultMessage: 'Existing {mediaType} Files',
    description: 'Title for existing media files section',
  },
  noExistingMedia: {
    id: 'course-authoring.unit.media-upload.existing.none',
    defaultMessage: 'No {mediaType} files uploaded yet.',
    description: 'Message when no existing media files',
  },
  deleteFile: {
    id: 'course-authoring.unit.media-upload.delete',
    defaultMessage: 'Delete file',
    description: 'Button text to delete a file',
  },
  confirmDelete: {
    id: 'course-authoring.unit.media-upload.delete.confirm',
    defaultMessage: 'Are you sure you want to delete this file?',
    description: 'Confirmation message for file deletion',
  },

  // File types
  video: {
    id: 'course-authoring.unit.media-upload.type.video',
    defaultMessage: 'video',
    description: 'Media type: video',
  },
  slide: {
    id: 'course-authoring.unit.media-upload.type.slide',
    defaultMessage: 'slide',
    description: 'Media type: slide',
  },
});

export default messages;