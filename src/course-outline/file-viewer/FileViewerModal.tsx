import React, { useState, useEffect, useRef } from 'react';
import {
  StandardModal, Button, Spinner, Alert,
} from '@openedx/paragon';
// Remove react-pdf entirely - use browser native PDF rendering
import './FileViewerModal.scss';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isPPTX = fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    || fileName.toLowerCase().endsWith('.pptx')
    || fileName.toLowerCase().endsWith('.ppt');

  const renderPDFViewer = () => {
    // Use browser's native PDF rendering via <embed> or <iframe>
    // This is much more reliable than PDF.js and handles all PDF features
    return (
      <div className="pdf-viewer-container" style={{ textAlign: 'center' }}>
        <div style={{ height: '70vh', border: '1px solid #dee2e6' }}>
          <embed
            src={fileUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setError('Không thể tải file PDF. Trình duyệt có thể không hỗ trợ.');
              setLoading(false);
            }}
          />
        </div>
        <div className="pdf-controls mt-3">
          <Button variant="outline-secondary" href={fileUrl} target="_blank" className="me-2">
            Mở trong tab mới
          </Button>
          <Button variant="outline-primary" href={fileUrl} download={fileName}>
            Tải xuống
          </Button>
        </div>
      </div>
    );
  };

  const renderPPTXViewer = () => {
    // For PPTX files, we'll use Microsoft Office Online viewer as an embedded iframe
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

    return (
      <div className="pptx-viewer-container">
        <Alert variant="info" className="mb-3">
          <strong>Xem file PowerPoint:</strong> File đang được hiển thị qua Microsoft Office Online.
        </Alert>
        <iframe
          src={officeViewerUrl}
          width="100%"
          height="600px"
          style={{
            border: '1px solid #dee2e6',
            borderRadius: '4px',
          }}
          title={`PowerPoint Viewer - ${fileName}`}
        />
      </div>
    );
  };

  const renderUnsupportedFile = () => (
    <div className="unsupported-file-container text-center py-5">
      <Alert variant="warning">
        <h5>Định dạng file không được hỗ trợ</h5>
        <p>Hiện tại chỉ hỗ trợ xem file PDF và PowerPoint (.pptx, .ppt).</p>
        <p><strong>File:</strong> {fileName}</p>
        <p><strong>Loại:</strong> {fileType}</p>
        <Button variant="primary" href={fileUrl} target="_blank" className="mt-2">
          Tải xuống file
        </Button>
      </Alert>
    </div>
  );

  const renderFileContent = () => {
    if (isPDF) {
      return renderPDFViewer();
    } if (isPPTX) {
      return renderPPTXViewer();
    }
    return renderUnsupportedFile();
  };

  return (
    <StandardModal
      title={`Xem file: ${fileName}`}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      hasCloseButton
    >
      <div className="file-viewer-modal" style={{ maxWidth: '100%' }}>
        {renderFileContent()}

        <div className="modal-footer mt-3 d-flex justify-content-between">
          <div>
            <small className="text-muted">
              <strong>File:</strong> {fileName} | <strong>Loại:</strong> {fileType || 'Không xác định'}
            </small>
          </div>
          <div>
            <Button variant="outline-secondary" href={fileUrl} target="_blank" className="me-2">
              Tải xuống
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </StandardModal>
  );
};

export default FileViewerModal;
