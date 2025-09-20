import { useState, useEffect, useCallback } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Container,
  Layout,
  Row,
  TransitionReplace,
  Toast,
  StandardModal,
  Button,
  Card,
} from '@openedx/paragon';
import { Helmet } from 'react-helmet';
import { CheckCircle as CheckCircleIcon, Settings as SettingsIcon } from '@openedx/paragon/icons';
import { useSelector } from 'react-redux';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useLocation } from 'react-router-dom';
import { CourseAuthoringOutlineSidebarSlot } from '@src/plugin-slots/CourseAuthoringOutlineSidebarSlot';

import { LoadingSpinner } from '@src/generic/Loading';
import { getProcessingNotification } from '@src/generic/processing-notification/data/selectors';
import { RequestStatus } from '@src/data/constants';
import SubHeader from '@src/generic/sub-header/SubHeader';
import ProcessingNotification from '@src/generic/processing-notification';
import InternetConnectionAlert from '@src/generic/internet-connection-alert';
import DeleteModal from '@src/generic/delete-modal/DeleteModal';
import ConfigureModal from '@src/generic/configure-modal/ConfigureModal';
import AlertMessage from '@src/generic/alert-message';
import getPageHeadTitle from '@src/generic/utils';
import CourseOutlineHeaderActionsSlot from '@src/plugin-slots/CourseOutlineHeaderActionsSlot';
import { ContainerType } from '@src/generic/key-utils';
import { ComponentPicker, SelectedComponent } from '@src/library-authoring';
import { ContentType } from '@src/library-authoring/routes';
import { NOTIFICATION_MESSAGES } from '@src/constants';
import { COMPONENT_TYPES } from '@src/generic/block-type-utils/constants';
import { XBlock } from '@src/data/types';
import {
  getCurrentItem,
  getProctoredExamsFlag,
  getTimedExamsFlag,
} from './data/selectors';
import { COURSE_BLOCK_NAMES } from './constants';
import StatusBar from './status-bar/StatusBar';
import UnitCard from './unit-card/UnitCard';
import EmptyPlaceholder from './empty-placeholder/EmptyPlaceholder';
import PublishModal from './publish-modal/PublishModal';
import PageAlerts from './page-alerts/PageAlerts';
import DraggableList from './drag-helper/DraggableList';
import { useCourseOutline } from './hooks';
import { useSimplifiedCourseOutline } from './hooks-simplified';
import messages from './messages';
import { getTagsExportFile } from './data/api';
import OutlineAddChildButtons from './OutlineAddChildButtons';

interface SimplifiedCourseOutlineProps {
  courseId: string,
}

