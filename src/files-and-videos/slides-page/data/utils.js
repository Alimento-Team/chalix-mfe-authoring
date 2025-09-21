// Function to check if a slide appears to be default/test data
const isDefaultSlide = (slide) => {
  const slideId = slide.slide_id || slide.slideId || slide.id || '';
  const name = slide.display_name || slide.displayName || slide.file_name || slide.fileName || '';
  
  // Filter out common default slide patterns
  const defaultPatterns = [
    'introduction slides',
    'slide-001',
    'sample slide',
    'demo slide',
    'test slide',
    'default slide',
    'example slide',
  ];
  
  const lowerName = name.toLowerCase();
  const lowerSlideId = slideId.toString().toLowerCase();
  
  return defaultPatterns.some(pattern => 
    lowerName.includes(pattern) || lowerSlideId.includes(pattern)
  );
};

export const updateSlideValues = (slides, isNewFile) => {
  const updated = [];
  slides.forEach(slide => {
    // Skip default/test slides
    if (isDefaultSlide(slide)) {
      console.log('Filtering out default slide:', slide.display_name || slide.displayName || slide.file_name || slide.fileName);
      return;
    }
    
    // Use canonical slide fields; retain minimal fallback to legacy names if any remain
    const slideId = slide.slide_id || slide.slideId || slide.id;
    const name = slide.display_name || slide.displayName || slide.file_name || slide.fileName;
    const createdRaw = slide.created_at || new Date().toISOString();

    updated.push({
      ...slide,
      id: slideId,
      slideId, // ensure presence for downstream code
      displayName: name,
      dateAdded: createdRaw.toString(),
      usageLocations: isNewFile ? [] : slide.usageLocations ?? null,
      activeStatus: slide.activeStatus || (slide.usageLocations?.length > 0 ? 'active' : 'inactive'),
    });
  });
  return updated;
};
