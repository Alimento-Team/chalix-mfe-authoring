import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useSelector } from 'react-redux';
import { Badge } from '@openedx/paragon';

import { getPagePath } from '../utils';
import { useWaffleFlags } from '../data/apiHooks';
import { getStudioHomeData } from '../studio-home/data/selectors';
import messages from './messages';
import courseOptimizerMessages from '../optimizer-page/messages';

export const useContentMenuItems = courseId => {
  const intl = useIntl();
  const studioBaseUrl = getConfig().STUDIO_BASE_URL;
  const waffleFlags = useWaffleFlags();
  const { librariesV2Enabled } = useSelector(getStudioHomeData);

  const items = [
    {
      href: waffleFlags.useNewCourseOutlinePage ? `/course/${courseId}` : `${studioBaseUrl}/course/${courseId}`,
      title: intl.formatMessage(messages['header.links.outline']),
    },
    {
      href: waffleFlags.useNewUpdatesPage ? `/course/${courseId}/course_info` : `${studioBaseUrl}/course_info/${courseId}`,
      title: intl.formatMessage(messages['header.links.updates']),
    },
    {
      href: getPagePath(courseId, 'true', 'tabs'),
      title: intl.formatMessage(messages['header.links.pages']),
    },
    {
      href: waffleFlags.useNewFilesUploadsPage ? `/course/${courseId}/assets` : `${studioBaseUrl}/assets/${courseId}`,
      title: intl.formatMessage(messages['header.links.filesAndUploads']),
    },
  ];
  if (getConfig().ENABLE_VIDEO_UPLOAD_PAGE_LINK_IN_CONTENT_DROPDOWN === 'true' || waffleFlags.useNewVideoUploadsPage) {
    items.push({
      href: `/course/${courseId}/videos`,
      title: intl.formatMessage(messages['header.links.videoUploads']),
    });
  }

  if (librariesV2Enabled) {
    items.splice(1, 0, {
      href: `/course/${courseId}/libraries`,
      title: intl.formatMessage(messages['header.links.libraries']),
    });
  }

  return items;
};

export const useSettingMenuItems = courseId => {
  const intl = useIntl();
  const studioBaseUrl = getConfig().STUDIO_BASE_URL;
  const { canAccessAdvancedSettings } = useSelector(getStudioHomeData);
  const waffleFlags = useWaffleFlags();

  // Always point settings links to the internal MFE routes so navigation stays
  // within the authoring app and we don't redirect users to an external Studio host.
  const items = [
    {
      href: `/course/${courseId}/settings/details`,
      title: intl.formatMessage(messages['header.links.scheduleAndDetails']),
    },
    {
      href: `/course/${courseId}/settings/grading`,
      title: intl.formatMessage(messages['header.links.grading']),
    },
    {
      href: `/course/${courseId}/course_team`,
      title: intl.formatMessage(messages['header.links.courseTeam']),
    },
    {
      href: `/course/${courseId}/group_configurations`,
      title: intl.formatMessage(messages['header.links.groupConfigurations']),
    },
    ...(canAccessAdvancedSettings === true
      ? [{
        href: `/course/${courseId}/settings/advanced`,
        title: intl.formatMessage(messages['header.links.advancedSettings']),
      }] : []
    ),
  ];
  if (getConfig().ENABLE_CERTIFICATE_PAGE === 'true' || waffleFlags.useNewCertificatesPage) {
    items.push({
      href: `/course/${courseId}/certificates`,
      title: intl.formatMessage(messages['header.links.certificates']),
    });
  }
  return items;
};

export const useToolsMenuItems = courseId => {
  const intl = useIntl();
  const studioBaseUrl = getConfig().STUDIO_BASE_URL;
  const waffleFlags = useWaffleFlags();

  const items = [
    {
      href: waffleFlags.useNewImportPage ? `/course/${courseId}/import` : `${studioBaseUrl}/import/${courseId}`,
      title: intl.formatMessage(messages['header.links.import']),
    },
    {
      href: waffleFlags.useNewExportPage ? `/course/${courseId}/export` : `${studioBaseUrl}/export/${courseId}`,
      title: intl.formatMessage(messages['header.links.exportCourse']),
    },
    ...(getConfig().ENABLE_TAGGING_TAXONOMY_PAGES === 'true'
      ? [{
        href: `${studioBaseUrl}/course/${courseId}#export-tags`,
        title: intl.formatMessage(messages['header.links.exportTags']),
      }] : []
    ),
    {
      href: `/course/${courseId}/checklists`,
      title: intl.formatMessage(messages['header.links.checklists']),
    },
    ...(waffleFlags.enableCourseOptimizer ? [{
      href: `/course/${courseId}/optimizer`,
      title: (
        <>
          {intl.formatMessage(messages['header.links.optimizer'])}
          <Badge variant="primary" className="ml-2">{intl.formatMessage(courseOptimizerMessages.new)}</Badge>
        </>
      ),
    }] : []),
  ];
  return items;
};
