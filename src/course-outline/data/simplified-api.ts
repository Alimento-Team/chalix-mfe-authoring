import { camelCaseObject, getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { XBlock } from '@src/data/types';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

/**
 * Get simplified course outline index that returns units directly under course
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
export async function getSimplifiedCourseOutlineIndex(courseId: string): Promise<any> {
  try {
    const { data } = await getAuthenticatedHttpClient()
      .get(`${getApiBaseUrl()}/api/contentstore/v1/course_index/${courseId}?simplified=true`);

    return camelCaseObject(data);
  } catch (error) {
    // If simplified API is not available, throw error to trigger fallback
    throw new Error('Simplified API not available');
  }
}

/**
 * Add new unit directly to course in simplified structure
 * @param {string} parentLocator - Course usage key
 * @param {string} displayName - Unit display name
 * @returns {Promise<Object>}
 */
export async function addNewSimplifiedUnit(parentLocator: string, displayName: string): Promise<object> {
  const { data } = await getAuthenticatedHttpClient()
    .post(`${getApiBaseUrl()}/xblock/`, {
      parent_locator: parentLocator,
      category: 'vertical',
      display_name: displayName,
      simplified_structure: true,
    });

  return data;
}

/**
 * Set order for the list of units in simplified structure
 * @param {string} courseId
 * @param {Array<string>} children list of unit id's
 * @returns {Promise<Object>}
*/
export async function setSimplifiedUnitOrderList(courseId: string, children: Array<string>): Promise<object> {
  const formattedCourseId = courseId.split('course-v1:')[1];
  const courseBlockUrl = `${getApiBaseUrl()}/xblock/block-v1:${formattedCourseId}+type@course+block@course`;
  
  const { data } = await getAuthenticatedHttpClient()
    .put(courseBlockUrl, {
      children,
      simplified_structure: true,
    });

  return data;
}

/**
 * Import unit from library directly to course in simplified structure
 * @param {string} parentLocator - Course usage key
 * @param {string} libraryContentKey - Library content key
 * @returns {Promise<Object>}
 */
export async function addUnitFromLibrarySimplified(
  parentLocator: string, 
  libraryContentKey: string
): Promise<object> {
  const { data } = await getAuthenticatedHttpClient()
    .post(`${getApiBaseUrl()}/xblock/`, {
      parent_locator: parentLocator,
      category: 'vertical',
      library_content_key: libraryContentKey,
      simplified_structure: true,
    });

  return data;
}
