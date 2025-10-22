import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useToggle } from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';

import moment from 'moment';
import { getSavingStatus as getGenericSavingStatus } from '@src/generic/data/selectors';
import { useWaffleFlags } from '@src/data/apiHooks';
import { RequestStatus } from '@src/data/constants';
import { COURSE_BLOCK_NAMES } from './constants';
import {
  addSection,
  addSubsection,
  setCurrentItem,
  setCurrentSection,
  resetScrollField,
  updateSavingStatus,
} from './data/slice';
import {
  getLoadingStatus,
  getOutlineIndexData,
  getSavingStatus,
  getStatusBarData,
  getSectionsList,
  getCourseActions,
  getCurrentItem,
  getCurrentSection,
  getCurrentSubsection,
  getCustomRelativeDatesActiveFlag,
  getErrors,
  getCreatedOn,
} from './data/selectors';
import {
  addNewSectionQuery,
  addNewSubsectionQuery,
  addNewUnitQuery,
  deleteCourseSectionQuery,
  deleteCourseSubsectionQuery,
  deleteCourseUnitQuery,
  editCourseItemQuery,
  duplicateSectionQuery,
  duplicateSubsectionQuery,
  duplicateUnitQuery,
  enableCourseHighlightsEmailsQuery,
  fetchCourseBestPracticesQuery,
  fetchCourseLaunchQuery,
  fetchCourseOutlineIndexQuery,
  fetchCourseReindexQuery,
  publishCourseItemQuery,
  updateCourseSectionHighlightsQuery,
  configureCourseSectionQuery,
  configureCourseSubsectionQuery,
  configureCourseUnitQuery,
  setSectionOrderListQuery,
  setVideoSharingOptionQuery,
  setSubsectionOrderListQuery,
  setUnitOrderListQuery,
  pasteClipboardContent,
  dismissNotificationQuery,
  syncDiscussionsTopics,
} from './data/thunk';
import { useCreateCourseBlock } from './data/apiHooks';
import { getCourseItem } from './data/api';
import { updateCourseDetail } from './data/api';
import { useCourseConfig } from './hooks/useCourseConfig';

