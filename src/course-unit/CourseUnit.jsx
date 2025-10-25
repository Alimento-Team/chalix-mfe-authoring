import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  Alert, Container, Layout, Button, TransitionReplace,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@openedx/paragon/icons';
import { CourseAuthoringUnitSidebarSlot } from '../plugin-slots/CourseAuthoringUnitSidebarSlot';

import { getProcessingNotification } from '../generic/processing-notification/data/selectors';
import SubHeader from '../generic/sub-header/SubHeader';
import { RequestStatus } from '../data/constants';
import getPageHeadTitle from '../generic/utils';
import AlertMessage from '../generic/alert-message';
import { PasteComponent } from '../generic/clipboard';
import ProcessingNotification from '../generic/processing-notification';
import { SavingErrorAlert } from '../generic/saving-error-alert';
import ConnectionErrorAlert from '../generic/ConnectionErrorAlert';
import Loading from '../generic/Loading';
import AddComponent from './add-component/AddComponent';
import HeaderTitle from './header-title/HeaderTitle';
import Breadcrumbs from './breadcrumbs/Breadcrumbs';
import Sequence from './course-sequence';
import { useCourseUnit, useLayoutGrid, useScrollToLastPosition } from './hooks';
import messages from './messages';
import { PasteNotificationAlert } from './clipboard';
import XBlockContainerIframe from './xblock-container-iframe';
import MoveModal from './move-modal';
import IframePreviewLibraryXBlockChanges from './preview-changes';
import CourseUnitHeaderActionsSlot from '../plugin-slots/CourseUnitHeaderActionsSlot';
import { FinalEvaluationEditor } from './final-evaluation';
import { useCourseConfig } from '../course-outline/hooks/useCourseConfig';

