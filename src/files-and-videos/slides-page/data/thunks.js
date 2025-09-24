/* eslint-disable no-param-reassign */
import { camelCase, isEmpty } from 'lodash';
import { camelCaseObject } from '@edx/frontend-platform';
import { RequestStatus } from '../../../data/constants';
import {
  addModels,
  removeModel,
  updateModel,
  updateModels,
} from '../../../generic/model-store';
import {
  addSlide,
  getSlides,
  getUnitSlides,
  uploadSlide,
  getSlideDownload,
  deleteSlide as deleteSlideApi,
  sendSlideUploadStatus,
  getSlideUsagePaths as getSlideUsagePathsAPI,
  getAllSlideUsagePaths,
  finalizeUnitSlide,
} from './api';
import {
  setSlideIds,
  setPageSettings,
  updateLoadingStatus,
  deleteSlideSuccess,
  updateErrors,
  clearErrors,
  updateEditStatus,
  failAddSlide,
} from './slice';
import { ServerError } from '../../videos-page/data/errors';
import { updateSlideValues } from './utils';

let controllers = [];

const updateSlideUploadStatus = async (courseId, slideId, message, status) => {
  await sendSlideUploadStatus(courseId, slideId, message, status);
};

export function cancelAllSlideUploads(courseId, uploadData) {
  return async (dispatch) => {
    if (controllers) {
      controllers.forEach(control => {
        control.abort();
      });
      Object.entries(uploadData).forEach(([key, value]) => {
        if (value.status === RequestStatus.IN_PROGRESS) {
          updateSlideUploadStatus(
            courseId,
            key,
            'Upload failed',
            'upload_failed',
          );
          dispatch(
            updateErrors({
              error: 'add',
              message: `Cancelled upload for ${value.name}.`,
            }),
          );
        }
      });
      dispatch(updateEditStatus({ editType: 'add', status: RequestStatus.FAILED }));
    }
    controllers = [];
  };
}

export function fetchSlides(courseId) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.IN_PROGRESS }),
    );
    try {
      const { previousUploads, ...data } = await getSlides(courseId);
      dispatch(setPageSettings({ ...data }));

      if (isEmpty(previousUploads)) {
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
        );
      } else {
  const parsedSlides = updateSlideValues(previousUploads);
        const slideIds = parsedSlides.map((slide) => slide.id);
        dispatch(addModels({ modelType: 'slides', models: parsedSlides }));
        dispatch(setSlideIds({ slideIds }));
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.PARTIAL }),
        );
        if (process.env.FEATURE_SLIDE_USAGE === 'true') {
          const allUsageLocations = await getAllSlideUsagePaths({
            courseId,
            slideIds,
          });
          dispatch(
            updateModels({ modelType: 'slides', models: allUsageLocations }),
          );
        }
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        dispatch(updateLoadingStatus({ status: RequestStatus.DENIED }));
      } else {
        dispatch(
          updateErrors({ error: 'loading', message: 'Failed to load slides' }),
        );
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.FAILED }),
        );
      }
    }
  };
}

export function fetchUnitSlides(unitId) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId: 'unit', status: RequestStatus.IN_PROGRESS }),
    );
    try {
      const data = await getUnitSlides(unitId);
      const { results = [] } = data;

      if (isEmpty(results)) {
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.SUCCESSFUL }),
        );
      } else {
        const parsedSlides = updateSlideValues(results);
        const slideIds = parsedSlides.map((slide) => slide.id);
        dispatch(addModels({ modelType: 'slides', models: parsedSlides }));
        dispatch(setSlideIds({ slideIds }));
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.SUCCESSFUL }),
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        dispatch(updateLoadingStatus({ status: RequestStatus.DENIED }));
      } else {
        dispatch(
          updateErrors({ error: 'loading', message: 'Failed to load unit slides' }),
        );
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.FAILED }),
        );
      }
    }
  };
}

export function resetSlideErrors({ errorType }) {
  return (dispatch) => {
    dispatch(clearErrors({ error: errorType }));
  };
}

export function updateSlideOrder(courseId, slideIds) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.IN_PROGRESS }),
    );
    dispatch(setSlideIds({ slideIds }));
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
    );
  };
}

export function deleteSlideFile(courseId, id) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'delete',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    try {
      await deleteSlide(courseId, id);
      dispatch(deleteSlideSuccess({ slideId: id }));
      dispatch(removeModel({ modelType: 'slides', id }));
      dispatch(
        updateEditStatus({
          editType: 'delete',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'delete',
          message: `Failed to delete file id ${id}.`,
        }),
      );
      dispatch(
        updateEditStatus({ editType: 'delete', status: RequestStatus.FAILED }),
      );
    }
  };
}

