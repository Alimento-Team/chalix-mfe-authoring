/* eslint-disable import/named */
import React from 'react';
import * as Yup from 'yup';
import PropTypes from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  ModalDialog,
  Button,
  ActionRow,
  Form,
  Tab,
  Tabs,
} from '@openedx/paragon';
import { DatepickerControl, DATEPICKER_TYPES } from '../datepicker-control';
import { Formik } from 'formik';

import { VisibilityTypes } from '../../data/constants';
import { COURSE_BLOCK_NAMES } from '../../constants';
import messages from './messages';
import BasicTab from './BasicTab';
import VisibilityTab from './VisibilityTab';
import AdvancedTab from './AdvancedTab';
import UnitTab from './UnitTab';

const ConfigureModal = ({
  isOpen,
  onClose,
  onConfigureSubmit,
  currentItemData,
  enableProctoredExams = false,
  enableTimedExams = false,
  isXBlockComponent = false,
  isSelfPaced,
  // New props for course-level editing
  isCourseModal = false,
  onCourseSubmit = null,
}) => {
  const intl = useIntl();
  // Log isOpen prop changes for debugging modal visibility issues
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug('[ConfigureModal] isOpen prop changed:', isOpen, 'isCourseModal:', isCourseModal);
    // Log presence of important imported symbols to catch undefined components
    // eslint-disable-next-line no-console
    console.debug('[ConfigureModal] imported symbols presence', {
      ModalDialog: typeof ModalDialog !== 'undefined',
      Button: typeof Button !== 'undefined',
      ActionRow: typeof ActionRow !== 'undefined',
      Form: typeof Form !== 'undefined',
      Tab: typeof Tab !== 'undefined',
      Tabs: typeof Tabs !== 'undefined',
      DatepickerControl: typeof DatepickerControl !== 'undefined',
      DATEPICKER_TYPES: typeof DATEPICKER_TYPES !== 'undefined',
      BasicTab: typeof BasicTab !== 'undefined',
      VisibilityTab: typeof VisibilityTab !== 'undefined',
      AdvancedTab: typeof AdvancedTab !== 'undefined',
      UnitTab: typeof UnitTab !== 'undefined',
    });
  }, [isOpen, isCourseModal]);
  const {
    displayName,
    start: sectionStartDate,
    visibilityState,
    due,
    isTimeLimited,
    defaultTimeLimitMinutes,
    hideAfterDue,
    showCorrectness,
    courseGraders,
    category,
    format,
    userPartitionInfo,
    ancestorHasStaffLock,
    isPrereq,
    prereqs,
    prereq,
    prereqMinScore,
    prereqMinCompletion,
    releasedToStudents,
    wasExamEverLinkedWithExternal,
    isProctoredExam,
    isOnboardingExam,
    isPracticeExam,
    examReviewRules,
    supportsOnboarding,
    showReviewRules,
    onlineProctoringRules,
    discussionEnabled,
  } = currentItemData;

  const getSelectedGroups = () => {
    if (userPartitionInfo?.selectedPartitionIndex >= 0) {
      return userPartitionInfo?.selectablePartitions[userPartitionInfo?.selectedPartitionIndex]
        ?.groups
        .filter(({ selected }) => selected)
        .map(({ id }) => `${id}`)
        || [];
    }
    return [];
  };

  const defaultPrereqScore = (val) => {
    if (val === null || val === undefined) {
      return 100;
    }
    return parseFloat(val);
  };

  const initialValues = {
    releaseDate: sectionStartDate,
    isVisibleToStaffOnly: visibilityState === VisibilityTypes.STAFF_ONLY,
    graderType: format == null ? 'notgraded' : format,
    dueDate: due == null ? '' : due,
    isTimeLimited,
    isProctoredExam,
    isOnboardingExam,
    isPracticeExam,
    examReviewRules,
    defaultTimeLimitMinutes,
    hideAfterDue: hideAfterDue === undefined ? false : hideAfterDue,
    showCorrectness,
    isPrereq,
    prereqUsageKey: prereq,
    prereqMinScore: defaultPrereqScore(prereqMinScore),
    prereqMinCompletion: defaultPrereqScore(prereqMinCompletion),
    // by default it is -1 i.e. accessible to all learners & staff
    selectedPartitionIndex: userPartitionInfo?.selectedPartitionIndex,
    selectedGroups: getSelectedGroups(),
    discussionEnabled,
    estimatedHours: currentItemData.estimatedHours || '',
    onlineCourseLink: currentItemData.onlineCourseLink || '',
    instructor: currentItemData.instructor || '',
  };

  // Course-level initial values (used when showing the course modal)
  const courseInitialValues = {
    displayName: currentItemData.displayName || '',
    shortDescription: currentItemData.shortDescription || '',
    courseType: currentItemData.courseType || '',
    courseLevel: currentItemData.courseLevel || '',
    estimatedHours: currentItemData.estimatedHours || '',
    onlineCourseLink: currentItemData.onlineCourseLink || '',
    instructor: currentItemData.instructor || '',
    courseStartDate: currentItemData.start || currentItemData.start_date || null,
    courseEndDate: currentItemData.end || currentItemData.end_date || null,
    finalEvaluationType: currentItemData.finalEvaluationType || '',
    courseUnits: currentItemData.courseUnits || [],
  };

  const validationSchema = Yup.object().shape({
    estimatedHours: Yup.number()
      .typeError('Thời lượng dự kiến phải là số')
      .min(0, 'Thời lượng dự kiến phải lớn hơn 0')
      .nullable(),
    onlineCourseLink: Yup.string()
      .url('Liên kết lớp học trực tuyến không hợp lệ')
      .nullable(),
    instructor: Yup.string()
      .nullable(),
    isTimeLimited: Yup.boolean(),
    isProctoredExam: Yup.boolean(),
    isPracticeExam: Yup.boolean(),
    isOnboardingExam: Yup.boolean(),
    examReviewRules: Yup.string(),
    defaultTimeLimitMinutes: Yup.number().nullable(true),
    hideAfterDueState: Yup.boolean(),
    showCorrectness: Yup.string().required(),
    isPrereq: Yup.boolean(),
    prereqUsageKey: Yup.string().nullable(true),
    prereqMinScore: Yup.number().min(
      0,
      intl.formatMessage(messages.minScoreError),
    ).max(
      100,
      intl.formatMessage(messages.minScoreError),
    ).nullable(true),
    prereqMinCompletion: Yup.number().min(
      0,
      intl.formatMessage(messages.minScoreError),
    ).max(
      100,
      intl.formatMessage(messages.minScoreError),
    ).nullable(true),
    selectedPartitionIndex: Yup.number().integer(),
    selectedGroups: Yup.array().of(Yup.string()),
    discussionEnabled: Yup.boolean(),
  });

  // Additional validation for course modal (dates ordering)
  const courseValidationSchema = Yup.object().shape({
    displayName: Yup.string().required('Tên khóa học là bắt buộc'),
    shortDescription: Yup.string().nullable(),
    courseType: Yup.string().nullable(),
    courseLevel: Yup.string().nullable(),
    estimatedHours: Yup.number()
      .typeError('Thời lượng dự kiến phải là số')
      .min(0, 'Thời lượng dự kiến phải lớn hơn 0')
      .nullable(),
    onlineCourseLink: Yup.string()
      .url('Liên kết lớp học trực tuyến không hợp lệ')
      .nullable(),
    instructor: Yup.string().nullable(),
    courseStartDate: Yup.mixed().nullable(),
    courseEndDate: Yup.mixed()
      .nullable()
      .test('end-after-start', 'Ngày kết thúc phải sau ngày bắt đầu', function (value) {
        const { courseStartDate } = this.parent;
        if (!value || !courseStartDate) return true;
        return new Date(value) >= new Date(courseStartDate);
      }),
    finalEvaluationType: Yup.string().nullable(),
  });

  const isSubsection = category === COURSE_BLOCK_NAMES.sequential.id;

  const dialogTitle = isCourseModal
    ? 'Cài đặt Khóa học - COMPREHENSIVE MODAL'
    : intl.formatMessage(messages.title, { title: currentItemData?.displayName || 'Item' });

  const handleSave = (data) => {
    // If this is the course-level modal, call the provided onCourseSubmit handler
    if (isCourseModal && typeof onCourseSubmit === 'function') {
      // Pass the raw form values through to the course submit handler so
      // higher-level code can build the API payload in one place. This
      // ensures fields like finalEvaluationType are preserved.
      onCourseSubmit(data);
      return;
    }
    let { releaseDate } = data;
    // to prevent passing an empty string to the backend
    releaseDate = releaseDate || null;
    const groupAccess = {};
    switch (category) {
      case COURSE_BLOCK_NAMES.chapter.id:
        onConfigureSubmit(data.isVisibleToStaffOnly, releaseDate);
        break;
      case COURSE_BLOCK_NAMES.sequential.id:
        onConfigureSubmit(
          data.isVisibleToStaffOnly,
          releaseDate,
          data.graderType,
          data.dueDate,
          data.isTimeLimited,
          data.isProctoredExam,
          data.isOnboardingExam,
          data.isPracticeExam,
          data.examReviewRules,
          data.isTimeLimited ? data.defaultTimeLimitMinutes : 0,
          data.hideAfterDue,
          data.showCorrectness,
          data.isPrereq,
          data.prereqUsageKey,
          data.prereqMinScore,
          data.prereqMinCompletion,
        );
        break;
      case COURSE_BLOCK_NAMES.vertical.id:
      case COURSE_BLOCK_NAMES.libraryContent.id:
      case COURSE_BLOCK_NAMES.splitTest.id:
      case COURSE_BLOCK_NAMES.component.id:
        // groupAccess should be {partitionId: [group1, group2]} or {} if selectedPartitionIndex === -1
        if (data.selectedPartitionIndex >= 0) {
          const partitionId = userPartitionInfo.selectablePartitions[data.selectedPartitionIndex].id;
          groupAccess[partitionId] = data.selectedGroups.map(g => parseInt(g, 10));
        }
        onConfigureSubmit(data.isVisibleToStaffOnly, groupAccess, data.discussionEnabled);
        break;
      default:
        break;
    }
  };

  const renderModalBody = (values, setFieldValue) => {
    if (isCourseModal) {
      // Debug: log types of key components before returning JSX (useEffect runs after render)
      // eslint-disable-next-line no-console
      console.log('[ConfigureModal] Rendering course modal body');
      // eslint-disable-next-line no-console
      console.log('[ConfigureModal] component types', {
        Form: typeof Form,
        FormControl: typeof Form?.Control,
        FormSelect: typeof Form?.Select,
        DatepickerControl: typeof DatepickerControl,
        DATEPICKER_TYPES: typeof DATEPICKER_TYPES,
      });
      return (
        <>
          <Form.Group className="mb-3">
            <Form.Label>
              Tên khóa học <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              id="displayName"
              type="text"
              name="displayName"
              value={values.displayName || ''}
              onChange={e => setFieldValue('displayName', e.target.value)}
              placeholder="Tên khóa học"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Mô tả ngắn gọn</Form.Label>
            <Form.Control
              as="textarea"
              id="shortDescription"
              name="shortDescription"
              value={values.shortDescription || ''}
              onChange={e => setFieldValue('shortDescription', e.target.value)}
              placeholder="Mô tả ngắn gọn về khóa học..."
              rows={3}
            />
          </Form.Group>
          
          <div className="row">
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Loại khóa học</Form.Label>
                <Form.Control
                  as="select"
                  id="courseType"
                  name="courseType"
                  value={values.courseType || ''}
                  onChange={e => setFieldValue('courseType', e.target.value)}
                >
                  <option value="">Chọn loại khóa học</option>
                  <option value="Lý luận chính trị">Lý luận chính trị</option>
                  <option value="Chuyên môn nghiệp vụ">Chuyên môn nghiệp vụ</option>
                  <option value="Kỹ năng mềm">Kỹ năng mềm</option>
                  <option value="Ngoại ngữ">Ngoại ngữ</option>
                  <option value="Tin học">Tin học</option>
                  <option value="Khác">Khác</option>
                </Form.Control>
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Trình độ</Form.Label>
                <Form.Control
                  as="select"
                  id="courseLevel"
                  name="courseLevel"
                  value={values.courseLevel || ''}
                  onChange={e => setFieldValue('courseLevel', e.target.value)}
                >
                  <option value="">Chọn trình độ</option>
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Nâng cao">Nâng cao</option>
                  <option value="Chuyên ngành">Chuyên ngành</option>
                  <option value="Đại học">Đại học</option>
                  <option value="Thạc sĩ">Thạc sĩ</option>
                  <option value="Tiến sĩ">Tiến sĩ</option>
                </Form.Control>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Thời lượng ước tính (giờ)</Form.Label>
            <Form.Control
              id="estimatedHours"
              type="number"
              name="estimatedHours"
              value={values.estimatedHours || ''}
              onChange={e => setFieldValue('estimatedHours', e.target.value)}
              placeholder="12"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Liên kết lớp học trực tuyến</Form.Label>
            <Form.Control
              id="onlineCourseLink"
              type="url"
              name="onlineCourseLink"
              value={values.onlineCourseLink || ''}
              onChange={e => setFieldValue('onlineCourseLink', e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Chỉ định giảng viên</Form.Label>
            <Form.Control
              id="instructor"
              type="text"
              name="instructor"
              value={values.instructor || ''}
              onChange={e => setFieldValue('instructor', e.target.value)}
              placeholder="Tên giảng viên"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ngày bắt đầu</Form.Label>
            <DatepickerControl
              type={DATEPICKER_TYPES.date}
              value={values.courseStartDate}
              label=""
              controlName="course-start"
              onChange={(val) => setFieldValue('courseStartDate', val)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ngày kết thúc</Form.Label>
            <DatepickerControl
              type={DATEPICKER_TYPES.date}
              value={values.courseEndDate}
              label=""
              controlName="course-end"
              onChange={(val) => setFieldValue('courseEndDate', val)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Loại bài kiểm tra cuối khoá</Form.Label>
            <Form.Control
              as="select"
              id="finalEvaluationType"
              name="finalEvaluationType"
              value={values.finalEvaluationType || ''}
              onChange={e => setFieldValue('finalEvaluationType', e.target.value)}
            >
              <option value="">Chọn loại bài kiểm tra</option>
              <option value="project">Nộp bài thu hoạch</option>
              <option value="quiz">Làm bài trắc nghiệm</option>
            </Form.Control>
          </Form.Group>

          {/* Display course units/topics if available */}
          {values.courseUnits && values.courseUnits.length > 0 && (
            <Form.Group className="mb-3">
              <Form.Label>Chuyên đề</Form.Label>
              <div className="border rounded p-3 bg-light">
                {values.courseUnits.map((unit, index) => (
                  <div key={index} className="mb-2">
                    <strong>{unit.title || unit.name}</strong>
                  </div>
                ))}
              </div>
            </Form.Group>
          )}
        </>
      );
    }
    switch (category) {
      case COURSE_BLOCK_NAMES.chapter.id:
        return (
          <Tabs>
            <Tab eventKey="basic" title={intl.formatMessage(messages.basicTabTitle)}>
              <BasicTab
                values={values}
                setFieldValue={setFieldValue}
                isSubsection={isSubsection}
                courseGraders={courseGraders === 'undefined' ? [] : courseGraders}
                isSelfPaced={isSelfPaced}
                showExtraFields={true}
              />
            </Tab>
            <Tab eventKey="visibility" title={intl.formatMessage(messages.visibilityTabTitle)}>
              <VisibilityTab
                values={values}
                setFieldValue={setFieldValue}
                category={category}
                isSubsection={isSubsection}
                showWarning={visibilityState === VisibilityTypes.STAFF_ONLY}
              />
            </Tab>
          </Tabs>
        );
      case COURSE_BLOCK_NAMES.sequential.id:
        return (
          <Tabs>
            <Tab eventKey="basic" title={intl.formatMessage(messages.basicTabTitle)}>
              <BasicTab
                values={values}
                setFieldValue={setFieldValue}
                isSubsection={isSubsection}
                courseGraders={courseGraders === 'undefined' ? [] : courseGraders}
                isSelfPaced={isSelfPaced}
                showExtraFields={true}
              />
            </Tab>
            <Tab eventKey="visibility" title={intl.formatMessage(messages.visibilityTabTitle)}>
              <VisibilityTab
                values={values}
                setFieldValue={setFieldValue}
                category={category}
                isSubsection={isSubsection}
                showWarning={visibilityState === VisibilityTypes.STAFF_ONLY}
                isSelfPaced={isSelfPaced}
              />
            </Tab>
            <Tab eventKey="advanced" title={intl.formatMessage(messages.advancedTabTitle)}>
              <AdvancedTab
                values={values}
                setFieldValue={setFieldValue}
                prereqs={prereqs}
                releasedToStudents={releasedToStudents}
                wasExamEverLinkedWithExternal={wasExamEverLinkedWithExternal}
                enableProctoredExams={enableProctoredExams}
                enableTimedExams={enableTimedExams}
                supportsOnboarding={supportsOnboarding}
                showReviewRules={showReviewRules}
                wasProctoredExam={isProctoredExam}
                onlineProctoringRules={onlineProctoringRules}
              />
            </Tab>
          </Tabs>
        );
      case COURSE_BLOCK_NAMES.vertical.id:
        // fall through
      default:
        return null;
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={dialogTitle} size="lg" style={{ zIndex: 2050 }}>
      <div className="configure-modal">
        <Formik
          initialValues={isCourseModal ? courseInitialValues : initialValues}
          onSubmit={handleSave}
          validationSchema={isCourseModal ? courseValidationSchema : validationSchema}
          validateOnBlur
          validateOnChange
        >
          {({ values, handleSubmit, setFieldValue }) => (
            <>
              {/* Make the body scrollable with a max height so footer can pin */}
              <ModalDialog.Body
                className="configure-modal__body"
                style={{ maxHeight: '60vh', overflowY: 'auto' }}
              >
                <Form.Group size="sm" className="form-field">
                  {renderModalBody(values, setFieldValue)}
                </Form.Group>
              </ModalDialog.Body>
              {/* Sticky footer so action row stays visible when body scrolls */}
              <ModalDialog.Footer
                className="pt-1 configure-modal__footer"
                style={{ position: 'sticky', bottom: 0, zIndex: 2060, background: 'var(--pgn-color-bg, #fff)' }}
              >
                <ActionRow style={{ alignItems: 'center' }}>
                  <ModalDialog.CloseButton variant="tertiary">
                    {isCourseModal ? 'Hủy' : intl.formatMessage(messages.cancelButton)}
                  </ModalDialog.CloseButton>
                  <Button
                    data-testid="configure-save-button"
                    onClick={handleSubmit}
                    variant="primary"
                  >
                    {isCourseModal ? 'Lưu thay đổi' : intl.formatMessage(messages.saveButton)}
                  </Button>
                </ActionRow>
              </ModalDialog.Footer>
            </>
          )}
        </Formik>
      </div>
    </ModalDialog>
  );
};

ConfigureModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfigureSubmit: PropTypes.func,
  enableProctoredExams: PropTypes.bool,
  enableTimedExams: PropTypes.bool,
  currentItemData: PropTypes.shape({
    displayName: PropTypes.string,
    start: PropTypes.string,
    visibilityState: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    due: PropTypes.string,
    isTimeLimited: PropTypes.bool,
    defaultTimeLimitMinutes: PropTypes.number,
    hideAfterDue: PropTypes.bool,
    showCorrectness: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    courseGraders: PropTypes.arrayOf(PropTypes.string),
    category: PropTypes.string,
    format: PropTypes.string,
    userPartitionInfo: PropTypes.shape({
      selectablePartitions: PropTypes.arrayOf(PropTypes.shape({
        groups: PropTypes.arrayOf(PropTypes.shape({
          deleted: PropTypes.bool,
          id: PropTypes.number,
          name: PropTypes.string,
          selected: PropTypes.bool,
        })),
        id: PropTypes.number,
        name: PropTypes.string,
        scheme: PropTypes.string,
      })),
      selectedPartitionIndex: PropTypes.number,
      selectedGroupsLabel: PropTypes.string,
    }),
    ancestorHasStaffLock: PropTypes.bool,
    isPrereq: PropTypes.bool,
    prereqs: PropTypes.arrayOf({
      blockDisplayName: PropTypes.string,
      blockUsageKey: PropTypes.string,
    }),
    prereq: PropTypes.number,
    prereqMinScore: PropTypes.number,
    prereqMinCompletion: PropTypes.number,
    releasedToStudents: PropTypes.bool,
    wasExamEverLinkedWithExternal: PropTypes.bool,
    isProctoredExam: PropTypes.bool,
    isOnboardingExam: PropTypes.bool,
    isPracticeExam: PropTypes.bool,
    examReviewRules: PropTypes.string,
    supportsOnboarding: PropTypes.bool,
    showReviewRules: PropTypes.bool,
    onlineProctoringRules: PropTypes.string,
    discussionEnabled: PropTypes.bool,
  }).isRequired,
  isXBlockComponent: PropTypes.bool,
  isSelfPaced: PropTypes.bool.isRequired,
  isCourseModal: PropTypes.bool,
  onCourseSubmit: PropTypes.func,
};

export default ConfigureModal;
