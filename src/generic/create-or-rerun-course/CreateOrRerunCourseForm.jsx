import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import {
  Form,
  Button,
  Dropdown,
  ActionRow,
  StatefulButton,
  TransitionReplace,
} from '@openedx/paragon';
import { Info as InfoIcon } from '@openedx/paragon/icons';
import TypeaheadDropdown from '../../editors/sharedComponents/TypeaheadDropdown';

import AlertMessage from '../alert-message';
import { STATEFUL_BUTTON_STATES } from '../../constants';
import { RequestStatus, TOTAL_LENGTH_KEY } from '../../data/constants';
import { getSavingStatus } from '../data/selectors';
import { getStudioHomeData } from '../../studio-home/data/selectors';
import { updatePostErrors } from '../data/slice';
import { updateCreateOrRerunCourseQuery } from '../data/thunks';
import { useCreateOrRerunCourse } from './hooks';
import messages from './messages';

const CreateOrRerunCourseForm = ({
  title,
  isCreateNewCourse,
  initialValues,
  onClickCancel,
}) => {
  const { courseId } = useParams();
  const savingStatus = useSelector(getSavingStatus);
  const { allowToCreateNewOrg } = useSelector(getStudioHomeData);
  const runFieldReference = useRef(null);
  const displayNameFieldReference = useRef(null);

  const {
    intl,
    errors,
    values,
    postErrors,
    isFormFilled,
    isFormInvalid,
    organizations,
    showErrorBanner,
    dispatch,
    handleBlur,
    handleChange,
    hasErrorField,
    setFieldValue,
  } = useCreateOrRerunCourse(initialValues);

  const newCourseFields = [
    // Estimated hours to finish
    {
      label: intl.formatMessage({ defaultMessage: 'Thời lượng dự kiến (giờ)', id: 'estimatedHoursLabel' }),
      helpText: intl.formatMessage({ defaultMessage: 'Số giờ ước tính để hoàn thành khoá học', id: 'estimatedHoursHelp' }),
      name: 'estimatedHours',
      value: values.estimatedHours || '',
      placeholder: intl.formatMessage({ defaultMessage: 'Ví dụ: 40', id: 'estimatedHoursPlaceholder' }),
      disabled: false,
      type: 'number',
    },
    // Online course link
    {
      label: intl.formatMessage({ defaultMessage: 'Liên kết lớp học trực tuyến', id: 'onlineCourseLinkLabel' }),
      helpText: intl.formatMessage({ defaultMessage: 'Nhập link Zoom, Google Meet, v.v.', id: 'onlineCourseLinkHelp' }),
      name: 'onlineCourseLink',
      value: values.onlineCourseLink || '',
      placeholder: intl.formatMessage({ defaultMessage: 'https://...', id: 'onlineCourseLinkPlaceholder' }),
      disabled: false,
      type: 'text',
    },
    // Instructor assignment
    {
      label: intl.formatMessage({ defaultMessage: 'Chỉ định giảng viên', id: 'instructorLabel' }),
      helpText: intl.formatMessage({ defaultMessage: 'Nhập email hoặc số điện thoại tài khoản giảng viên', id: 'instructorHelp' }),
      name: 'instructor',
      value: values.instructor || '',
      placeholder: intl.formatMessage({ defaultMessage: 'Email hoặc số điện thoại', id: 'instructorPlaceholder' }),
      disabled: false,
      type: 'text',
    },
    {
      label: intl.formatMessage(messages.courseDisplayNameLabel),
      helpText: intl.formatMessage(
        isCreateNewCourse
          ? messages.courseDisplayNameCreateHelpText
          : messages.courseDisplayNameRerunHelpText,
      ),
      name: 'displayName',
      value: values.displayName,
      placeholder: intl.formatMessage(messages.courseDisplayNamePlaceholder),
      disabled: false,
      ref: displayNameFieldReference,
    },
    {
      label: intl.formatMessage(messages.courseOrgLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseOrgCreateHelpText, {
          strong: <strong>{intl.formatMessage(messages.courseNoteOrgNameIsPartStrong)}</strong>,
        })
        : intl.formatMessage(messages.courseOrgRerunHelpText, {
          strong: (
            <>
              <br />
              <strong>
                {intl.formatMessage(messages.courseNoteNoSpaceAllowedStrong)}
              </strong>
            </>
          ),
        }),
      name: 'org',
      value: values.org,
      options: organizations,
      placeholder: intl.formatMessage(messages.courseOrgPlaceholder),
      disabled: false,
    },
    {
      label: intl.formatMessage(messages.courseNumberLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseNumberCreateHelpText, {
          strong: (
            <strong>
              {intl.formatMessage(messages.courseNotePartCourseURLRequireStrong)}
            </strong>
          ),
        })
        : intl.formatMessage(messages.courseNumberRerunHelpText),
      name: 'number',
      value: values.number,
      placeholder: intl.formatMessage(messages.courseNumberPlaceholder),
      disabled: !isCreateNewCourse,
    },
    {
      label: intl.formatMessage(messages.courseRunLabel),
      helpText: isCreateNewCourse
        ? intl.formatMessage(messages.courseRunCreateHelpText, {
          strong: (
            <strong>
              {intl.formatMessage(messages.courseNotePartCourseURLRequireStrong)}
            </strong>
          ),
        })
        : intl.formatMessage(messages.courseRunRerunHelpText, {
          strong: (
            <>
              <br />
              <strong>
                {intl.formatMessage(messages.courseNoteNoSpaceAllowedStrong)}
              </strong>
            </>
          ),
        }),
      name: 'run',
      value: values.run,
      placeholder: intl.formatMessage(messages.courseRunPlaceholder),
      disabled: false,
      ref: runFieldReference,
    },
  ];

  const errorMessage = errors[TOTAL_LENGTH_KEY] || postErrors?.errMsg;

  const createButtonState = {
    labels: {
      default: intl.formatMessage(isCreateNewCourse ? messages.createButton : messages.rerunCreateButton),
      pending: intl.formatMessage(isCreateNewCourse ? messages.creatingButton : messages.rerunningCreateButton),
    },
    disabledStates: [STATEFUL_BUTTON_STATES.pending],
  };

  const handleOnClickCreate = () => {
    const courseData = isCreateNewCourse ? values : { ...values, sourceCourseKey: courseId };
    dispatch(updateCreateOrRerunCourseQuery(courseData));
  };

  const handleOnClickCancel = () => {
    dispatch(updatePostErrors({}));
    onClickCancel();
  };

  const handleCustomBlurForDropdown = (e) => {
    // it needs to correct handleOnChange Form.Autosuggest
    const { value, name } = e.target;
    setFieldValue(name, value);
    handleBlur(e);
  };

  const renderOrgField = (field) => (allowToCreateNewOrg ? (
    <TypeaheadDropdown
      readOnly={false}
      name={field.name}
      value={field.value}
      controlClassName={classNames({ 'is-invalid': hasErrorField(field.name) })}
      options={field.options}
      placeholder={field.placeholder}
      handleBlur={handleCustomBlurForDropdown}
      handleChange={(value) => setFieldValue(field.name, value)}
      noOptionsMessage={intl.formatMessage(messages.courseOrgNoOptions)}
      helpMessage=""
      errorMessage=""
      floatingLabel=""
    />
  ) : (
    <Dropdown className="mr-2">
      <Dropdown.Toggle id={`${field.name}-dropdown`} variant="outline-primary">
        {field.value || intl.formatMessage(messages.courseOrgNoOptions)}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {field.options?.map((value) => (
          <Dropdown.Item
            key={value}
            onClick={() => setFieldValue(field.name, value)}
          >
            {value}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  ));

  useEffect(() => {
    // it needs to display the initial focus for the field depending on the current page
    if (!isCreateNewCourse) {
      runFieldReference?.current?.focus();
    } else {
      displayNameFieldReference?.current?.focus();
    }
  }, []);

  return (
    <div className="create-or-rerun-course-form">
      <TransitionReplace>
        {(errors[TOTAL_LENGTH_KEY] || showErrorBanner) ? (
          <AlertMessage
            variant="danger"
            icon={InfoIcon}
            title={errorMessage}
            aria-hidden="true"
            aria-labelledby={intl.formatMessage(
              messages.alertErrorExistsAriaLabelledBy,
            )}
            aria-describedby={intl.formatMessage(
              messages.alertErrorExistsAriaDescribedBy,
            )}
          />
        ) : null}
      </TransitionReplace>
      <h3 className="mb-3">{title}</h3>
      <Form>
        {newCourseFields.map((field) => (
          <Form.Group
            className={classNames('form-group-custom', {
              'form-group-custom_isInvalid': hasErrorField(field.name),
            })}
            key={field.label}
          >
            <Form.Label>{field.label}</Form.Label>
            {field.name !== 'org' ? (
              <Form.Control
                value={field.value}
                placeholder={field.placeholder}
                name={field.name}
                onChange={handleChange}
                onBlur={handleBlur}
                isInvalid={hasErrorField(field.name)}
                disabled={field.disabled}
                ref={field?.ref}
                type={field.type || 'text'}
              />
            ) : renderOrgField(field)}
            <Form.Text>{field.helpText}</Form.Text>
            {hasErrorField(field.name) && (
              <Form.Control.Feedback
                className="feedback-error"
                type="invalid"
                hasIcon={false}
              >
                {errors[field.name]}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        ))}
        <ActionRow className="justify-content-start">
          <Button
            variant="outline-primary"
            onClick={handleOnClickCancel}
          >
            {intl.formatMessage(messages.cancelButton)}
          </Button>
          <StatefulButton
            key="save-button"
            className="ml-3"
            onClick={handleOnClickCreate}
            disabled={!isFormFilled || isFormInvalid}
            state={
              savingStatus === RequestStatus.PENDING
                ? STATEFUL_BUTTON_STATES.pending
                : STATEFUL_BUTTON_STATES.default
            }
            {...createButtonState}
          />
        </ActionRow>
      </Form>
    </div>
  );
};

CreateOrRerunCourseForm.defaultProps = {
  title: '',
  isCreateNewCourse: false,
};

CreateOrRerunCourseForm.propTypes = {
  title: PropTypes.string,
  initialValues: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    org: PropTypes.string.isRequired,
    number: PropTypes.string.isRequired,
    run: PropTypes.string.isRequired,
  }).isRequired,
  isCreateNewCourse: PropTypes.bool,
  onClickCancel: PropTypes.func.isRequired,
};

export default CreateOrRerunCourseForm;
