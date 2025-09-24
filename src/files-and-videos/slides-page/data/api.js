/* eslint-disable no-param-reassign */
import saveAs from 'file-saver';
import { camelCaseObject, ensureConfig, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient, getHttpClient } from '@edx/frontend-platform/auth';
import { isEmpty } from 'lodash';

/**
 * Fetches the slides for pr/**
 * Fetches the course slide list for provided course
 * @param {string} courseId
 * @returns {Promise<[{}]>}
 */
export async function getSlides(courseId) {
  const { data } = await getAuthenticatedHttpClient()
    .get(getSlidesUrl(courseId));
  return camelCaseObject(data);
}

/**
 * Fetches unit-specific slides
 * @param {string} unitId
 * @returns {Promise<[{}]>}
 */
export async function getUnitSlides(unitId) {
  const { data } = await getAuthenticatedHttpClient()
    .get(getUnitSlidesUrl(unitId));
  return camelCaseObject(data);
}

/*
 * @param {string} courseId The course ID
 * @param {File} file The slide file to upload
 * @param {AbortController} controller Controller for cancelling requests
 * @param {string} unitId Optional unit ID for unit-specific uploads
 */
export async function addSlide(courseId, file, controller, unitId = null) {
  // Both unit-specific and course-level uploads now use presigned URL approach
  const postJson = {
    files: [{ file_name: file.name, content_type: file.type }],
  };

  if (unitId) {
    // Use unit-specific API endpoint
    return getAuthenticatedHttpClient().post(
      `${getApiBaseUrl()}/api/contentstore/v1/units/${unitId}/slides/`,
      postJson,
      { signal: controller?.signal },
    );
  }
  
  // Use course-level API endpoint
  return getAuthenticatedHttpClient().post(
    getCourseSlidesApiUrl(courseId),
    postJson,
    { signal: controller?.signal },
  );
};

ensureConfig([
  'STUDIO_BASE_URL',
], 'Course Apps API service');

export const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;
export const getSlidesUrl = (courseId) => `${getApiBaseUrl()}/api/contentstore/v1/slides/${courseId}`;
export const getUnitSlidesUrl = (unitId) => `${getApiBaseUrl()}/api/contentstore/v1/units/${unitId}/slides/`;
export const getCourseSlidesApiUrl = (courseId) => `${getApiBaseUrl()}/slides/${courseId}`;

// Finalize unit slide upload to persist metadata (e.g., file size)
export async function finalizeUnitSlide(unitId, slideId) {
  return getAuthenticatedHttpClient().post(
    `${getApiBaseUrl()}/api/contentstore/v1/units/${unitId}/slides/${slideId}/finalize/`,
    {},
  );
}

/**
 * Fetches the course slide list for provided course
 * @param {string} courseId
 * @returns {Promise<[{}]>}
 */
export async function fetchSlideList(courseId) {
  const { data } = await getAuthenticatedHttpClient()
    .get(getCourseSlidesApiUrl(courseId));
  return camelCaseObject(data);
}

/**
 * Delete slide from course.
 * @param {string} courseId Course ID for the course to operate on
 * @param {string} slideId Slide ID to delete
 */
export async function deleteSlide(courseId, slideId) {
  await getAuthenticatedHttpClient()
    .delete(`${getCourseSlidesApiUrl(courseId)}/${slideId}`);
}


/**
 * Upload slide file to S3 bucket
 * @param {string} uploadUrl The presigned S3 URL to upload to
 * @param {File} uploadFile The file to upload
 * @param {Object} uploadingIdsRef Reference to upload progress tracking
 * @param {string} slideId The slide ID for tracking
 * @param {AbortController} controller Controller for cancelling requests
 */
