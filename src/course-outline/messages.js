import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  headingTitle: {
    id: 'course-authoring.course-outline.headingTitle',
    defaultMessage: 'Course outline',
  },
  headingSubtitle: {
    id: 'course-authoring.course-outline.subTitle',
    defaultMessage: 'Content',
  },
  alertSuccessTitle: {
    id: 'course-authoring.course-outline.reindex.alert.success.title',
    defaultMessage: 'Course index',
  },
  alertSuccessDescription: {
    id: 'course-authoring.course-outline.reindex.alert.success.description',
    defaultMessage: 'Course has been successfully reindexed.',
  },
  alertSuccessAriaLabelledby: {
    id: 'course-authoring.course-outline.reindex.alert.success.aria.labelledby',
    defaultMessage: 'alert-confirmation-title',
  },
  alertSuccessAriaDescribedby: {
    id: 'course-authoring.course-outline.reindex.alert.success.aria.describedby',
    defaultMessage: 'alert-confirmation-description',
  },
  newSectionButton: {
    id: 'course-authoring.course-outline.section-list.button.new-section',
    defaultMessage: 'New section',
    description: 'Text of button to create new section in course outline',
  },
  useSectionFromLibraryButton: {
    id: 'course-authoring.course-outline.button.use-section-from-library',
    defaultMessage: 'Use section from library',
    description: 'Text of the button to add a section from a library in a course.',
  },
  exportTagsCreatingToastMessage: {
    id: 'course-authoring.course-outline.export-tags.toast.creating.message',
    defaultMessage: 'Please wait. Creating export file for course tags...',
    description: 'In progress message in toast when exporting tags of a course',
  },
  exportTagsSuccessToastMessage: {
    id: 'course-authoring.course-outline.export-tags.toast.success.message',
    defaultMessage: 'Course tags exported successfully',
    description: 'Success message in toast when exporting tags of a course',
  },
  exportTagsErrorToastMessage: {
    id: 'course-authoring.course-outline.export-tags.toast.error.message',
    defaultMessage: 'An error has occurred creating the file',
    description: 'Error message in toast when exporting tags of a course',
  },
  newUnitButton: {
    id: 'course-authoring.course-outline.button.new-unit',
    defaultMessage: 'New unit',
    description: 'Message of the button to create a new unit in a subsection.',
  },
  useUnitFromLibraryButton: {
    id: 'course-authoring.course-outline.button.use-unit-from-library',
    defaultMessage: 'Use unit from library',
    description: 'Message of the button to add a new unit from a library in a subsection.',
  },
  newSubsectionButton: {
    id: 'course-authoring.course-outline.button.new-subsection',
    defaultMessage: 'New subsection',
    description: 'Text of button to create new subsection in a section',
  },
  useSubsectionFromLibraryButton: {
    id: 'course-authoring.course-outline.button.use-subsection-from-library',
    defaultMessage: 'Use subsection from library',
    description: 'Message of the button to add a new subsection from a library in a subsection.',
  },
  sectionPickerModalTitle: {
    id: 'course-authoring.course-outline.button.section-modal.title',
    defaultMessage: 'Select section',
    description: 'Section modal picker title text in outline',
  },
  simplifiedViewTitle: {
    id: 'course-authoring.course-outline.simplified.title',
    defaultMessage: 'Simplified Course Structure',
    description: 'Title for simplified course outline view',
  },
  simplifiedViewDescription: {
    id: 'course-authoring.course-outline.simplified.description',
    defaultMessage: 'Manage your course units directly without sections and subsections',
    description: 'Description for simplified course outline view',
  },
  switchToNormalView: {
    id: 'course-authoring.course-outline.simplified.switch-normal',
    defaultMessage: 'Switch to Traditional View',
    description: 'Button text to switch from simplified to traditional course outline view',
  },
  switchToSimplifiedView: {
    id: 'course-authoring.course-outline.normal.switch-simplified',
    defaultMessage: 'Switch to Simplified View',
    description: 'Button text to switch from traditional to simplified course outline view',
  },
  normalViewTitle: {
    id: 'course-authoring.course-outline.normal.title',
    defaultMessage: 'Traditional Course Structure',
    description: 'Title for normal course outline view',
  },
  normalViewDescription: {
    id: 'course-authoring.course-outline.normal.description',
    defaultMessage: 'Manage your course with sections, subsections, and units',
    description: 'Description for traditional course outline view',
  },
  simplifiedSubtitle: {
    id: 'course-authoring.course-outline.simplified.subtitle',
    defaultMessage: 'Simplified Structure: Course → Units',
    description: 'Subtitle for simplified course outline structure',
  },
});

export default messages;
