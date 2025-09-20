export const updateSlideValues = (slides, isNewFile) => {
  const updated = [];
  slides.forEach(slide => {
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
