import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { ChalixHeaderWithUserPopup } from '@chalix/frontend-component-header';
import { type Container, useToggle } from '@openedx/paragon';

import { useWaffleFlags } from '../data/apiHooks';
import { SearchModal } from '../search-modal';
import { useContentMenuItems, useSettingMenuItems, useToolsMenuItems } from './hooks';
import messages from './messages';

type ContainerPropsType = React.ComponentProps<typeof Container>;

interface HeaderProps {
  contextId?: string,
  number?: string,
  org?: string,
  title?: string,
  isHiddenMainMenu?: boolean,
  isLibrary?: boolean,
  containerProps?: ContainerPropsType,
}

const Header = ({
  contextId = '',
  org = '',
  number = '',
  title = '',
  isHiddenMainMenu = false,
  isLibrary = false,
  containerProps = {},
}: HeaderProps) => {
  const intl = useIntl();
  const waffleFlags = useWaffleFlags();

  const [isShowSearchModalOpen, openSearchModal, closeSearchModal] = useToggle(false);

  const studioBaseUrl = getConfig().STUDIO_BASE_URL;
  const meiliSearchEnabled = [true, 'true'].includes(getConfig().MEILISEARCH_ENABLED);

  const contentMenuItems = useContentMenuItems(contextId);
  const settingMenuItems = useSettingMenuItems(contextId);
  const toolsMenuItems = useToolsMenuItems(contextId);
  const mainMenuDropdowns = !isLibrary ? [
    {
      id: `${intl.formatMessage(messages['header.links.content'])}-dropdown-menu`,
      buttonTitle: intl.formatMessage(messages['header.links.content']),
      items: contentMenuItems,
    },
    {
      id: `${intl.formatMessage(messages['header.links.settings'])}-dropdown-menu`,
      buttonTitle: intl.formatMessage(messages['header.links.settings']),
      items: settingMenuItems,
    },
    {
      id: `${intl.formatMessage(messages['header.links.tools'])}-dropdown-menu`,
      buttonTitle: intl.formatMessage(messages['header.links.tools']),
      items: toolsMenuItems,
    },
  ] : [];

  const getOutlineLink = () => {
    if (isLibrary) {
      return `/library/${contextId}`;
    }
    return waffleFlags.useNewCourseOutlinePage ? `/course/${contextId}` : `${studioBaseUrl}/course/${contextId}`;
  };

  return (
    <>
      <ChalixHeaderWithUserPopup
        organizationTitle="HỆ THỐNG QUẢN TRỊ NỘI DUNG KHÓA HỌC"
        organizationName={title || `${org} ${number}`.trim() || getConfig().STUDIO_SHORT_NAME || "Studio"}
        searchPlaceholder="Tìm kiếm nội dung, khóa học..."
        baseApiUrl={getConfig().LMS_BASE_URL || ''}
        logoutUrl={`${getConfig().LMS_BASE_URL}/logout`}
        onNavigate={(tab) => {
          // Handle navigation based on tab
          const lmsBaseUrl = getConfig().LMS_BASE_URL || '';
          const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('local.openedx.io');
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          
          switch (tab) {
            case 'home':
              // Navigate to LMS home
              window.location.href = `${lmsBaseUrl}/`;
              break;
            case 'category':
              // Navigate to course catalog
              window.location.href = `${lmsBaseUrl}/courses`;
              break;
            case 'learning':
              // Navigate to learner dashboard (Học tập - course list)
              if (isDevelopment) {
                window.location.href = `${protocol}//${hostname}:1996/learner-dashboard/`;
              } else {
                window.location.href = `${lmsBaseUrl}/dashboard`;
              }
              break;
            case 'personalize':
              // Navigate to personalized learning page (Cá nhân hóa)
              if (isDevelopment) {
                window.location.href = `${protocol}//${hostname}:1996/learner-dashboard/?tab=personalized`;
              } else {
                window.location.href = `${lmsBaseUrl}/dashboard?tab=personalized`;
              }
              break;
            default:
              break;
          }
        }}
      />
      {meiliSearchEnabled && (
        <SearchModal
          isOpen={isShowSearchModalOpen}
          courseId={isLibrary ? undefined : contextId}
          onClose={closeSearchModal}
        />
      )}
    </>
  );
};

export default Header;