const CourseUnit = ({ courseId }) => {
  const { blockId } = useParams();
  const intl = useIntl();
  
  // Debug: Confirm CourseUnit component is loading
  console.log('🎯 CourseUnit component loaded with courseId:', courseId, 'blockId:', blockId);
  
  const {
    courseUnit,
    isLoading,
    sequenceId,
    unitTitle,
    unitCategory,
    errorMessage,
    sequenceStatus,
    savingStatus,
    isTitleEditFormOpen,
    isUnitVerticalType,
    isUnitLibraryType,
    isSplitTestType,
    staticFileNotices,
    currentlyVisibleToStudents,
    unitXBlockActions,
    sharedClipboardData,
    showPasteXBlock,
    showPasteUnit,
    handleTitleEditSubmit,
    headerNavigationsActions,
    handleTitleEdit,
    handleCreateNewCourseXBlock,
    handleConfigureSubmit,
    courseVerticalChildren,
    canPasteComponent,
    isMoveModalOpen,
    openMoveModal,
    closeMoveModal,
    movedXBlockParams,
    handleRollbackMovedXBlock,
    handleCloseXBlockMovedAlert,
    handleNavigateToTargetUnit,
    addComponentTemplateData,
  } = useCourseUnit({ courseId, blockId });
  const layoutGrid = useLayoutGrid(unitCategory, isUnitLibraryType);

  // Get course configuration to detect final evaluation
  const { courseConfig } = useCourseConfig(courseId);

  // Detect final evaluation unit by title or course config
  const isFinalEvaluation = !!(
    (unitTitle && unitTitle.toLowerCase().includes('kiểm tra cuối')) ||
    (courseConfig && courseConfig.course_type && courseConfig.course_type.includes('Hình thức kiểm tra cuối khoá'))
  );

  // Allow authors to force the inline editor when CMS modal is not available
  const [showInlineFinalEvalEditor, setShowInlineFinalEvalEditor] = useState(false);
  
  // Debugging: log detection info
  // eslint-disable-next-line no-console
  console.log('🎯 CourseUnit Detection:', {
    unitTitle,
    courseType: courseConfig?.course_type,
    isFinalEvaluation,
    courseConfig
  });

  // Add visual indicator in browser title if final evaluation is detected
  useEffect(() => {
    if (isFinalEvaluation) {
      document.title = `🎯 FINAL EVAL - ${unitTitle}`;
      console.log('🎯 Final Evaluation mode activated for unit:', unitTitle);
    }
  }, [isFinalEvaluation, unitTitle]);

  const readOnly = !!courseUnit.readOnly;

  useEffect(() => {
    document.title = getPageHeadTitle('', unitTitle);
  }, [unitTitle]);

  useScrollToLastPosition();

  const {
    isShow: isShowProcessingNotification,
    title: processingNotificationTitle,
  } = useSelector(getProcessingNotification);

  if (isLoading) {
    return <Loading />;
  }

  if (sequenceStatus === RequestStatus.FAILED) {
    return (
      <Container size="xl" className="course-unit px-4 mt-4">
        <ConnectionErrorAlert />
      </Container>
    );
  }

  return (
    <>
      <Container size="xl" className="course-unit px-4">
        <section className="course-unit-container mb-4 mt-5">
          <TransitionReplace>
            {movedXBlockParams.isSuccess ? (
              <AlertMessage
                key="xblock-moved-alert"
                data-testid="xblock-moved-alert"
                show={movedXBlockParams.isSuccess}
                variant="success"
                icon={CheckCircleIcon}
                title={movedXBlockParams.isUndo
                  ? intl.formatMessage(messages.alertMoveCancelTitle)
                  : intl.formatMessage(messages.alertMoveSuccessTitle)}
                description={movedXBlockParams.isUndo
                  ? intl.formatMessage(messages.alertMoveCancelDescription, { title: movedXBlockParams.title })
                  : intl.formatMessage(messages.alertMoveSuccessDescription, { title: movedXBlockParams.title })}
                aria-hidden={movedXBlockParams.isSuccess}
                dismissible
                actions={movedXBlockParams.isUndo ? null : [
                  <Button
                    onClick={handleRollbackMovedXBlock}
                    key="xblock-moved-alert-undo-move-button"
                  >
                    {intl.formatMessage(messages.undoMoveButton)}
                  </Button>,
                  <Button
                    onClick={handleNavigateToTargetUnit}
                    key="xblock-moved-alert-new-location-button"
                  >
                    {intl.formatMessage(messages.newLocationButton)}
                  </Button>,
                ]}
                onClose={handleCloseXBlockMovedAlert}
              />
            ) : null}
          </TransitionReplace>
          {courseUnit.upstreamInfo?.upstreamLink && (
            <AlertMessage
              title={intl.formatMessage(
                messages.alertLibraryUnitReadOnlyText,
                {
                  link: (
                    <Alert.Link
                      className="ml-1"
                      href={courseUnit.upstreamInfo.upstreamLink}
                    >
                      {intl.formatMessage(messages.alertLibraryUnitReadOnlyLinkText)}
                    </Alert.Link>
                  ),
                },
              )}
              variant="info"
            />
          )}
          <SubHeader
            hideBorder
            title={(
              <HeaderTitle
                unitTitle={unitTitle}
                isTitleEditFormOpen={isTitleEditFormOpen}
                handleTitleEdit={handleTitleEdit}
                handleTitleEditSubmit={handleTitleEditSubmit}
                handleConfigureSubmit={handleConfigureSubmit}
              />
            )}
            breadcrumbs={(
              <Breadcrumbs
                courseId={courseId}
                parentUnitId={sequenceId}
              />
            )}
            headerActions={(
              <CourseUnitHeaderActionsSlot
                category={unitCategory}
                headerNavigationsActions={headerNavigationsActions}
                unitTitle={unitTitle}
                verticalBlocks={courseVerticalChildren.children}
              />
            )}
          />
          {isUnitVerticalType && (
            <Sequence
              courseId={courseId}
              sequenceId={sequenceId}
              unitId={blockId}
              handleCreateNewCourseXBlock={handleCreateNewCourseXBlock}
              showPasteUnit={showPasteUnit}
            />
          )}
          <Layout {...(isFinalEvaluation ? { cols: 1, gap: 0 } : layoutGrid)}>
            <Layout.Element cols={isFinalEvaluation ? 1 : undefined}>
              {currentlyVisibleToStudents && (
                <AlertMessage
                  className="course-unit__alert"
                  title={intl.formatMessage(messages.alertUnpublishedVersion)}
                  variant="warning"
                  icon={WarningIcon}
                />
              )}
              {staticFileNotices && (
                <PasteNotificationAlert
                  staticFileNotices={staticFileNotices}
                  courseId={courseId}
                />
              )}
              {isFinalEvaluation ? (
                // For final evaluation units prefer the Chalix CMS modal if it's available
                (() => {
                  const chalixAvailable = (typeof window !== 'undefined' && window.ChalixCMS);
                  return (
                    <div>
                      {chalixAvailable && (
                        <div className="mb-3">
                          <Alert variant="info">
                            Chế độ kiểm tra cuối khóa được phát hiện. Bạn có thể sử dụng Chalix CMS để chỉnh sửa cấu hình hoặc chọn "Chỉnh sửa nội bộ" để sửa ngay trong giao diện tác giả.
                            <div className="mt-2 d-flex gap-2">
                              <Button
                                variant="primary"
                                onClick={() => {
                                  try {
                                    // Try to open the Chalix CMS modal if the global helper is present
                                    window.ChalixCMS.openFinalEvaluationModal(courseId);
                                  } catch (e) {
                                    // eslint-disable-next-line no-console
                                    console.warn('Failed to call ChalixCMS.openFinalEvaluationModal', e);
                                    setShowInlineFinalEvalEditor(true);
                                  }
                                }}
                              >
                                Mở Chalix Final Evaluation
                              </Button>
                              <Button
                                variant="outline-secondary"
                                onClick={() => setShowInlineFinalEvalEditor(true)}
                              >
                                Chỉnh sửa nội bộ
                              </Button>
                            </div>
                          </Alert>
                        </div>
                      )}

                      {/* Render inline editor if Chalix CMS is not available or author chose to edit inline */}
                      {(!chalixAvailable || showInlineFinalEvalEditor) && (
                        <FinalEvaluationEditor
                          courseId={courseId}
                          blockId={blockId}
                          unitTitle={unitTitle}
                        />
                      )}
                    </div>
                  );
                })()
              ) : (
                // Default layout for non-final units
                <>
                  <XBlockContainerIframe
                    courseId={courseId}
                    blockId={blockId}
                    isUnitVerticalType={isUnitVerticalType}
                    unitXBlockActions={unitXBlockActions}
                    courseVerticalChildren={courseVerticalChildren.children}
                    handleConfigureSubmit={handleConfigureSubmit}
                  />
                  {!readOnly && (
                    <AddComponent
                      parentLocator={blockId}
                      isSplitTestType={isSplitTestType}
                      isUnitVerticalType={isUnitVerticalType}
                      handleCreateNewCourseXBlock={handleCreateNewCourseXBlock}
                      addComponentTemplateData={addComponentTemplateData}
                    />
                  )}
                </>
              )}
              {!isFinalEvaluation && !readOnly && showPasteXBlock && canPasteComponent && isUnitVerticalType && (
                <PasteComponent
                  clipboardData={sharedClipboardData}
                  onClick={
                    () => handleCreateNewCourseXBlock({ stagedContent: 'clipboard', parentLocator: blockId })
                  }
                  text={intl.formatMessage(messages.pasteButtonText)}
                />
              )}
              <MoveModal
                isOpenModal={isMoveModalOpen}
                openModal={openMoveModal}
                closeModal={closeMoveModal}
                courseId={courseId}
              />
              <IframePreviewLibraryXBlockChanges />
            </Layout.Element>
            {!isFinalEvaluation && (
              <Layout.Element>
                <CourseAuthoringUnitSidebarSlot
                  courseId={courseId}
                  blockId={blockId}
                  unitTitle={unitTitle}
                  xBlocks={courseVerticalChildren.children}
                  readOnly={readOnly}
                  isUnitVerticalType={isUnitVerticalType}
                  isSplitTestType={isSplitTestType}
                />
              </Layout.Element>
            )}
          </Layout>
        </section>
      </Container>
      <div className="alert-toast">
        <ProcessingNotification
          isShow={isShowProcessingNotification}
          title={processingNotificationTitle}
        />
        <SavingErrorAlert
          savingStatus={savingStatus}
          errorMessage={errorMessage}
        />
      </div>
    </>
  );
};

CourseUnit.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default CourseUnit;
