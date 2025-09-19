import React from 'react';
import { PropTypes } from 'prop-types';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Badge } from '@openedx/paragon';
import { VIDEO_FAILURE_STATUSES, VIDEO_SUCCESS_STATUSES, VIDEO_PROCESSING_STATUSES } from '../../../videos-page/data/constants';
import messages from '../../messages';

const StatusColumn = ({ row }) => {
  const { status } = row.original;
  const isSuccess = VIDEO_SUCCESS_STATUSES.includes(status);
  const isFailed = VIDEO_FAILURE_STATUSES.includes(status);
  const isProcessing = VIDEO_PROCESSING_STATUSES.includes(status);
  const intl = useIntl();
  const failedText = intl.formatMessage(messages.failedLabel);

  // Don't show status badge for successful videos (they appear as normal rows)
  if (isSuccess) {
    return null;
  }

  // Show appropriate badge for processing or failed videos
  let variant = 'light';
  if (isFailed) {
    variant = 'danger';
  } else if (isProcessing) {
    variant = 'warning';
  }

  return (
    <Badge variant={variant}>
      {isFailed ? failedText : status}
    </Badge>
  );
};

StatusColumn.propTypes = {
  row: {
    original: {
      status: PropTypes.string.isRequired,
    }.isRequired,
  }.isRequired,
};

export default StatusColumn;