export function markSlideUploadsInProgressAsFailed({ uploadingIdsRef, courseId }) {
  return (dispatch) => {
    Object.keys(uploadingIdsRef.current.uploadData).forEach((slideId) => {
      try {
        updateSlideUploadStatus(
          courseId,
          slideId || '',
          'Upload failed',
          'upload_failed',
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to send "Failed" upload status for ${slideId} onbeforeunload`);
      }
      dispatch(updateEditStatus({ editType: 'add', status: '' }));
    });
  };
}

const addSlideToServer = async (courseId, file, dispatch, unitId = null) => {
  console.log('addSlideToServer called with:', { courseId, fileName: file.name, fileType: file.type, unitId });
  
  const currentController = new AbortController();
  controllers.push(currentController);
  try {
    console.log('Making request to add slide...');
  const createUrlResponse = await addSlide(courseId, file, currentController, unitId);
    console.log('addSlide response:', createUrlResponse);
    
    if (createUrlResponse.status < 200 || createUrlResponse.status >= 300) {
      console.error('Bad response status:', createUrlResponse.status);
      dispatch(failAddSlide({ fileName: file.name }));
    }
    const responseData = camelCaseObject(createUrlResponse.data);
    const filesArr = responseData.files || [];
    const first = filesArr[0] || {};
    const uploadUrl = first.uploadUrl;
    const slideId = first.id || first.slideId; // backend returns `id`
    const publicUrl = first.publicUrl;
    console.log('Extracted from response:', { uploadUrl, slideId, publicUrl });
    return { uploadUrl, slideId, publicUrl };
  } catch (error) {
    console.error('Error in addSlideToServer:', error);
    dispatch(failAddSlide({ fileName: file.name }));
    return {};
  }
};

const uploadToBucket = async ({
  courseId,
  uploadUrl,
  file,
  uploadingIdsRef,
  slideId,
  dispatch,
  unitId = null,
}) => {
  const currentController = new AbortController();
  controllers.push(currentController);
  const currentSlideData = uploadingIdsRef.current.uploadData[slideId];

  try {
    const putToServerResponse = await uploadSlide(
      uploadUrl,
      file,
      uploadingIdsRef,
      slideId,
      currentController,
    );
    if (
      putToServerResponse.status < 200
      || putToServerResponse.status >= 300
    ) {
      throw new ServerError(
        'Server responded with an error status',
        putToServerResponse.status,
      );
    } else {
      uploadingIdsRef.current.uploadData[slideId] = {
        ...currentSlideData,
        status: RequestStatus.SUCCESSFUL,
      };
      // Skip status updates for unit-specific uploads
      if (!unitId) {
        updateSlideUploadStatus(
          courseId,
          slideId,
          'Upload completed',
          'upload_completed',
        );
      }
      // For unit uploads, refresh the unit slide list to update file size and URLs
      if (unitId) {
        try {
          await dispatch(fetchUnitSlides(unitId));
          const size = file.size || 0;
          const formatted = (() => {
            if (size < 1024) return `${size} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
            if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
            return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          })();
          // Persist size server-side
          try {
            await finalizeUnitSlide(unitId, slideId);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Finalize unit slide failed (non-blocking):', e?.message || e);
          }
          // Update local model with latest size
          dispatch(updateModel({
            modelType: 'slides',
            model: {
              id: slideId,
              fileSize: size,
              formattedFileSize: formatted,
              unitId,
            },
          }));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to refresh unit slides after upload', e);
        }
      }
    }
    return false;
  } catch (error) {
    if (error.response && error.response.status === 413) {
      const message = error.response.data.error;
      dispatch(updateErrors({ error: 'add', message }));
    } else {
      dispatch(
        updateErrors({
          error: 'add',
          message: `Failed to upload ${file.name}.`,
        }),
      );
      uploadingIdsRef.current.uploadData[slideId] = {
        ...currentSlideData,
        status: RequestStatus.FAILED,
      };
    }
    // Skip status updates for unit-specific uploads
    if (!unitId) {
      updateSlideUploadStatus(
        courseId,
        slideId || '',
        'Upload failed',
        'upload_failed',
      );
    }
    return true;
  }
};

export const newSlideUploadData = ({
  status,
  slideId,
  currentData,
  key,
  originalValue,
}) => {
  const newData = currentData;
  if (slideId && slideId !== key) {
    newData[slideId] = { ...originalValue, status };
    delete newData[key];
    return newData;
  }

  newData[key] = { ...originalValue, status };
  return newData;
};

