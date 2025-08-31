import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useToggle } from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';

import { getSavingStatus as getGenericSavingStatus } from '@src/generic/data/selectors';
import { useWaffleFlags } from '@src/data/apiHooks';
import { RequestStatus } from '@src/data/constants';
import { COURSE_BLOCK_NAMES } from './constants';
import {
  setCurrentItem,
  resetScrollField,
  updateSavingStatus,
} from './data/slice';
import {
  getLoadingStatus,
  getOutlineIndexData,
  getSavingStatus,
  getStatusBarData,
  getCourseActions,
  getCurrentItem,
  getCustomRelativeDatesActiveFlag,
  getErrors,
  getSectionsList,
} from './data/selectors';
import {
  addNewUnitQuery,
  deleteCourseUnitQuery,
  editCourseItemQuery,
  duplicateUnitQuery,
  fetchCourseOutlineIndexQuery,
  publishCourseItemQuery,
  configureCourseUnitQuery,
  setVideoSharingOptionQuery,
  dismissNotificationQuery,
} from './data/thunk';
import { useCreateCourseBlock } from './data/apiHooks';
import { getCourseItem } from './data/api';
import { 
  getSimplifiedCourseOutlineIndex,
  addNewSimplifiedUnit,
  setSimplifiedUnitOrderList,
} from './data/simplified-api';

