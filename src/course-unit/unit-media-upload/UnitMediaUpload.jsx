import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Button, 
  Form, 
  Alert, 
  ProgressBar, 
  Card,
  Row,
  Col,
  Badge 
} from '@openedx/paragon';
import { 
  CloudUpload as UploadIcon,
  VideoFile as VideoIcon,
  Description as DocumentIcon,
  Delete as DeleteIcon
} from '@openedx/paragon/icons';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import { getUnitMedia, uploadUnitMedia, deleteUnitMedia } from '../data/api';
import messages from './messages';

const UnitMediaUpload = ({ 
  unitId, 
  courseId, 
  mediaType, // 'video' or 'slide'
  onUploadComplete
}) => {
  const intl = useIntl();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const acceptedTypes = mediaType === 'video' 
    ? '.mp4,.mov,.avi,.wmv,.mkv'
    : '.pdf,.pptx,.ppt';

  const maxSize = mediaType === 'video' ? 500 * 1024 * 1024 : 100 * 1024 * 1024; // 500MB for video, 100MB for slides

  // Fetch existing media files for this unit
  useEffect(() => {
    const fetchMediaFiles = async () => {
      setLoading(true);
      try {
        const response = await getUnitMedia(unitId, mediaType);
        setMediaFiles(response.results || []);
      } catch (error) {
        console.error('Failed to fetch media files:', error);
        setUploadError('Failed to load existing media files');
      } finally {
        setLoading(false);
      }
    };

    if (unitId && mediaType) {
      fetchMediaFiles();
    }
  }, [unitId, mediaType]);

  const validateFile = (file) => {
    const errors = [];
    
    if (file.size > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      errors.push(intl.formatMessage(messages.fileSizeError, { maxSize: maxSizeMB }));
    }

    const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!acceptedTypes.includes(fileExtension)) {
      errors.push(intl.formatMessage(messages.fileTypeError, { 
        extension: fileExtension, 
        acceptedTypes 
      }));
    }

    return errors;
  };

  const handleFileSelect = useCallback((file) => {
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setUploadError(validationErrors.join('. '));
      return;
    }
    
    setSelectedFile(file);
    setUploadError('');
  }, [acceptedTypes, maxSize]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const response = await uploadUnitMedia(
        unitId, 
        courseId, 
        mediaType, 
        selectedFile, 
        selectedFile.name
      );
      
      setSelectedFile(null);
      setUploading(false);
      setUploadProgress(0);
      
      // Refresh the media files list
      const updatedResponse = await getUnitMedia(unitId, mediaType);
      setMediaFiles(updatedResponse.results || []);
      
      if (onUploadComplete) {
        onUploadComplete(response);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeExistingMedia = async (mediaId) => {
    try {
      await deleteUnitMedia(unitId, mediaType, mediaId);
      
      // Refresh the media files list
      const updatedResponse = await getUnitMedia(unitId, mediaType);
      setMediaFiles(updatedResponse.results || []);
      
      if (onUploadComplete) {
        onUploadComplete(null); // Trigger refresh
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setUploadError(error.message || 'Failed to delete media');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMediaIcon = (type) => {
    return type === 'video' ? VideoIcon : DocumentIcon;
  };

  return (
    <div className="unit-media-upload">
      <Card className="mb-3">
        <Card.Header>
          <h5 className="mb-0">
            <FormattedMessage 
              {...messages.existingMedia} 
              values={{ mediaType: intl.formatMessage(messages[mediaType]) }} 
            />
          </h5>
        </Card.Header>
        <Card.Body>
          {/* Show existing media */}
          {loading ? (
            <div className="text-center p-3">Loading media files...</div>
          ) : mediaFiles.length > 0 ? (
            <div className="mb-3">
              <h6>
                <FormattedMessage 
                  {...messages.existingMedia} 
                  values={{ mediaType: intl.formatMessage(messages[mediaType]) }} 
                />
              </h6>
              {mediaFiles.map((media) => {
                const MediaIcon = getMediaIcon(mediaType);
                return (
                  <div key={media.id} className="d-flex align-items-center justify-content-between border p-2 rounded mb-2">
                    <div className="d-flex align-items-center">
                      <MediaIcon className="me-2" />
                      <div>
                        <div className="fw-bold">{media.displayName || media.fileName}</div>
                        <small className="text-muted">
                          <FormattedMessage 
                            {...messages.fileSize} 
                            values={{ size: formatFileSize(media.fileSize) }} 
                          /> • {media.fileType}
                        </small>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      iconBefore={DeleteIcon}
                      onClick={() => removeExistingMedia(media.id)}
                      title={intl.formatMessage(messages.deleteFile)}
                    >
                      <FormattedMessage {...messages.deleteFile} />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted text-center p-3">
              No {mediaType} files uploaded yet
            </div>
          )}

          {/* Upload area */}
          <div
            className={`border-2 border-dashed p-4 text-center ${
              dragActive ? 'border-primary bg-light' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <>
                <UploadIcon className="mb-2" size="lg" />
                <p className="mb-2">
                  {dragActive ? (
                    <FormattedMessage {...messages.dragActiveText} />
                  ) : (
                    <FormattedMessage 
                      {...messages.dragDropText} 
                      values={{ mediaType: intl.formatMessage(messages[mediaType]) }} 
                    />
                  )}
                </p>
                <Form.Control
                  type="file"
                  accept={acceptedTypes}
                  onChange={handleFileChange}
                  className="d-none"
                  id={`file-input-${mediaType}`}
                />
                <Button
                  as="label"
                  htmlFor={`file-input-${mediaType}`}
                  variant="outline-primary"
                >
                  <FormattedMessage 
                    {...messages.selectFile} 
                    values={{ mediaType: intl.formatMessage(messages[mediaType]) }} 
                  />
                </Button>
                <p className="small text-muted mt-2">
                  Accepted formats: {acceptedTypes} • Max size: {Math.floor(maxSize / (1024 * 1024))}MB
                </p>
              </>
            ) : (
              <div>
                <h6>
                  <FormattedMessage 
                    {...messages.selectedFile} 
                    values={{ filename: selectedFile.name }} 
                  />
                </h6>
                <p className="small text-muted mb-3">
                  <FormattedMessage 
                    {...messages.fileSize} 
                    values={{ size: formatFileSize(selectedFile.size) }} 
                  />
                </p>
                
                {uploading ? (
                  <div>
                    <ProgressBar 
                      now={uploadProgress} 
                      label={`${uploadProgress}%`} 
                      className="mb-2" 
                      aria-label={intl.formatMessage(messages.uploadProgress, { progress: uploadProgress })}
                    />
                    <p className="small">
                      <FormattedMessage {...messages.uploading} />
                    </p>
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="primary"
                      onClick={uploadFile}
                      className="me-2"
                    >
                      <FormattedMessage {...messages.uploadFile} />
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => setSelectedFile(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {uploadError && (
            <Alert variant="danger" className="mt-3">
              {uploadError}
            </Alert>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

UnitMediaUpload.propTypes = {
  unitId: PropTypes.string.isRequired,
  courseId: PropTypes.string.isRequired,
  mediaType: PropTypes.oneOf(['video', 'slide']).isRequired,
  onUploadComplete: PropTypes.func,
};

export default UnitMediaUpload;