export function addSlideFile(
  courseId,
  files,
  slideIds,
  uploadingIdsRef,
  unitId = null,
) {
  return async (dispatch) => {
    console.log('addSlideFile thunk called with:', {
      courseId,
      files,
      slideIds,
      uploadingIdsRef: uploadingIdsRef?.current,
      unitId
    });
    
    dispatch(
      updateEditStatus({ editType: 'add', status: RequestStatus.IN_PROGRESS }),
    );
    let hasFailure = false;
    await Promise.all(files.map(async (file, idx) => {
      const name = file?.name || `Slide ${idx + 1}`;
      const progress = 0;

      uploadingIdsRef.current.uploadData = newSlideUploadData({
        status: RequestStatus.PENDING,
        currentData: uploadingIdsRef.current.uploadData,
        originalValue: { name, progress },
        key: `slide_${idx}`,
      });

  const { slideId, uploadUrl } = await addSlideToServer(courseId, file, dispatch, unitId);

      if (uploadUrl && slideId) {
        uploadingIdsRef.current.uploadData = newSlideUploadData({
          status: RequestStatus.IN_PROGRESS,
          currentData: uploadingIdsRef.current.uploadData,
          originalValue: { name, progress },
          key: `slide_${idx}`,
          slideId,
        });
        hasFailure = await uploadToBucket({
          courseId, uploadUrl, file, uploadingIdsRef, slideId, dispatch, unitId,
        });
        // Upload succeeded
        if (!hasFailure) {
          uploadingIdsRef.current.uploadData[slideId] = {
            ...uploadingIdsRef.current.uploadData[slideId],
            status: RequestStatus.SUCCESSFUL,
            processing: false,
          };
        }
      } else {
        hasFailure = true;
        uploadingIdsRef.current.uploadData[idx] = {
          status: RequestStatus.FAILED,
          name,
          progress,
        };
      }
    }));

    try {
      if (unitId) {
        await dispatch(fetchUnitSlides(unitId));
      } else {
        const response = await fetchSlideList(courseId);
        const slides = response.previousUploads || [];
        const newSlides = slides.filter(
          (slide) => !slideIds.includes(slide.slide_id || slide.slideId),
        );
        const newSlideIds = newSlides.map((slide) => slide.slide_id || slide.slideId);
        const parsedSlides = updateSlideValues(newSlides, true);
        dispatch(addModels({ modelType: 'slides', models: parsedSlides }));
        dispatch(setSlideIds({ slideIds: newSlideIds.concat(slideIds) }));
      }
    } catch (error) {
      dispatch(
        updateEditStatus({ editType: 'add', status: RequestStatus.FAILED }),
      );
      // eslint-disable-next-line no-console
      console.error(`fetchSlideList failed with message: ${error.message}`);
      hasFailure = true;
      dispatch(
        updateErrors({ error: 'add', message: 'Failed to load slides' }),
      );
    }

    if (hasFailure) {
      dispatch(updateEditStatus({ editType: 'add', status: RequestStatus.FAILED }));
    } else {
      dispatch(updateEditStatus({ editType: 'add', status: RequestStatus.SUCCESSFUL }));
    }

    uploadingIdsRef.current = {
      uploadData: {},
      uploadCount: 0,
    };
  };
}

export function getSlideUsagePaths({ slide, courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'usageMetrics',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      const { usageLocations } = await getSlideUsagePathsAPI({
        slideId: slide.id,
        courseId,
      });
      const activeStatus = usageLocations?.length > 0 ? 'active' : 'inactive';

      dispatch(
        updateModel({
          modelType: 'slides',
          model: {
            id: slide.id,
            usageLocations,
            activeStatus,
          },
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'usageMetrics',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'usageMetrics',
          message: `Failed to get usage metrics for ${slide.displayName}.`,
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'usageMetrics',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function fetchSlideDownload({ selectedRows, courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'download',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    try {
      const errors = await getSlideDownload(selectedRows, courseId);
      dispatch(
        updateEditStatus({
          editType: 'download',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
      if (!isEmpty(errors)) {
        errors.forEach((error) => {
          dispatch(updateErrors({ error: 'download', message: error }));
        });
        dispatch(
          updateEditStatus({
            editType: 'download',
            status: RequestStatus.FAILED,
          }),
        );
      }
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'download',
          message: 'Failed to download zip file of slides.',
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'download',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}
