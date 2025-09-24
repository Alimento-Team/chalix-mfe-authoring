/**
 * Selectors for videos page data
 */

/**
 * Get videos for a specific unit
 * @param {Object} state - Redux state
 * @param {string} unitId - Unit ID to filter by
 * @returns {Array} Array of videos for the specified unit
 */
export const getUnitVideos = (state, unitId) => {
  if (!unitId) return [];
  
  const allVideos = state.models?.videos || {};
  return Object.values(allVideos).filter(video => video.unitId === unitId);
};

/**
 * Check if a unit has any videos
 * @param {Object} state - Redux state
 * @param {string} unitId - Unit ID to check
 * @returns {boolean} True if the unit has videos
 */
export const hasUnitVideos = (state, unitId) => {
  console.log('hasUnitVideos selector called with unitId:', unitId);
  console.log('All videos in state:', state.models?.videos);
  
  const allVideos = state.models?.videos || {};
  const allVideosArray = Object.values(allVideos);
  console.log('All videos array:', allVideosArray);
  
  const unitVideos = getUnitVideos(state, unitId);
  console.log('Filtered unit videos:', unitVideos);
  console.log('Has unit videos result:', unitVideos.length > 0);
  
  return unitVideos.length > 0;
};

/**
 * Get course-level videos (videos without a unitId)
 * @param {Object} state - Redux state
 * @returns {Array} Array of course-level videos
 */
export const getCourseVideos = (state) => {
  const allVideos = state.models?.videos || {};
  return Object.values(allVideos).filter(video => !video.unitId);
};

/**
 * Check if course has any course-level videos
 * @param {Object} state - Redux state
 * @returns {boolean} True if the course has course-level videos
 */
export const hasCourseVideos = (state) => {
  const courseVideos = getCourseVideos(state);
  return courseVideos.length > 0;
};

/**
 * Get slides for a specific unit
 * @param {Object} state - Redux state
 * @param {string} unitId - Unit ID to filter by
 * @returns {Array} Array of slides for the specified unit
 */
export const getUnitSlides = (state, unitId) => {
  if (!unitId) return [];
  
  const allSlides = state.models?.slides || {};
  return Object.values(allSlides).filter(slide => slide.unitId === unitId);
};

/**
 * Check if a unit has any slides
 * @param {Object} state - Redux state
 * @param {string} unitId - Unit ID to check
 * @returns {boolean} True if the unit has slides
 */
export const hasUnitSlides = (state, unitId) => {
  const unitSlides = getUnitSlides(state, unitId);
  return unitSlides.length > 0;
};

/**
 * Get course-level slides (slides without a unitId)
 * @param {Object} state - Redux state
 * @returns {Array} Array of course-level slides
 */
export const getCourseSlides = (state) => {
  const allSlides = state.models?.slides || {};
  return Object.values(allSlides).filter(slide => !slide.unitId);
};

/**
 * Check if course has any course-level slides
 * @param {Object} state - Redux state
 * @returns {boolean} True if the course has course-level slides
 */
export const hasCourseSlides = (state) => {
  const courseSlides = getCourseSlides(state);
  return courseSlides.length > 0;
};