/* eslint-disable no-param-reassign */
import { camelCase, isEmpty } from 'lodash';
import { getConfig, camelCaseObject } from '@edx/frontend-platform';
import { RequestStatus } from '../../../data/constants';
import {
  addModels,
  removeModel,
  updateModel,
  updateModels,
} from '../../../generic/model-store';
import {
  addThumbnail,
  addVideo,
  deleteVideo,
  deleteUnitVideo,
  fetchVideoList,
  getVideos,
  getUnitVideos,
  uploadVideo,
  getDownload,
  deleteTranscript,
  downloadTranscript,
  uploadTranscript,
  getVideoUsagePaths,
  deleteTranscriptPreferences,
  sendVideoUploadStatus,
  setTranscriptCredentials,
  setTranscriptPreferences,
  getAllUsagePaths,
  finalizeUnitVideo,
} from './api';
import {
  setVideoIds,
  setPageSettings,
  updateLoadingStatus,
  deleteVideoSuccess,
  updateErrors,
  clearErrors,
  updateEditStatus,
  updateTranscriptCredentialsSuccess,
  updateTranscriptPreferenceSuccess,
  failAddVideo,
} from './slice';
import { ServerError } from './errors';
import { updateFileValues } from './utils';

let controllers = [];

const updateVideoUploadStatus = async (courseId, edxVideoId, message, status) => {
  await sendVideoUploadStatus(courseId, edxVideoId, message, status);
};

export function cancelAllUploads(courseId, uploadData) {
  return async (dispatch) => {
    if (controllers) {
      controllers.forEach(control => {
        control.abort();
      });
      Object.entries(uploadData).forEach(([key, value]) => {
        if (value.status === RequestStatus.IN_PROGRESS) {
          updateVideoUploadStatus(
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

export function fetchVideos(courseId) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.IN_PROGRESS }),
    );
    try {
      const { previousUploads, ...data } = await getVideos(courseId);
      dispatch(setPageSettings({ ...data }));
      // Previous uploads are the current videos associated with a course.
      // If previous uploads are empty there is no need to add an empty model
      // or loop through and empty list so automatically set loading to successful
      if (isEmpty(previousUploads)) {
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
        );
      } else {
        const parsedVideos = updateFileValues(previousUploads);
        const videoIds = parsedVideos.map((video) => video.id);
        dispatch(addModels({ modelType: 'videos', models: parsedVideos }));
        dispatch(setVideoIds({ videoIds }));
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.PARTIAL }),
        );
        const allUsageLocations = await getAllUsagePaths({
          courseId,
          videoIds,
        });
        dispatch(
          updateModels({ modelType: 'videos', models: allUsageLocations }),
        );
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        dispatch(updateLoadingStatus({ status: RequestStatus.DENIED }));
      } else {
        dispatch(
          updateErrors({ error: 'loading', message: 'Failed to load videos' }),
        );
        dispatch(
          updateLoadingStatus({ courseId, status: RequestStatus.FAILED }),
        );
      }
    }
  };
}

export function fetchUnitVideos(unitId) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId: 'unit', status: RequestStatus.IN_PROGRESS }),
    );
    try {
      const data = await getUnitVideos(unitId);
      const { results = [] } = data;
      
      // If no videos, set loading to successful
      if (isEmpty(results)) {
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.SUCCESSFUL }),
        );
      } else {
        // Unit videos have a different format than course videos, so handle them separately
        const parsedVideos = results.map(video => ({
          ...video,
          // Add compatibility fields for the video system
          displayName: video.displayName || video.fileName,
          dateAdded: video.createdAt || new Date().toISOString(),
          wrapperType: video.fileType?.includes('mp4') ? 'MP4' : 
                      video.fileType?.includes('mov') ? 'MOV' : 'Unknown',
          thumbnail: null, // Unit videos don't have thumbnails yet
          transcriptStatus: 'notTranscribed', // Unit videos don't have transcripts yet
          activeStatus: 'active',
          usageLocations: [],
        }));
        
        console.log('Processed unit videos for Redux:', parsedVideos);
        const videoIds = parsedVideos.map((video) => video.id);
        dispatch(addModels({ modelType: 'videos', models: parsedVideos }));
        dispatch(setVideoIds({ videoIds }));
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.SUCCESSFUL }),
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        dispatch(updateLoadingStatus({ status: RequestStatus.DENIED }));
      } else {
        dispatch(
          updateErrors({ error: 'loading', message: 'Failed to load unit videos' }),
        );
        dispatch(
          updateLoadingStatus({ courseId: 'unit', status: RequestStatus.FAILED }),
        );
      }
    }
  };
}