const useSimplifiedCourseOutline = ({ courseId }) => {
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
  
  const { outlineIndexLoadingStatus } = useSelector(getLoadingStatus);
  const statusBarData = useSelector(getStatusBarData);
  const savingStatus = useSelector(getSavingStatus);
  const courseActions = useSelector(getCourseActions);
  const currentItem = useSelector(getCurrentItem);
  const isCustomRelativeDatesActive = useSelector(getCustomRelativeDatesActiveFlag);
  const genericSavingStatus = useSelector(getGenericSavingStatus);
  const errors = useSelector(getErrors);

  const [isPublishModalOpen, openPublishModal, closePublishModal] = useToggle(false);
  const [isConfigureModalOpen, openConfigureModal, closeConfigureModal] = useToggle(false);
  const [isDeleteModalOpen, openDeleteModal, closeDeleteModal] = useToggle(false);
  const [isAddLibraryModalOpen, openAddLibraryModal, closeAddLibraryModal] = useToggle(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [units, setUnits] = useState([]);

  const isSavingStatusFailed = savingStatus === RequestStatus.FAILED || genericSavingStatus === RequestStatus.FAILED;

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

  const handleNewUnitSubmit = async () => {
    try {
      // Try to use simplified API first
      try {
        const response = await addNewSimplifiedUnit(courseStructure.id, 'New Unit');
        // Refresh the units list
        const updatedOutline = await getSimplifiedCourseOutlineIndex(courseId);
        setUnits(updatedOutline.units || []);
        // Navigate to the new unit
        if (response.locator) {
          openUnitPage(response.locator);
        }
      } catch (simplifiedError) {
        // Fallback to regular unit creation
        // Create a new unit using the regular API (requires section/subsection structure)
        console.log('Simplified unit creation not available, using regular method');
        dispatch(addNewUnitQuery(courseStructure.id, openUnitPage));
      }
    } catch (error) {
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };

  const handleAddUnitFromLibrary = useCreateCourseBlock(openUnitPage);

  const resetScrollState = () => {
    dispatch(resetScrollField());
  };

  const handleInternetConnectionFailed = () => {
    dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
  };

  const handlePublishItemSubmit = () => {
    dispatch(publishCourseItemQuery(currentItem.id, null));
    closePublishModal();
  };

  const handleConfigureModalClose = () => {
    closeConfigureModal();
    dispatch(setCurrentItem({}));
  };

  const handleConfigureItemSubmit = (...args) => {
    if (currentItem.category === COURSE_BLOCK_NAMES.vertical.id) {
      dispatch(configureCourseUnitQuery(currentItem.id, null, ...args));
    }
    handleConfigureModalClose();
  };

  const handleEditSubmit = (itemId, sectionId, displayName) => {
    dispatch(editCourseItemQuery(itemId, null, displayName));
  };

  const handleDeleteItemSubmit = () => {
    if (currentItem.category === COURSE_BLOCK_NAMES.vertical.id) {
      dispatch(deleteCourseUnitQuery(currentItem.id, null, null));
    }
    closeDeleteModal();
  };

  const handleDuplicateUnitSubmit = () => {
    dispatch(duplicateUnitQuery(currentItem.id, null, null));
  };

  const handleVideoSharingOptionChange = (value) => {
    dispatch(setVideoSharingOptionQuery(courseId, value));
  };

  const handleDismissNotification = () => {
    dispatch(dismissNotificationQuery(`${getConfig().STUDIO_BASE_URL}${notificationDismissUrl}`));
  };

  const handleUnitDragAndDrop = async (unitIds, restoreUnitList) => {
    try {
      await setSimplifiedUnitOrderList(courseId, unitIds);
    } catch (error) {
      restoreUnitList();
      dispatch(updateSavingStatus({ status: RequestStatus.FAILED }));
    }
  };

  // Load simplified course outline data
  useEffect(() => {
    const loadSimplifiedOutline = async () => {
      try {
        // First load the regular course outline for basic data
        dispatch(fetchCourseOutlineIndexQuery(courseId));
        
        // Then try to load simplified structure if available
        try {
          const simplifiedData = await getSimplifiedCourseOutlineIndex(courseId);
          if (simplifiedData.units) {
            setUnits(simplifiedData.units);
          }
        } catch (err) {
          // Fallback: extract units from regular sections structure
          console.log('Simplified API not available, using fallback extraction');
          // The regular course outline data will be available via selectors
          // and we'll extract units in the component
        }
      } catch (error) {
        console.error('Error loading simplified outline:', error);
      }
    };

    loadSimplifiedOutline();
  }, [courseId, dispatch]);

  // Additional effect to handle fallback unit extraction from sections
  const sectionsList = useSelector(getSectionsList);
  
  useEffect(() => {
    if (units.length === 0 && sectionsList.length > 0) {
      // Fallback: extract units from sections structure
      const extractedUnits = [];
      sectionsList.forEach(section => {
        if (section.childInfo?.children) {
          section.childInfo.children.forEach(subsection => {
            if (subsection.childInfo?.children) {
              subsection.childInfo.children.forEach(unit => {
                extractedUnits.push({
                  ...unit,
                  parentSectionId: section.id,
                  parentSubsectionId: subsection.id,
                });
              });
            }
          });
        }
      });
      setUnits(extractedUnits);
    }
  }, [sectionsList, units.length]);

  return {
    courseUsageKey: courseStructure?.id,
    courseActions,
    savingStatus,
    units,
    isCustomRelativeDatesActive,
    isLoading: outlineIndexLoadingStatus === RequestStatus.IN_PROGRESS,
    isLoadingDenied: outlineIndexLoadingStatus === RequestStatus.DENIED,
    showSuccessAlert,
    isPublishModalOpen,
    openPublishModal,
    closePublishModal,
    isConfigureModalOpen,
    openConfigureModal,
    isAddLibraryModalOpen: isAddLibraryModalOpen,
    openAddLibraryModal,
    closeAddLibraryModal,
    handleConfigureModalClose,
    handlePublishItemSubmit,
    handleEditSubmit,
    statusBarData,
    isInternetConnectionAlertFailed: isSavingStatusFailed,
    handleInternetConnectionFailed,
    courseName: courseStructure?.displayName,
    isDeleteModalOpen,
    closeDeleteModal,
    openDeleteModal,
    handleDeleteItemSubmit,
    handleDuplicateUnitSubmit,
    getUnitUrl,
    openUnitPage,
    handleNewUnitSubmit,
    handleAddUnitFromLibrary,
    handleVideoSharingOptionChange,
    notificationDismissUrl,
    discussionsSettings,
    discussionsIncontextLearnmoreUrl,
    deprecatedBlocksInfo,
    proctoringErrors,
    mfeProctoredExamSettingsUrl,
    handleDismissNotification,
    advanceSettingsUrl,
    genericSavingStatus,
    handleUnitDragAndDrop,
    errors,
    resetScrollState,
    handleConfigureItemSubmit,
  };
};

export { useSimplifiedCourseOutline };