const useCourseOutline = ({ courseId }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const waffleFlags = useWaffleFlags(courseId);

  const {
    reindexLink,
    courseStructure,
    lmsLink,
    notificationDismissUrl,
    discussionsSettings,
    discussionsIncontextLearnmoreUrl,
    deprecatedBlocksInfo,
    proctoringErrors,
    mfeProctoredExamSettingsUrl,
    advanceSettingsUrl,
  } = useSelector(getOutlineIndexData);
  /** Course usage key is different than courseKey and useful in using as parentLocator for imported sections */
  const createdOn = useSelector(getCreatedOn);
  const { outlineIndexLoadingStatus, reIndexLoadingStatus } = useSelector(getLoadingStatus);
  const statusBarData = useSelector(getStatusBarData);
  const savingStatus = useSelector(getSavingStatus);
  const courseActions = useSelector(getCourseActions);
  const sectionsList = useSelector(getSectionsList);
  const currentItem = useSelector(getCurrentItem);
  const currentSection = useSelector(getCurrentSection);
  const currentSubsection = useSelector(getCurrentSubsection);
  const isCustomRelativeDatesActive = useSelector(getCustomRelativeDatesActiveFlag);
  const genericSavingStatus = useSelector(getGenericSavingStatus);
  const errors = useSelector(getErrors);

  const [isEnableHighlightsModalOpen, openEnableHighlightsModal, closeEnableHighlightsModal] = useToggle(false);
  const [isSectionsExpanded, setSectionsExpanded] = useState(true);
  const [isDisabledReindexButton, setDisableReindexButton] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isHighlightsModalOpen, openHighlightsModal, closeHighlightsModal] = useToggle(false);
  const [isPublishModalOpen, openPublishModal, closePublishModal] = useToggle(false);
  const [isConfigureModalOpen, openConfigureModal, closeConfigureModal] = useToggle(false);
  const [isEditCourseModalOpen, openEditCourseModal, closeEditCourseModal] = useToggle(false);
  const [isDeleteModalOpen, openDeleteModal, closeDeleteModal] = useToggle(false);
  const [
    isAddLibrarySectionModalOpen,
    openAddLibrarySectionModal,
    closeAddLibrarySectionModal,
  ] = useToggle(false);

  const isSavingStatusFailed = savingStatus === RequestStatus.FAILED || genericSavingStatus === RequestStatus.FAILED;

  const handlePasteClipboardClick = (parentLocator, sectionId) => {
    dispatch(pasteClipboardContent(parentLocator, sectionId));
  };

  const handleNewSectionSubmit = () => {
    dispatch(addNewSectionQuery(courseStructure.id));
  };

  const handleNewSubsectionSubmit = (sectionId) => {
    dispatch(addNewSubsectionQuery(sectionId));
  };

  const getUnitUrl = (locator) => {
    if (getConfig().ENABLE_UNIT_PAGE === 'true' && waffleFlags.useNewUnitPage) {
      return `/course/${courseId}/container/${locator}`;
    }
    return `${getConfig().STUDIO_BASE_URL}/container/${locator}`;
  };

  const openUnitPage = (locator) => {
    const url = getUnitUrl(locator);
    if (getConfig().ENABLE_UNIT_PAGE === 'true' && waffleFlags.useNewUnitPage) {
      navigate(url);
    } else {
      window.location.assign(url);
    }
  };

  const handleNewUnitSubmit = (subsectionId) => {
    dispatch(addNewUnitQuery(subsectionId, openUnitPage));
  };

  /**
  * import a unit block from library and redirect user to this unit page.
  */
  const handleAddUnitFromLibrary = useCreateCourseBlock(openUnitPage);

  const handleAddSubsectionFromLibrary = useCreateCourseBlock(async (locator, parentLocator) => {
    try {
      const data = await getCourseItem(locator);
      data.shouldScroll = true;
      // Page should scroll to newly added subsection.
      dispatch(addSubsection({ parentLocator, data }));
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  });

  const resetScrollState = () => {
    dispatch(resetScrollField());
  };

  const handleAddSectionFromLibrary = useCreateCourseBlock(async (locator) => {
    try {
      const data = await getCourseItem(locator);
      // Page should scroll to newly added section.
      data.shouldScroll = true;
      dispatch(addSection(data));
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  });

  const headerNavigationsActions = {
    handleNewSection: handleNewSectionSubmit,
    handleReIndex: () => {
      setDisableReindexButton(true);
      setShowSuccessAlert(false);

      dispatch(fetchCourseReindexQuery(reindexLink)).then(() => {
        setDisableReindexButton(false);
      });
    },
    handleExpandAll: () => {
      setSectionsExpanded((prevState) => !prevState);
    },
    lmsLink,
  };

  const handleEnableHighlightsSubmit = () => {
    dispatch(enableCourseHighlightsEmailsQuery(courseId));
    closeEnableHighlightsModal();
  };

  const handleInternetConnectionFailed = () => {
    dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
  };

  const handleOpenHighlightsModal = (section) => {
    dispatch(setCurrentItem(section));
    dispatch(setCurrentSection(section));
    openHighlightsModal();
  };

  const handleHighlightsFormSubmit = (highlights) => {
    const dataToSend = Object.values(highlights).filter(Boolean);
    dispatch(updateCourseSectionHighlightsQuery(currentItem.id, dataToSend));

    closeHighlightsModal();
  };

  const handlePublishItemSubmit = () => {
    dispatch(publishCourseItemQuery(currentItem.id, currentSection.id));

    closePublishModal();
  };

  const handleConfigureModalClose = () => {
    closeConfigureModal();
    // reset the currentItem so the ConfigureModal's state is also reset
    dispatch(setCurrentItem({}));
  };

  const handleConfigureItemSubmit = (...arg) => {
    switch (currentItem.category) {
      case COURSE_BLOCK_NAMES.chapter.id:
        dispatch(configureCourseSectionQuery(currentSection.id, ...arg));
        break;
      case COURSE_BLOCK_NAMES.sequential.id:
        dispatch(configureCourseSubsectionQuery(currentItem.id, currentSection.id, ...arg));
        break;
      case COURSE_BLOCK_NAMES.vertical.id:
        dispatch(configureCourseUnitQuery(currentItem.id, currentSection.id, ...arg));
        break;
      default:
        return;
    }
    handleConfigureModalClose();
  };

  const handleEditSubmit = (itemId, sectionId, displayName) => {
    dispatch(editCourseItemQuery(itemId, sectionId, displayName));
  };

  const handleDeleteItemSubmit = () => {
    switch (currentItem.category) {
      case COURSE_BLOCK_NAMES.chapter.id:
        dispatch(deleteCourseSectionQuery(currentItem.id));
        break;
      case COURSE_BLOCK_NAMES.sequential.id:
        dispatch(deleteCourseSubsectionQuery(currentItem.id, currentSection.id));
        break;
      case COURSE_BLOCK_NAMES.vertical.id:
        dispatch(deleteCourseUnitQuery(
          currentItem.id,
          currentSubsection.id,
          currentSection.id,
        ));
        break;
      default:
        return;
    }
    closeDeleteModal();
  };

  const handleDuplicateSectionSubmit = () => {
    dispatch(duplicateSectionQuery(currentSection.id, courseStructure.id));
  };

  const handleDuplicateSubsectionSubmit = () => {
    dispatch(duplicateSubsectionQuery(currentSubsection.id, currentSection.id));
  };

  const handleDuplicateUnitSubmit = () => {
    dispatch(duplicateUnitQuery(currentItem.id, currentSubsection.id, currentSection.id));
  };

  const handleVideoSharingOptionChange = (value) => {
    dispatch(setVideoSharingOptionQuery(courseId, value));
  };

  const handleDismissNotification = () => {
    dispatch(dismissNotificationQuery(`${getConfig().STUDIO_BASE_URL}${notificationDismissUrl}`));
  };

  const handleSectionDragAndDrop = (
    sectionListIds,
    restoreSectionList,
  ) => {
    dispatch(setSectionOrderListQuery(
      courseId,
      sectionListIds,
      restoreSectionList,
    ));
  };

  const handleSubsectionDragAndDrop = (
    sectionId,
    prevSectionId,
    subsectionListIds,
    restoreSectionList,
  ) => {
    dispatch(setSubsectionOrderListQuery(
      sectionId,
      prevSectionId,
      subsectionListIds,
      restoreSectionList,
    ));
  };

  const handleUnitDragAndDrop = (
    sectionId,
    prevSectionId,
    subsectionId,
    unitListIds,
    restoreSectionList,
  ) => {
    dispatch(setUnitOrderListQuery(
      sectionId,
      subsectionId,
      prevSectionId,
      unitListIds,
      restoreSectionList,
    ));
  };

  useEffect(() => {
    dispatch(fetchCourseOutlineIndexQuery(courseId));
    dispatch(fetchCourseBestPracticesQuery({ courseId }));
    dispatch(fetchCourseLaunchQuery({ courseId }));
  }, [courseId]);

  // Course config hook for course-level metadata
  const { courseConfig, refetch: refetchCourseConfig } = useCourseConfig(courseId);

  const handleEditCourseSubmit = async (values) => {
    try {
      // `values` should be the raw form values from ConfigureModal. Build
      // a backend-friendly payload here and ensure final_evaluation_type is
      // included exactly as the backend expects (support both short keys
      // like 'project'/'quiz' coming from the form and human-readable
      // Vietnamese text stored previously).
      let finalEval = '';
      if (values.finalEvaluationType) {
        // If the form provides the short keys 'project' or 'quiz', send them as-is
        if (values.finalEvaluationType === 'project' || values.finalEvaluationType === 'quiz') {
          finalEval = values.finalEvaluationType;
        } else {
          // Attempt to normalize human-readable/Vietnamese labels back to short keys
          const v = String(values.finalEvaluationType).toLowerCase();
          if (v.includes('nộp') || v.includes('thu hoạch') || v.includes('project')) {
            finalEval = 'project';
          } else if (v.includes('trắc nghiệm') || v.includes('làm bài') || v.includes('quiz')) {
            finalEval = 'quiz';
          } else {
            // Unknown value — pass through to avoid data loss
            finalEval = values.finalEvaluationType;
          }
        }
      } else {
        // preserve existing config value if form didn't set it; try to normalize
        const existing = courseConfig?.final_evaluation_type || '';
        const ex = String(existing).toLowerCase();
        if (ex === 'project' || ex === 'quiz') {
          finalEval = existing;
        } else if (ex.includes('nộp') || ex.includes('thu hoạch')) {
          finalEval = 'project';
        } else if (ex.includes('trắc nghiệm') || ex.includes('làm bài')) {
          finalEval = 'quiz';
        } else {
          finalEval = existing;
        }
      }

      const payload = {
        title: values.displayName || courseConfig?.title || 'Untitled Course',
        display_name: values.displayName || undefined,
        short_description: values.shortDescription || '',
        course_type: values.courseType || '',
        course_level: values.courseLevel || '',
        estimated_hours: values.estimatedHours === '' ? null : values.estimatedHours || null,
        online_course_link: values.onlineCourseLink || '',
        instructor: values.instructor || '',
        start_date: values.courseStartDate || null,
        end_date: values.courseEndDate || null,
        final_evaluation_type: finalEval,
      };
      await updateCourseDetail(courseId, payload);
      // Refetch outline and course config for UI
      dispatch(fetchCourseOutlineIndexQuery(courseId));
      refetchCourseConfig();
      closeEditCourseModal();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update course detail', err);
      throw err;
    }
  };

  // Debug: log when modal open state changes
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[useCourseOutline] isEditCourseModalOpen =', isEditCourseModalOpen);
  }, [isEditCourseModalOpen]);

  useEffect(() => {
    if (createdOn && moment(new Date(createdOn)).isAfter(moment().subtract(31, 'days'))) {
      dispatch(syncDiscussionsTopics(courseId));
    }
  }, [createdOn, courseId]);

  useEffect(() => {
    setShowSuccessAlert(reIndexLoadingStatus === RequestStatus.SUCCESSFUL);
  }, [reIndexLoadingStatus]);

  return {
    courseUsageKey: courseStructure?.id,
    courseConfig,
    courseActions,
    savingStatus,
    sectionsList,
    isCustomRelativeDatesActive,
    isLoading: outlineIndexLoadingStatus === RequestStatus.IN_PROGRESS,
    isLoadingDenied: outlineIndexLoadingStatus === RequestStatus.DENIED,
    isReIndexShow: Boolean(reindexLink),
    showSuccessAlert,
    isDisabledReindexButton,
    isSectionsExpanded,
    isPublishModalOpen,
    openPublishModal,
    closePublishModal,
    isConfigureModalOpen,
    openConfigureModal,
  isEditCourseModalOpen,
  openEditCourseModal,
  closeEditCourseModal,
  handleEditCourseSubmit,
    isAddLibrarySectionModalOpen,
    openAddLibrarySectionModal,
    closeAddLibrarySectionModal,
    handleConfigureModalClose,
    headerNavigationsActions,
    handleEnableHighlightsSubmit,
    handleHighlightsFormSubmit,
    handleConfigureItemSubmit,
    handlePublishItemSubmit,
    handleEditSubmit,
    statusBarData,
    isEnableHighlightsModalOpen,
    openEnableHighlightsModal,
    closeEnableHighlightsModal,
    isInternetConnectionAlertFailed: isSavingStatusFailed,
    handleInternetConnectionFailed,
    handleOpenHighlightsModal,
    isHighlightsModalOpen,
    closeHighlightsModal,
    courseName: courseStructure?.displayName,
    isDeleteModalOpen,
    closeDeleteModal,
    openDeleteModal,
    handleDeleteItemSubmit,
    handleDuplicateSectionSubmit,
    handleDuplicateSubsectionSubmit,
    handleDuplicateUnitSubmit,
    handleNewSectionSubmit,
    handleNewSubsectionSubmit,
    getUnitUrl,
    openUnitPage,
    handleNewUnitSubmit,
    handleAddUnitFromLibrary,
    handleAddSubsectionFromLibrary,
    handleAddSectionFromLibrary,
    handleVideoSharingOptionChange,
    handlePasteClipboardClick,
    notificationDismissUrl,
    discussionsSettings,
    discussionsIncontextLearnmoreUrl,
    deprecatedBlocksInfo,
    proctoringErrors,
    mfeProctoredExamSettingsUrl,
    handleDismissNotification,
    advanceSettingsUrl,
    genericSavingStatus,
    handleSectionDragAndDrop,
    handleSubsectionDragAndDrop,
    handleUnitDragAndDrop,
    errors,
    resetScrollState,
  };
};

export { useCourseOutline };