const SimplifiedCourseOutline = ({ courseId }: SimplifiedCourseOutlineProps) => {
  const intl = useIntl();
  const location = useLocation();

  const {
    courseUsageKey,
    courseName,
    savingStatus,
    statusBarData,
    courseActions,
    units,
    isCustomRelativeDatesActive,
    isLoading,
    isLoadingDenied,
    showSuccessAlert,
    isInternetConnectionAlertFailed,
    isPublishModalOpen,
    isConfigureModalOpen,
    isDeleteModalOpen,
    closePublishModal,
    handleConfigureModalClose,
    closeDeleteModal,
    openPublishModal,
    openConfigureModal,
    openDeleteModal,
    isAddLibraryModalOpen,
    openAddLibraryModal,
    closeAddLibraryModal,
    handleInternetConnectionFailed,
    handleConfigureItemSubmit,
    handlePublishItemSubmit,
    handleEditSubmit,
    handleDeleteItemSubmit,
    handleDuplicateUnitSubmit,
    handleNewUnitSubmit,
    handleAddUnitFromLibrary,
    getUnitUrl,
    handleVideoSharingOptionChange,
    notificationDismissUrl,
    discussionsSettings,
    discussionsIncontextLearnmoreUrl,
    deprecatedBlocksInfo,
    proctoringErrors,
    mfeProctoredExamSettingsUrl,
    handleDismissNotification,
    advanceSettingsUrl,
    handleUnitDragAndDrop,
    errors,
    resetScrollState,
  } = useSimplifiedCourseOutline({ courseId });

  // Use `setToastMessage` to show the toast.
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wait for the course data to load before exporting tags.
    if (courseId && courseName && location.hash === '#export-tags') {
      setToastMessage(intl.formatMessage(messages.exportTagsCreatingToastMessage));
      getTagsExportFile(courseId, courseName).then(() => {
        setToastMessage(intl.formatMessage(messages.exportTagsSuccessToastMessage));
      }).catch(() => {
        setToastMessage(intl.formatMessage(messages.exportTagsErrorToastMessage));
      });

      // Delete `#export-tags` from location
      window.location.href = '#';
    }
  }, [location, courseId, courseName]);

  // Extract all units from all sections and subsections for simplified view
  const [localUnits, setLocalUnits] = useState<XBlock[]>(units || []);

  const extractUnitsFromSections = (sections: XBlock[]) => {
    const allUnits: XBlock[] = [];
    sections.forEach(section => {
      if (section.childInfo?.children) {
        section.childInfo.children.forEach(subsection => {
          if (subsection.childInfo?.children) {
            subsection.childInfo.children.forEach(unit => {
              // Add parent references for context
              allUnits.push({
                ...unit,
                parentSectionId: section.id,
                parentSubsectionId: subsection.id,
              });
            });
          }
        });
      }
    });
    return allUnits;
  };

  const restoreUnitList = () => {
    setLocalUnits(() => [...units]);
  };

  const {
    isShow: isShowProcessingNotification,
    title: processingNotificationTitle,
  } = useSelector(getProcessingNotification);

  const currentItemData = useSelector(getCurrentItem);
  const deleteCategory = COURSE_BLOCK_NAMES[currentItemData.category]?.name.toLowerCase();

  const enableProctoredExams = useSelector(getProctoredExamsFlag);
  const enableTimedExams = useSelector(getTimedExamsFlag);

  /**
   * Move unit to new index in simplified view
   */
  const updateUnitOrderByIndex = (currentIndex: number, newIndex: number) => {
    if (currentIndex === newIndex) {
      return;
    }
    setLocalUnits((prevUnits) => {
      const newUnits = arrayMove(prevUnits, currentIndex, newIndex);
      const unitIds = newUnits.map(unit => unit.id);
      handleUnitDragAndDrop(unitIds, restoreUnitList);
      return newUnits;
    });
  };

  const handleSelectLibraryUnit = useCallback((selectedUnit: SelectedComponent) => {
    handleAddUnitFromLibrary.mutateAsync({
      type: COMPONENT_TYPES.libraryV2,
      category: ContainerType.Unit,
      parentLocator: courseUsageKey,
      libraryContentKey: selectedUnit.usageKey,
    });
    closeAddLibraryModal();
  }, [closeAddLibraryModal, handleAddUnitFromLibrary.mutateAsync, courseId, courseUsageKey]);

  // Handler for creating new unit directly under course
  const handleNewSimplifiedUnitSubmit = () => {
    handleNewUnitSubmit();
  };

  useEffect(() => {
    setLocalUnits(units || []);
  }, [units]);

  const handleToggleToNormalView = () => {
    // Navigate to traditional course outline view
    window.location.href = `/course/${courseId}/traditional`;
  };

  if (isLoading) {
    return (
      <Row className="m-0 mt-4 justify-content-center">
        <LoadingSpinner />
      </Row>
    );
  }

  if (isLoadingDenied) {
    return (
      <Container size="xl" className="px-4 mt-4">
        <PageAlerts
          courseId={courseId}
          notificationDismissUrl={notificationDismissUrl}
          handleDismissNotification={handleDismissNotification}
          discussionsSettings={discussionsSettings}
          discussionsIncontextLearnmoreUrl={discussionsIncontextLearnmoreUrl}
          deprecatedBlocksInfo={deprecatedBlocksInfo}
          proctoringErrors={proctoringErrors}
          mfeProctoredExamSettingsUrl={mfeProctoredExamSettingsUrl}
          advanceSettingsUrl={advanceSettingsUrl}
          savingStatus={savingStatus}
          errors={errors}
        />
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>{getPageHeadTitle(courseName, intl.formatMessage(messages.headingTitle))}</title>
      </Helmet>
      <Container size="xl" className="px-4">
        <section className="course-outline-container mb-4 mt-5">
          <PageAlerts
            courseId={courseId}
            notificationDismissUrl={notificationDismissUrl}
            handleDismissNotification={handleDismissNotification}
            discussionsSettings={discussionsSettings}
            discussionsIncontextLearnmoreUrl={discussionsIncontextLearnmoreUrl}
            deprecatedBlocksInfo={deprecatedBlocksInfo}
            proctoringErrors={proctoringErrors}
            mfeProctoredExamSettingsUrl={mfeProctoredExamSettingsUrl}
            advanceSettingsUrl={advanceSettingsUrl}
            savingStatus={savingStatus}
            errors={errors}
          />
          <TransitionReplace>
            {showSuccessAlert ? (
              <AlertMessage
                key={intl.formatMessage(messages.alertSuccessAriaLabelledby)}
                show={showSuccessAlert}
                variant="success"
                icon={CheckCircleIcon}
                title={intl.formatMessage(messages.alertSuccessTitle)}
                description={intl.formatMessage(messages.alertSuccessDescription)}
                aria-hidden="true"
                aria-labelledby={intl.formatMessage(messages.alertSuccessAriaLabelledby)}
                aria-describedby={intl.formatMessage(messages.alertSuccessAriaDescribedby)}
              />
            ) : null}
          </TransitionReplace>

          {/* Simplified View Header */}
          <Card className="mb-3">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-1">{intl.formatMessage(messages.simplifiedViewTitle)}</h3>
                  <p className="text-muted mb-0">{intl.formatMessage(messages.simplifiedViewDescription)}</p>
                </div>
                <Button
                  variant="outline-primary"
                  iconBefore={SettingsIcon}
                  onClick={handleToggleToNormalView}
                >
                  {intl.formatMessage(messages.switchToNormalView)}
                </Button>
              </div>
            </Card.Header>
          </Card>

          <SubHeader
            title={intl.formatMessage(messages.headingTitle)}
            subtitle={intl.formatMessage(messages.simplifiedSubtitle)}
            headerActions={(
              <div className="d-flex align-items-center">
                <span className="text-muted me-3">
                  {localUnits.length} {localUnits.length === 1 ? 'unit' : 'units'}
                </span>
              </div>
            )}
          />
          <Layout
            lg={[{ span: 9 }, { span: 3 }]}
            md={[{ span: 9 }, { span: 3 }]}
            sm={[{ span: 12 }, { span: 12 }]}
            xs={[{ span: 12 }, { span: 12 }]}
            xl={[{ span: 9 }, { span: 3 }]}
          >
            <Layout.Element>
              <article>
                <div>
                  <section className="course-outline-section">
                    <StatusBar
                      courseId={courseId}
                      isLoading={isLoading}
                      statusBarData={statusBarData}
                      openEnableHighlightsModal={() => {}}
                      handleVideoSharingOptionChange={handleVideoSharingOptionChange}
                    />
                    {!errors?.outlineIndexApi && (
                      <div className="pt-4">
                        {localUnits.length ? (
                          <>
                            <SortableContext
                              id="simplified-units"
                              items={localUnits}
                              strategy={verticalListSortingStrategy}
                            >
                              {localUnits.map((unit, unitIndex) => (
                                <UnitCard
                                  key={unit.id}
                                  unit={unit}
                                  subsection={null} // No subsection in simplified view
                                  section={null} // No section in simplified view
                                  isSelfPaced={statusBarData.isSelfPaced}
                                  isCustomRelativeDatesActive={isCustomRelativeDatesActive}
                                  index={unitIndex}
                                  getPossibleMoves={() => []} // Simplified reordering
                                  savingStatus={savingStatus}
                                  onOpenPublishModal={openPublishModal}
                                  onOpenConfigureModal={openConfigureModal}
                                  onOpenDeleteModal={openDeleteModal}
                                  onEditSubmit={handleEditSubmit}
                                  onDuplicateSubmit={handleDuplicateUnitSubmit}
                                  getTitleLink={getUnitUrl}
                                  onOrderChange={updateUnitOrderByIndex}
                                  discussionsSettings={discussionsSettings}
                                />
                              ))}
                            </SortableContext>
                            {courseActions.childAddable && (
                              <OutlineAddChildButtons
                                handleNewButtonClick={handleNewSimplifiedUnitSubmit}
                                handleUseFromLibraryClick={openAddLibraryModal}
                                childType={ContainerType.Unit}
                              />
                            )}
                          </>
                        ) : (
                          <EmptyPlaceholder>
                            {courseActions.childAddable && (
                              <OutlineAddChildButtons
                                handleNewButtonClick={handleNewSimplifiedUnitSubmit}
                                handleUseFromLibraryClick={openAddLibraryModal}
                                childType={ContainerType.Unit}
                                btnVariant="primary"
                                btnClasses="mt-1"
                              />
                            )}
                          </EmptyPlaceholder>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              </article>
            </Layout.Element>
            <Layout.Element>
              <CourseAuthoringOutlineSidebarSlot
                courseId={courseId}
                courseName={courseName}
                sections={[]} // Empty for simplified view
              />
            </Layout.Element>
          </Layout>
        </section>
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={closePublishModal}
          onPublishSubmit={handlePublishItemSubmit}
        />
        <ConfigureModal
          isOpen={isConfigureModalOpen}
          onClose={handleConfigureModalClose}
          onConfigureSubmit={handleConfigureItemSubmit}
          currentItemData={currentItemData}
          enableProctoredExams={enableProctoredExams}
          enableTimedExams={enableTimedExams}
          isSelfPaced={statusBarData.isSelfPaced}
        />
        <DeleteModal
          category={deleteCategory}
          isOpen={isDeleteModalOpen}
          close={closeDeleteModal}
          onDeleteSubmit={handleDeleteItemSubmit}
        />
        <StandardModal
          title={intl.formatMessage(messages.useUnitFromLibraryButton)}
          isOpen={isAddLibraryModalOpen}
          onClose={closeAddLibraryModal}
          isOverflowVisible={false}
          size="xl"
        >
          <ComponentPicker
            showOnlyPublished
            extraFilter={['block_type = "vertical"']}
            componentPickerMode="single"
            onComponentSelected={handleSelectLibraryUnit}
            visibleTabs={[ContentType.units]}
          />
        </StandardModal>
      </Container>
      <div className="alert-toast">
        <ProcessingNotification
          isShow={
            isShowProcessingNotification
            || handleAddUnitFromLibrary.isPending
          }
          title={processingNotificationTitle || NOTIFICATION_MESSAGES.saving}
        />
        <InternetConnectionAlert
          isFailed={isInternetConnectionAlertFailed}
          isQueryPending={savingStatus === RequestStatus.PENDING}
          onInternetConnectionFailed={handleInternetConnectionFailed}
        />
      </div>
      {toastMessage && (
        <Toast
          show
          onClose={() => setToastMessage(null)}
          data-testid="taxonomy-toast"
        >
          {toastMessage}
        </Toast>
      )}
    </>
  );
};

export default SimplifiedCourseOutline;