export function resetErrors({ errorType }) {
  return (dispatch) => {
    dispatch(clearErrors({ error: errorType }));
  };
}

export function updateVideoOrder(courseId, videoIds) {
  return async (dispatch) => {
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.IN_PROGRESS }),
    );
    dispatch(setVideoIds({ videoIds }));
    dispatch(
      updateLoadingStatus({ courseId, status: RequestStatus.SUCCESSFUL }),
    );
  };
}

export function deleteVideoFile(courseId, id) {
  return async (dispatch, getState) => {
    dispatch(
      updateEditStatus({
        editType: 'delete',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    try {
      // Get video data to determine if it's a unit video or course video
      const state = getState();
      const video = state.models.videos[id];
      
      if (video && video.unitId) {
        // This is a unit video, use unit video deletion API
        await deleteUnitVideo(video.unitId, id);
      } else {
        // This is a course video, use course video deletion API
        await deleteVideo(courseId, id);
      }
      
      dispatch(deleteVideoSuccess({ videoId: id }));
      dispatch(removeModel({ modelType: 'videos', id }));
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

export function markVideoUploadsInProgressAsFailed({ uploadingIdsRef, courseId }) {
  return (dispatch) => {
    Object.keys(uploadingIdsRef.current.uploadData).forEach((edxVideoId) => {
      try {
        updateVideoUploadStatus(
          courseId,
          edxVideoId || '',
          'Upload failed',
          'upload_failed',
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to send "Failed" upload status for ${edxVideoId} onbeforeunload`);
      }
      dispatch(updateEditStatus({ editType: 'add', status: '' }));
    });
  };
}

const addVideoToEdxVal = async (courseId, file, dispatch, unitId = null) => {
  const currentController = new AbortController();
  controllers.push(currentController);
  try {
    const createUrlResponse = await addVideo(courseId, file, currentController, unitId);
    // eslint-disable-next-line
    console.log(`Post Response: ${JSON.stringify(createUrlResponse)}`);
    if (createUrlResponse.status < 200 || createUrlResponse.status >= 300) {
      dispatch(failAddVideo({ fileName: file.name }));
    }
    
    // Handle unit-specific API response format
    if (unitId) {
      const responseData = camelCaseObject(createUrlResponse.data);
      // Unit API returns {files: [fileObject], unitId: ..., mediaType: ...}
      if (responseData.files && responseData.files.length > 0) {
        const fileData = responseData.files[0]; // Get first file
        return { 
          uploadUrl: fileData.uploadUrl, 
          edxVideoId: fileData.id 
        };
      }
      return { uploadUrl: null, edxVideoId: null };
    }
    
    // Handle course-level API response format
    const [{ uploadUrl, edxVideoId }] = camelCaseObject(
      createUrlResponse.data,
    ).files;
    return { uploadUrl, edxVideoId };
  } catch (error) {
    dispatch(failAddVideo({ fileName: file.name }));
    return {};
  }
};

const uploadToBucket = async ({
  courseId,
  uploadUrl,
  file,
  uploadingIdsRef,
  edxVideoId,
  dispatch,
  unitId = null,
}) => {
  const currentController = new AbortController();
  controllers.push(currentController);
  const currentVideoData = uploadingIdsRef.current.uploadData[edxVideoId];

  try {
    const putToServerResponse = await uploadVideo(
      uploadUrl,
      file,
      uploadingIdsRef,
      edxVideoId,
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
      uploadingIdsRef.current.uploadData[edxVideoId] = {
        ...currentVideoData,
        status: RequestStatus.SUCCESSFUL,
      };
      // Skip status updates for unit-specific uploads
      if (!unitId) {
        updateVideoUploadStatus(
          courseId,
          edxVideoId,
          'Upload completed',
          'upload_completed',
        );
      }
      // For unit uploads, refresh the unit video list to update file size and URLs
      if (unitId) {
        try {
          await dispatch(fetchUnitVideos(unitId));
          // After refreshing, override the size with the actual uploaded file size
          const size = file.size || 0;
          const formatted = (() => {
            if (size < 1024) return `${size} B`;
            if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
            if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
            return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
          })();
          // Persist size on server (best-effort)
          try {
            await finalizeUnitVideo(unitId, edxVideoId);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Finalize unit video failed (non-blocking):', e?.message || e);
          }
          dispatch(updateModel({
            modelType: 'videos',
            model: {
              id: edxVideoId,
              fileSize: size,
              formattedFileSize: formatted,
              unitId,
            },
          }));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to refresh unit videos after upload', e);
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
      uploadingIdsRef.current.uploadData[edxVideoId] = {
        ...currentVideoData,
        status: RequestStatus.FAILED,
      };
    }
    // Skip status updates for unit-specific uploads
    if (!unitId) {
      updateVideoUploadStatus(
        courseId,
        edxVideoId || '',
        'Upload failed',
        'upload_failed',
      );
    }
    return true;
  }
};

export const newUploadData = ({
  status,
  edxVideoId,
  currentData,
  key,
  originalValue,
}) => {
  const newData = currentData;
  if (edxVideoId && edxVideoId !== key) {
    newData[edxVideoId] = { ...originalValue, status };
    delete newData[key];
    return newData;
  }

  newData[key] = { ...originalValue, status };
  return newData;
};

export function addVideoFile(
  courseId,
  files,
  videoIds,
  uploadingIdsRef,
  unitId = null,
) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({ editType: 'add', status: RequestStatus.IN_PROGRESS }),
    );
    let hasFailure = false;
    await Promise.all(files.map(async (file, idx) => {
      const name = file?.name || `Video ${idx + 1}`;
      const progress = 0;

      uploadingIdsRef.current.uploadData = newUploadData({
        status: RequestStatus.PENDING,
        currentData: uploadingIdsRef.current.uploadData,
        originalValue: { name, progress },
        key: `video_${idx}`,
      });

      const { edxVideoId, uploadUrl } = await addVideoToEdxVal(courseId, file, dispatch, unitId);

      if (uploadUrl && edxVideoId) {
        uploadingIdsRef.current.uploadData = newUploadData({
          status: RequestStatus.IN_PROGRESS,
          currentData: uploadingIdsRef.current.uploadData,
          originalValue: { name, progress },
          key: `video_${idx}`,
          edxVideoId,
        });
        hasFailure = await uploadToBucket({
          courseId, uploadUrl, file, uploadingIdsRef, edxVideoId, dispatch, unitId,
        });
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
      const response = await fetchVideoList(courseId);
      const videos = response.previousUploads || []; // Use previousUploads field
      const newVideos = videos.filter(
        (video) => !videoIds.includes(video.edxVideoId),
      );
      const newVideoIds = newVideos.map((video) => video.edxVideoId);
      const parsedVideos = updateFileValues(newVideos, true);
      dispatch(addModels({ modelType: 'videos', models: parsedVideos }));
      dispatch(setVideoIds({ videoIds: newVideoIds.concat(videoIds) }));
    } catch (error) {
      dispatch(
        updateEditStatus({ editType: 'add', status: RequestStatus.FAILED }),
      );
      // eslint-disable-next-line
      console.error(`fetchVideoList failed with message: ${error.message}`);
      hasFailure = true;
      dispatch(
        updateErrors({ error: 'add', message: 'Failed to load videos' }),
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

export function addVideoThumbnail({ file, videoId, courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'thumbnail',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    dispatch(resetErrors({ errorType: 'thumbnail' }));
    try {
      const { imageUrl } = await addThumbnail({ courseId, videoId, file });
      let thumbnail = imageUrl;
      if (thumbnail.startsWith('/')) {
        thumbnail = `${getConfig().STUDIO_BASE_URL}${imageUrl}`;
      }
      dispatch(
        updateModel({
          modelType: 'videos',
          model: {
            id: videoId,
            thumbnail,
          },
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'thumbnail',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      if (error.response?.data?.error) {
        const message = error.response.data.error;
        dispatch(updateErrors({ error: 'thumbnail', message }));
      } else {
        dispatch(
          updateErrors({
            error: 'thumbnail',
            message: `Failed to add thumbnail for video id ${videoId}.`,
          }),
        );
      }
      dispatch(
        updateEditStatus({
          editType: 'thumbnail',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function deleteVideoTranscript({
  language,
  videoId,
  transcripts,
  apiUrl,
}) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      await deleteTranscript({
        videoId,
        language,
        apiUrl,
      });
      const updatedTranscripts = transcripts.filter(
        (transcript) => transcript !== language,
      );
      const transcriptStatus = updatedTranscripts?.length > 0 ? 'transcribed' : 'notTranscribed';

      dispatch(
        updateModel({
          modelType: 'videos',
          model: {
            id: videoId,
            transcripts: updatedTranscripts,
            transcriptStatus,
          },
        }),
      );

      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'transcript',
          message: `Failed to delete ${language} transcript.`,
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function downloadVideoTranscript({
  language,
  videoId,
  filename,
  apiUrl,
}) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      await downloadTranscript({
        videoId,
        language,
        apiUrl,
        filename,
      });
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'transcript',
          message: `Failed to download ${filename}.`,
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function uploadVideoTranscript({
  language,
  newLanguage,
  videoId,
  file,
  apiUrl,
  transcripts,
}) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    const isReplacement = !isEmpty(language);

    try {
      await uploadTranscript({
        videoId,
        language,
        apiUrl,
        file,
        newLanguage,
      });
      let updatedTranscripts = transcripts;
      if (isReplacement) {
        const removeTranscript = transcripts.filter(
          (transcript) => transcript !== language,
        );
        updatedTranscripts = [...removeTranscript, newLanguage];
      } else {
        updatedTranscripts = [...transcripts, newLanguage];
      }

      const transcriptStatus = updatedTranscripts?.length > 0 ? 'transcribed' : 'notTranscribed';

      dispatch(
        updateModel({
          modelType: 'videos',
          model: {
            id: videoId,
            transcripts: updatedTranscripts,
            transcriptStatus,
          },
        }),
      );

      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      if (error.response?.data?.error) {
        const message = error.response.data.error;
        dispatch(updateErrors({ error: 'transcript', message }));
      } else {
        const message = isReplacement
          ? `Failed to replace ${language} with ${newLanguage}.`
          : `Failed to add ${newLanguage}.`;
        dispatch(updateErrors({ error: 'transcript', message }));
      }
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function getUsagePaths({ video, courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'usageMetrics',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      const { usageLocations } = await getVideoUsagePaths({
        videoId: video.id,
        courseId,
      });
      const activeStatus = usageLocations?.length > 0 ? 'active' : 'inactive';

      dispatch(
        updateModel({
          modelType: 'videos',
          model: {
            id: video.id,
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
          message: `Failed to get usage metrics for ${video.displayName}.`,
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

export function fetchVideoDownload({ selectedRows, courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'download',
        status: RequestStatus.IN_PROGRESS,
      }),
    );
    try {
      const errors = await getDownload(selectedRows, courseId);
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
          message: 'Failed to download zip file of videos.',
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

export function clearAutomatedTranscript({ courseId }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      await deleteTranscriptPreferences(courseId);
      dispatch(updateTranscriptPreferenceSuccess({ modified: new Date() }));
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'transcript',
          message: 'Failed to update order transcripts settings.',
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function updateTranscriptCredentials({ courseId, data }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      await setTranscriptCredentials(courseId, data);
      dispatch(
        updateTranscriptCredentialsSuccess({
          provider: camelCase(data.provider),
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      dispatch(
        updateErrors({
          error: 'transcript',
          message: `Failed to update ${data.provider} credentials.`,
        }),
      );
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}

export function updateTranscriptPreference({ courseId, data }) {
  return async (dispatch) => {
    dispatch(
      updateEditStatus({
        editType: 'transcript',
        status: RequestStatus.IN_PROGRESS,
      }),
    );

    try {
      const preferences = await setTranscriptPreferences(courseId, data);
      dispatch(updateTranscriptPreferenceSuccess(preferences));
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.SUCCESSFUL,
        }),
      );
    } catch (error) {
      if (error.response?.data?.error) {
        const message = error.response.data.error;
        dispatch(updateErrors({ error: 'transcript', message }));
      } else {
        dispatch(
          updateErrors({
            error: 'transcript',
            message: `Failed to update ${data.provider} transcripts settings.`,
          }),
        );
      }
      dispatch(
        updateEditStatus({
          editType: 'transcript',
          status: RequestStatus.FAILED,
        }),
      );
    }
  };
}