export async function uploadSlide(
  uploadUrl,
  uploadFile,
  uploadingIdsRef,
  slideId,
  controller,
) {
  const currentUpload = uploadingIdsRef.current.uploadData[slideId];
  
  console.log('Uploading slide to URL:', uploadUrl);
  console.log('File type:', uploadFile.type);
  console.log('File size:', uploadFile.size);
  
  try {
    const response = await getHttpClient().put(uploadUrl, uploadFile, {
      headers: {
        'Content-Type': uploadFile.type,
      },
      multipart: false,
      signal: controller?.signal,
      onUploadProgress: ({ loaded, total }) => {
        const progress = ((loaded / total) * 100).toFixed(2);
        uploadingIdsRef.current.uploadData[slideId] = {
          ...currentUpload,
          progress,
        };
      },
    });
    
    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', response.headers);
    
    return response;
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error response:', error.response);
    throw error;
  }
}

/**
 * Send slide upload status update
 * @param {string} courseId Course ID
 * @param {string} slideId Slide ID
 * @param {string} message Status message
 * @param {string} status Upload status
 */
export async function sendSlideUploadStatus(
  courseId,
  slideId,
  message,
  status,
) {
  return getAuthenticatedHttpClient()
    .post(getCourseSlidesApiUrl(courseId), [{
      slideId,
      message,
      status,
    }]);
}

/**
 * Get download for slide files
 * @param {Array} selectedRows Selected slide rows
 * @param {string} courseId Course ID
 */
export async function getSlideDownload(selectedRows, courseId) {
  const downloadErrors = [];
  let file;
  let filename;

  if (selectedRows?.length > 1) {
    const downloadLinks = selectedRows.map(row => {
      const slide = row.original;
      try {
        const url = slide.downloadLink;
        const name = slide.displayName;
        return { url, name };
      } catch (error) {
        downloadErrors.push(`Cannot find download file for ${slide?.displayName || 'slide'}.`);
        return null;
      }
    });

    if (!isEmpty(downloadLinks)) {
      const json = { files: downloadLinks };
      const { data } = await getAuthenticatedHttpClient()
        .put(`${getSlidesUrl(courseId)}/download`, json, { responseType: 'arraybuffer' });

      const date = new Date().toString();
      filename = `${courseId}-slides-${date}`;
      file = new Blob([data], { type: 'application/zip' });
      saveAs(file, filename);
    }
  } else if (selectedRows?.length === 1) {
    try {
      const slide = selectedRows[0].original;
      const { downloadLink } = slide;
      if (!isEmpty(downloadLink)) {
        saveAs(downloadLink, slide.displayName);
      } else {
        downloadErrors.push(`Cannot find download file for ${slide?.displayName}.`);
      }
    } catch (error) {
      downloadErrors.push('Failed to download slide.');
    }
  } else {
    downloadErrors.push('No files were selected to download.');
  }

  return downloadErrors;
}

/**
 * Fetch where a slide is used in a course.
 * @param {string} courseId Course ID for the course to operate on
 * @param {string} slideId Slide ID to get usage for
 */
export async function getSlideUsagePaths({ courseId, slideId }) {
  const { data } = await getAuthenticatedHttpClient()
    .get(`${getSlidesUrl(courseId)}/${slideId}/usage`);
  return camelCaseObject(data);
}

/**
 * Get all usage paths for multiple slides
 * @param {string} courseId Course ID
 * @param {Array} slideIds Array of slide IDs
 */
export async function getAllSlideUsagePaths({ courseId, slideIds }) {
  const apiPromises = slideIds.map(id => getAuthenticatedHttpClient()
    .get(`${getSlidesUrl(courseId)}/${id}/usage`, { slideId: id }));
  const updatedUsageLocations = [];
  const results = await Promise.allSettled(apiPromises);

  results.forEach(result => {
    const value = camelCaseObject(result.value);
    if (value) {
      const { usageLocations } = value.data;
      const activeStatus = usageLocations?.length > 0 ? 'active' : 'inactive';
      const { slideId } = value.config;
      updatedUsageLocations.push({ id: slideId, usageLocations, activeStatus });
    }
  });
  return updatedUsageLocations;
}


