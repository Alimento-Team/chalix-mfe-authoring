import React, { useState, useEffect } from 'react';
import {
  StandardModal, Button, Alert, Spinner, Card,
} from '@openedx/paragon';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@openedx/paragon/icons';

// Use react-office-viewer for basic formats
import Viewer, { PdfViewer as RO_PdfViewer, DocxViewer as RO_DocxViewer, SheetViewer as RO_SheetViewer } from 'react-office-viewer';

// CSS for react-doc-viewer
import '@cyntler/react-doc-viewer/dist/index.css';

// Comprehensive document viewer with pre-signed URL handling
const ComprehensiveDocViewer: React.FC<{ fileUrl: string; fileName: string }> = ({ fileUrl, fileName }) => {
  const [DocViewer, setDocViewer] = useState<any>(null);
  const [DocViewerRenderers, setDocViewerRenderers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<string | null>(null);
  const [useIframeViewer, setUseIframeViewer] = useState(false);

  useEffect(() => {
    const loadDocViewer = async () => {
      try {
        const module = await import('@cyntler/react-doc-viewer');
        setDocViewer(() => module.default);
        setDocViewerRenderers(module.DocViewerRenderers);
        
        // Check if PPTX is supported
        const renderers = module.DocViewerRenderers;
        console.log('Available renderers:', renderers);
        
        // If PPTX support seems limited, consider iframe fallback for PPTX
        if (fileName.toLowerCase().endsWith('.pptx')) {
          console.log('PPTX file detected - may need fallback approach');
        }
        
      } catch (err) {
        console.error('Error loading DocViewer:', err);
        setError('Không thể tải trình xem tài liệu');
      } finally {
        setLoading(false);
      }
    };

    loadDocViewer();
  }, [fileName]);

  // Fetch file and create blob URL to avoid signature issues with DocViewer
  useEffect(() => {
    const fetchFileAsBlob = async () => {
      if (!fileUrl) return;
      
      try {
        console.log('Fetching file as blob:', fileUrl);
        
        // Fetch the file with minimal headers to avoid signature mismatch
        const response = await fetch(fileUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            // Minimal headers - don't add Origin, Referer, etc.
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setFileBlob(blobUrl);
        console.log('File loaded as blob:', blobUrl);
        
      } catch (err) {
        console.error('Error fetching file as blob:', err);
        setError('Không thể tải file. Có thể do vấn đề xác thực hoặc kết nối.');
      }
    };

    if (DocViewer) {
      fetchFileAsBlob();
    }

    // Cleanup blob URL when component unmounts
    return () => {
      if (fileBlob) {
        URL.revokeObjectURL(fileBlob);
      }
    };
  }, [fileUrl, DocViewer]);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="mt-3">Đang tải trình xem tài liệu...</span>
      </div>
    );
  }

  if (error || !DocViewer) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Không thể tải trình xem tài liệu</Alert.Heading>
        <p>{error}</p>
        <div className="mt-3">
          <Button variant="primary" href={fileUrl} target="_blank" download>
            📥 Tải xuống file
          </Button>
        </div>
      </Alert>
    );
  }

  if (!fileBlob) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner animation="border" variant="primary" />
        <span className="mt-3">Đang tải file...</span>
      </div>
    );
  }

  const documents = [
    {
      uri: fileBlob, // Use blob URL instead of original pre-signed URL
      fileType: fileName.split('.').pop()?.toLowerCase(),
      fileName: fileName, // Explicitly provide fileName
    },
  ];

  // Debug: Log what we're passing to DocViewer
  console.log('ComprehensiveDocViewer - Documents:', documents);
  console.log('ComprehensiveDocViewer - File extension detected:', fileName.split('.').pop()?.toLowerCase());
  console.log('ComprehensiveDocViewer - DocViewerRenderers available:', Object.keys(DocViewerRenderers || {}));

  return (
    <div style={{ height: '600px', width: '100%' }}>
      {useIframeViewer ? (
        // TODO: Fallback iframe viewer for PPTX files - needs improvement
        // Issues to address later:
        // 1. Google Docs viewer may not work with local/private files
        // 2. Evaluate other PPTX viewers like react-pptx-viewer or custom implementation
        // 3. Handle authentication for external viewers
        <div className="d-flex flex-column h-100">
          <div className="mb-2 text-center">
            <small className="text-muted">Đang sử dụng trình xem dự phòng cho file PowerPoint</small>
          </div>
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={`Document viewer: ${fileName}`}
            onError={() => {
              console.log('Google Docs viewer failed, falling back to download');
              setError('Không thể xem file PowerPoint. Vui lòng tải về để xem.');
            }}
          />
          <div className="mt-2 text-center">
            <Button variant="outline-primary" size="sm" onClick={() => setUseIframeViewer(false)}>
              Thử trình xem chính
            </Button>
            <Button variant="primary" size="sm" className="ms-2" href={fileUrl} target="_blank" download>
              📥 Tải xuống
            </Button>
          </div>
        </div>
      ) : (
        <DocViewer
          documents={documents}
          pluginRenderers={DocViewerRenderers}
          style={{ height: '100%' }}
          config={{
            header: {
              disableHeader: false,
              disableFileName: false,
              retainURLParams: false,
            },
          }}
          onError={(error, document) => {
            console.error('DocViewer error:', error, 'for document:', document);
            
            // For PPTX files, try iframe fallback
            if (fileName.toLowerCase().includes('.pptx') || fileName.toLowerCase().includes('.ppt')) {
              console.log('PPTX DocViewer failed, switching to iframe fallback');
              setUseIframeViewer(true);
            } else {
              setError(`Không thể mở file ${fileName}. ${error?.message || 'Lỗi không xác định'}`);
            }
          }}
        />
      )}
    </div>
  );
};

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

