import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

import { COMPONENT_TYPES } from '../../../generic/block-type-utils/constants';

const CHALIX_CONTENT_TYPES = {
  [COMPONENT_TYPES.onlineClass]: {
    displayName: 'Lớp Học Trực Tuyến',
    description: 'Buổi học trực tuyến với liên kết cuộc họp',
    icon: '📹',
    color: '#00AAED',
  },
  [COMPONENT_TYPES.unitVideo]: {
    displayName: 'Video Bài Học',
    description: 'Video bài giảng đã ghi sẵn',
    icon: '🎬',
    color: '#358F0A',
  },
  [COMPONENT_TYPES.slide]: {
    displayName: 'Slide Bài Học',
    description: 'Slide thuyết trình (PDF/PPTX)',
    icon: '📊',
    color: '#28a745',
  },
  [COMPONENT_TYPES.quiz]: {
    displayName: 'Bài Kiểm Tra',
    description: 'Bài kiểm tra tương tác',
    icon: '❓',
    color: '#FF6B35',
  },
};

const OnlineClassForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    meetingUrl: '',
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc';
    }
    
    if (!formData.meetingUrl.trim()) {
      newErrors.meetingUrl = 'Đường dẫn lớp học là bắt buộc';
    } else if (!formData.meetingUrl.match(/^https?:\/\/.+/)) {
      newErrors.meetingUrl = 'Vui lòng nhập đường dẫn hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Tiêu Đề Lớp Học *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Nhập tiêu đề cho lớp học trực tuyến của bạn"
            style={{
              width: '100%',
              padding: '10px',
              border: errors.title ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            autoFocus
          />
          {errors.title && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
              {errors.title}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Đường Dẫn Lớp Học *
          </label>
          <input
            type="url"
            value={formData.meetingUrl}
            onChange={(e) => handleInputChange('meetingUrl', e.target.value)}
            placeholder="https://zoom.us/j/... hoặc https://meet.google.com/..."
            style={{
              width: '100%',
              padding: '10px',
              border: errors.meetingUrl ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          {errors.meetingUrl && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
              {errors.meetingUrl}
            </div>
          )}
          <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
            Nhập liên kết Zoom, Google Meet, hoặc nền tảng hội nghị trực tuyến khác
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #eee',
          paddingTop: '20px',
          marginTop: '30px'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Tạo Lớp Học Trực Tuyến
          </button>
        </div>
      </form>
    </div>
  );
};

const SimpleContentForm = ({ contentType, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const config = CHALIX_CONTENT_TYPES[contentType];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({ 
        title: title.trim(),
        contentType: contentType
      });
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px', color: config.color }}>
        Cấu Hình {config.displayName}
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Tiêu Đề *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Nhập tiêu đề ${config.displayName.toLowerCase()}`}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            autoFocus
            required
          />
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #eee',
          paddingTop: '20px',
          marginTop: '30px'
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Hủy
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: config.color,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Tạo {config.displayName}
          </button>
        </div>
      </form>
    </div>
  );
};

const ChalixContentModal = ({
  isOpen,
  onClose,
  onCreateContent,
  parentLocator,
  initialSelectedType = null,
}) => {
  const [selectedType, setSelectedType] = useState(initialSelectedType);
  const [step, setStep] = useState(initialSelectedType ? 'configure' : 'select');

  // Update state when initialSelectedType changes
  React.useEffect(() => {
    if (initialSelectedType) {
      setSelectedType(initialSelectedType);
      setStep('configure');
    } else {
      setSelectedType(null);
      setStep('select');
    }
  }, [initialSelectedType]);

  const handleTypeSelect = useCallback((contentType) => {
    setSelectedType(contentType);
    setStep('configure');
  }, []);

  const handleBack = useCallback(() => {
    if (initialSelectedType) {
      // If we came from a direct button click, close the modal
      onClose();
    } else {
      // If we came from the general modal, go back to selection
      setSelectedType(null);
      setStep('select');
    }
  }, [initialSelectedType, onClose]);

  const handleCreate = useCallback((contentData) => {
    onCreateContent(selectedType, contentData);
    setSelectedType(initialSelectedType || null);
    setStep(initialSelectedType ? 'configure' : 'select');
    onClose();
  }, [selectedType, onCreateContent, onClose, initialSelectedType]);

  const handleModalClose = useCallback(() => {
    setSelectedType(initialSelectedType || null);
    setStep(initialSelectedType ? 'configure' : 'select');
    onClose();
  }, [onClose, initialSelectedType]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        minWidth: '500px',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px 20px 0 20px',
          borderBottom: step === 'select' ? '1px solid #eee' : 'none'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            {step === 'select'
              ? 'Thêm Nội Dung Chalix'
              : `Cấu Hình ${CHALIX_CONTENT_TYPES[selectedType]?.displayName}`
            }
          </h2>
          <button 
            onClick={handleModalClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        {step === 'select' && (
          <div style={{ padding: '20px' }}>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Chọn loại nội dung bạn muốn thêm vào bài học này:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              {Object.entries(CHALIX_CONTENT_TYPES).map(([type, config]) => (
                <div
                  key={type}
                  style={{
                    border: `2px solid ${config.color}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => handleTypeSelect(type)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                    {config.icon}
                  </div>
                  <h4 style={{ marginBottom: '8px', color: config.color, fontSize: '16px' }}>
                    {config.displayName}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                    {config.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'configure' && selectedType && (
          <div>
            {selectedType === COMPONENT_TYPES.onlineClass ? (
              <OnlineClassForm
                onSubmit={handleCreate}
                onCancel={handleBack}
              />
            ) : (
              <SimpleContentForm
                contentType={selectedType}
                onSubmit={handleCreate}
                onCancel={handleBack}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

OnlineClassForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

ChalixContentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreateContent: PropTypes.func.isRequired,
  parentLocator: PropTypes.string.isRequired,
  initialSelectedType: PropTypes.string,
};

export default ChalixContentModal;