// Map Content-Type to react-file-viewer fileType
const mapContentTypeToFileType = (contentType: string): string => {
  const map: { [key: string]: string } = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'text/plain': 'txt',
    'text/html': 'html',
    'text/htm': 'htm',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/mp3': 'mp3',
    'text/csv': 'csv',
  };
  return map[contentType] || '';
};

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>('');
  const [pdfError, setPdfError] = useState<boolean>(false);

  useEffect(() => {
    if (!fileUrl) return;
    // Reset PDF error state when file changes
    setPdfError(false);
    setError(null);
    
    // Debug: Log the file URL being accessed
    console.log('FileViewer - Attempting to load file:', fileUrl);
    
    fetch(fileUrl, { 
      method: 'HEAD',
      mode: 'cors',
      credentials: 'omit', // Don't send credentials
      headers: {
        // Minimal headers to avoid signature mismatch
      }
    })
      .then((response) => {
        console.log('FileViewer - HEAD response status:', response.status);
        console.log('FileViewer - HEAD response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          console.error('FileViewer - HEAD request failed:', response.status, response.statusText);
          
          // Check for MinIO signature errors
          const minioErrorCode = response.headers.get('X-Minio-Error-Code');
          const minioErrorDesc = response.headers.get('X-Minio-Error-Desc');
          
          if (minioErrorCode === 'SignatureDoesNotMatch') {
            console.error('MinIO Authentication Error:', minioErrorDesc);
            setError('File cần xác thực để truy cập. Vui lòng cấu hình quyền truy cập công khai cho MinIO bucket hoặc sử dụng pre-signed URLs.');
            return;
          }
          
          // Don't set error for other HEAD failures, let the viewer try
        }
        
        const contentType = response.headers.get('Content-Type') || '';
        console.log('FileViewer - Detected content type:', contentType);
        setDetectedType(mapContentTypeToFileType(contentType));
      })
      .catch((err) => {
        console.error('FileViewer - HEAD request error:', err);
        // Don't set error for HEAD failure, let the viewer try
      });
  }, [fileUrl]);

  // Listen for PDF.js errors in the console
  useEffect(() => {
    const handlePdfError = (event: ErrorEvent) => {
      const error = event.error;
      if (error && (error.name === 'InvalidPDFException' || error.message?.includes('Invalid PDF'))) {
        setPdfError(true);
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && (reason.name === 'InvalidPDFException' || reason.message?.includes('Invalid PDF'))) {
        setPdfError(true);
      }
    };
    
    window.addEventListener('error', handlePdfError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handlePdfError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Get the simple file type for viewer selection
  const simpleType = detectedType || mapContentTypeToFileType(fileType || '');
  
  // Use ComprehensiveDocViewer for all supported document formats
  const useComprehensiveViewer = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(simpleType);
  
  // Keep react-office-viewer as fallback for specific formats if needed
  const useOfficeViewer = false; // Disabled in favor of ComprehensiveDocViewer

  if (!fileUrl) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>No file URL provided.</p>
      </Alert>
    );
  }

  return (
    <StandardModal
      title={`Xem file: ${fileName}`}
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      hasCloseButton
    >
      <div style={{ maxWidth: '100%' }}>
        {useComprehensiveViewer ? (
          <ComprehensiveDocViewer fileUrl={fileUrl} fileName={fileName} />
        ) : useOfficeViewer ? (
          <div style={{ height: '600px', width: '100%' }}>
            {/* Handle PDF errors gracefully */}
            {simpleType === 'pdf' && pdfError ? (
              <Alert variant="warning">
                <Alert.Heading>Không thể xem trước file PDF này</Alert.Heading>
                <p>File PDF có thể bị hỏng hoặc có cấu trúc không hợp lệ.</p>
                <Button 
                  variant="link" 
                  href={fileUrl} 
                  target="_blank"
                  className="p-0"
                >
                  Tải xuống file để xem
                </Button>
              </Alert>
            ) : simpleType === 'pdf' ? (
              <RO_PdfViewer 
                file={fileUrl} 
                fileName={fileName}
                onError={() => setPdfError(true)}
              />
            ) : simpleType === 'docx' ? (
              <RO_DocxViewer file={fileUrl} fileName={fileName} />
            ) : ( // xls/xlsx fallback to sheet viewer
              <RO_SheetViewer file={fileUrl} fileName={fileName} />
            )}
          </div>
        ) : (
          error ? (
            <Alert variant="warning">
              <Alert.Heading>Không thể xem trước file này</Alert.Heading>
              <p>{error}</p>
              <div className="mt-3">
                <Button 
                  variant="primary" 
                  href={fileUrl} 
                  target="_blank"
                  download
                >
                  📥 Tải xuống file
                </Button>
              </div>
            </Alert>
          ) : (
            <div style={{ height: '600px', width: '100%' }}>
              <Viewer
                file={fileUrl}
                fileName={fileName}
                onError={() => setError('Không thể xem trước file này. File có thể bị hỏng hoặc có định dạng không được hỗ trợ.')} />
            </div>
          )
        )}
        <div className="modal-footer mt-3 d-flex justify-content-between">
          <div>
            <small className="text-muted">
              <strong>File:</strong> {fileName} | <strong>Loại:</strong> {fileType || 'Không xác định'}
            </small>
          </div>
          <div>
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
