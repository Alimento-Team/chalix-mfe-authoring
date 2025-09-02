import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { getConfig } from '@edx/frontend-platform';
import { useIntl, FormattedMessage } from '@edx/frontend-platform/i18n';
import {
  ActionRow, Button, StandardModal, useToggle,
} from '@openedx/paragon';

import { getCourseSectionVertical, getCourseUnitData, getCourseId } from '../data/selectors';
import { useWaffleFlags } from '../../data/apiHooks';
import { COMPONENT_TYPES } from '../../generic/block-type-utils/constants';
import ComponentModalView from './add-component-modals/ComponentModalView';
import AddComponentButton from './add-component-btn';
import ChalixContentModal from './chalix-content-modal';
import './chalix-content-modal/ChalixContentModal.scss';
import messages from './messages';
import { ComponentPicker } from '../../library-authoring/component-picker';
import { ContentType } from '../../library-authoring/routes';
import { messageTypes } from '../constants';
import { useIframe } from '../../generic/hooks/context/hooks';
import { useEventListener } from '../../generic/hooks';
import VideoSelectorPage from '../../editors/VideoSelectorPage';
import EditorPage from '../../editors/EditorPage';
import { fetchCourseSectionVerticalData } from '../data/thunk';
import { createChalixUnit } from '../data/api';

const AddComponent = ({
  parentLocator,
  isSplitTestType,
  isUnitVerticalType,
  addComponentTemplateData,
  handleCreateNewCourseXBlock,
}) => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const [isOpenAdvanced, openAdvanced, closeAdvanced] = useToggle(false);
  const [isOpenHtml, openHtml, closeHtml] = useToggle(false);
  const [isOpenOpenAssessment, openOpenAssessment, closeOpenAssessment] = useToggle(false);
  const [isChalixModalOpen, openChalixModal, closeChalixModal] = useToggle(false);
  const [chalixSelectedType, setChalixSelectedType] = useState(null);
  const { componentTemplates = {} } = useSelector(getCourseSectionVertical);
  const blockId = addComponentTemplateData.parentLocator || parentLocator;
  const [isAddLibraryContentModalOpen, showAddLibraryContentModal, closeAddLibraryContentModal] = useToggle();
  const [isVideoSelectorModalOpen, showVideoSelectorModal, closeVideoSelectorModal] = useToggle();
  const [isXBlockEditorModalOpen, showXBlockEditorModal, closeXBlockEditorModal] = useToggle();

  const [blockType, setBlockType] = useState(null);
  const [courseId, setCourseId] = useState(null);
  const [newBlockId, setNewBlockId] = useState(null);
  const [isSelectLibraryContentModalOpen, showSelectLibraryContentModal, closeSelectLibraryContentModal] = useToggle();
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [usageId, setUsageId] = useState(null);
  const { sendMessageToIframe } = useIframe();
  const { useVideoGalleryFlow } = useWaffleFlags(courseId ?? undefined);

  const courseUnit = useSelector(getCourseUnitData);
  const sequenceId = courseUnit?.ancestorInfo?.ancestors?.[0]?.id;
  const currentCourseId = useSelector(getCourseId);

  const receiveMessage = useCallback(({ data: { type, payload } }) => {
    if (type === messageTypes.showMultipleComponentPicker) {
      showSelectLibraryContentModal();
    }
    if (type === messageTypes.showSingleComponentPicker) {
      setUsageId(payload.usageId);
      showAddLibraryContentModal();
    }
  }, [showSelectLibraryContentModal, showAddLibraryContentModal, setUsageId]);

  useEventListener('message', receiveMessage);

  const onComponentSelectionSubmit = useCallback(() => {
    sendMessageToIframe(messageTypes.addSelectedComponentsToBank, { selectedComponents });
    closeSelectLibraryContentModal();
  }, [selectedComponents]);

  const onXBlockSave = useCallback(/* istanbul ignore next */ () => {
    closeXBlockEditorModal();
    closeVideoSelectorModal();
    sendMessageToIframe(messageTypes.refreshXBlock, null);
    dispatch(fetchCourseSectionVerticalData(blockId, sequenceId));
  }, [closeXBlockEditorModal, closeVideoSelectorModal, sendMessageToIframe]);

  const onXBlockCancel = useCallback(/* istanbul ignore next */ () => {
    // ignoring tests because it triggers when someone closes the editor which has a separate store
    closeXBlockEditorModal();
    closeVideoSelectorModal();
    dispatch(fetchCourseSectionVerticalData(blockId, sequenceId));
  }, [closeXBlockEditorModal, closeVideoSelectorModal, sendMessageToIframe, blockId, sequenceId]);

  const handleLibraryV2Selection = useCallback((selection) => {
    handleCreateNewCourseXBlock({
      type: COMPONENT_TYPES.libraryV2,
      category: selection.blockType,
      parentLocator: usageId || blockId,
      libraryContentKey: selection.usageKey,
    });
    closeAddLibraryContentModal();
  }, [usageId]);

  const handleChalixModalClose = useCallback(() => {
    setChalixSelectedType(null);
    closeChalixModal();
  }, [closeChalixModal]);

  const handleChalixContentCreation = useCallback(async (contentType, contentData) => {
    try {
      // WORKAROUND: Use standard XBlock creation API since custom Chalix API isn't deployed yet
      // Create a vertical (unit) with the title
      const unitDisplayName = `${contentData.title} (Lớp Học Trực Tuyến)`;
      
      handleCreateNewCourseXBlock({
        type: 'vertical',
        parentLocator: blockId,
        displayName: unitDisplayName,
      }, async (unitResult) => {
        if (unitResult.locator && contentType === COMPONENT_TYPES.onlineClass) {
          // Create an HTML block with online class content
          setTimeout(() => {
            handleCreateNewCourseXBlock({
              type: 'html',
              parentLocator: unitResult.locator,
              displayName: 'Online Class Info',
              boilerplate: 'raw',
            }, (htmlResult) => {
              // The teacher will need to edit the HTML block to add the meeting URL
              // But the structure is now created
            });
          }, 500);
        }
        
        // Refresh the page after creation
        setTimeout(() => {
          dispatch(fetchCourseSectionVerticalData(blockId, sequenceId));
        }, 1500);
      });

      setChalixSelectedType(null);
      closeChalixModal();
      
    } catch (error) {
      alert(`Error creating content: ${error.message}`);
    }
  }, [blockId, sequenceId, dispatch, closeChalixModal, handleCreateNewCourseXBlock]);

  const handleCreateNewXBlock = (type, moduleName) => {
    switch (type) {
      case COMPONENT_TYPES.discussion:
      case COMPONENT_TYPES.dragAndDrop:
        handleCreateNewCourseXBlock({ type, parentLocator: blockId });
        break;
      case COMPONENT_TYPES.problem:
        handleCreateNewCourseXBlock({ type, parentLocator: blockId }, ({ courseKey, locator }) => {
          setCourseId(courseKey);
          setBlockType(type);
          setNewBlockId(locator);
          showXBlockEditorModal();
        });
        break;
      case COMPONENT_TYPES.video:
        handleCreateNewCourseXBlock(
          { type, parentLocator: blockId },
          /* istanbul ignore next */ ({ courseKey, locator }) => {
            setCourseId(courseKey);
            setBlockType(type);
            setNewBlockId(locator);
            if (useVideoGalleryFlow) {
              showVideoSelectorModal();
            } else {
              showXBlockEditorModal();
            }
          },
        );
        break;
        // TODO: The library functional will be a bit different of current legacy (CMS)
        //  behaviour and this ticket is on hold (blocked by other development team).
      case COMPONENT_TYPES.library:
        handleCreateNewCourseXBlock({ type, category: 'library_content', parentLocator: blockId });
        break;
      case COMPONENT_TYPES.itembank:
        handleCreateNewCourseXBlock({ type, category: 'itembank', parentLocator: blockId });
        break;
      case COMPONENT_TYPES.libraryV2:
        showAddLibraryContentModal();
        break;
      case COMPONENT_TYPES.advanced:
        handleCreateNewCourseXBlock({ type: moduleName, category: moduleName, parentLocator: blockId });
        break;
      case COMPONENT_TYPES.openassessment:
        handleCreateNewCourseXBlock({ boilerplate: moduleName, category: type, parentLocator: blockId });
        break;
      // Chalix content types - open the modal with pre-selected type
      case COMPONENT_TYPES.onlineClass:
      case COMPONENT_TYPES.unitVideo:
      case COMPONENT_TYPES.slide:
      case COMPONENT_TYPES.quiz:
        setChalixSelectedType(type);
        openChalixModal();
        break;
      case COMPONENT_TYPES.html:
        handleCreateNewCourseXBlock({
          type,
          boilerplate: moduleName,
          parentLocator: blockId,
        }, /* istanbul ignore next */ ({ courseKey, locator }) => {
          setCourseId(courseKey);
          setBlockType(type);
          setNewBlockId(locator);
          showXBlockEditorModal();
        });
        break;
      default:
    }
  };

  if (isUnitVerticalType || isSplitTestType) {
    return (
      <div className="py-4">
        {Object.keys(componentTemplates).length && isUnitVerticalType ? (
          <>
            <h5 className="h3 mb-4 text-center">{intl.formatMessage(messages.title)}</h5>
            
            {/* Direct Chalix Content Type Buttons */}
            <ul className="new-component-type list-unstyled m-0 d-flex flex-wrap justify-content-center">
              <li className="new-component-item d-flex">
                <AddComponentButton
                  onClick={() => handleCreateNewXBlock(COMPONENT_TYPES.onlineClass)}
                  displayName="Lớp Học Trực Tuyến"
                  type={COMPONENT_TYPES.onlineClass}
                  icon="fa fa-video-camera"
                />
              </li>
              <li className="new-component-item d-flex">
                <AddComponentButton
                  onClick={() => handleCreateNewXBlock(COMPONENT_TYPES.unitVideo)}
                  displayName="Video Bài Học"
                  type={COMPONENT_TYPES.unitVideo}
                  icon="fa fa-play-circle"
                />
              </li>
              <li className="new-component-item d-flex">
                <AddComponentButton
                  onClick={() => handleCreateNewXBlock(COMPONENT_TYPES.slide)}
                  displayName="Slide Bài Học"
                  type={COMPONENT_TYPES.slide}
                  icon="fa fa-file-powerpoint-o"
                />
              </li>
              <li className="new-component-item d-flex">
                <AddComponentButton
                  onClick={() => handleCreateNewXBlock(COMPONENT_TYPES.quiz)}
                  displayName="Bài Kiểm Tra"
                  type={COMPONENT_TYPES.quiz}
                  icon="fa fa-question-circle"
                />
              </li>
            </ul>
          </>
        ) : null}
        <StandardModal
          title={
            isAddLibraryContentModalOpen
              ? intl.formatMessage(messages.singleComponentPickerModalTitle)
              : intl.formatMessage(messages.multipleComponentPickerModalTitle)
          }
          isOpen={isAddLibraryContentModalOpen || isSelectLibraryContentModalOpen}
          onClose={() => {
            closeAddLibraryContentModal();
            closeSelectLibraryContentModal();
          }}
          isOverflowVisible={false}
          size="xl"
          footerNode={
            isSelectLibraryContentModalOpen && (
              <ActionRow>
                <Button onClick={onComponentSelectionSubmit}>
                  <FormattedMessage {...messages.multipleComponentPickerModalBtn} />
                </Button>
              </ActionRow>
            )
          }
        >
          <ComponentPicker
            showOnlyPublished
            extraFilter={['NOT block_type = "unit"', 'NOT block_type = "section"', 'NOT block_type = "subsection"']}
            visibleTabs={[ContentType.home, ContentType.components, ContentType.collections]}
            componentPickerMode={isAddLibraryContentModalOpen ? 'single' : 'multiple'}
            onComponentSelected={handleLibraryV2Selection}
            onChangeComponentSelection={setSelectedComponents}
          />
        </StandardModal>
        <StandardModal
          title={intl.formatMessage(messages.videoPickerModalTitle)}
          isOpen={isVideoSelectorModalOpen}
          onClose={closeVideoSelectorModal}
          isOverflowVisible={false}
          size="xl"
        >
          <div className="selector-page">
            <VideoSelectorPage
              blockId={newBlockId}
              courseId={courseId}
              studioEndpointUrl={getConfig().STUDIO_BASE_URL}
              lmsEndpointUrl={getConfig().LMS_BASE_URL}
              onCancel={closeVideoSelectorModal}
              returnFunction={/* istanbul ignore next */ () => onXBlockSave}
            />
          </div>
        </StandardModal>
        <ChalixContentModal
          isOpen={isChalixModalOpen}
          onClose={handleChalixModalClose}
          onCreateContent={handleChalixContentCreation}
          parentLocator={blockId}
          initialSelectedType={chalixSelectedType}
        />
        {isXBlockEditorModalOpen && (
          <div className="editor-page">
            <EditorPage
              courseId={courseId}
              blockType={blockType}
              blockId={newBlockId}
              studioEndpointUrl={getConfig().STUDIO_BASE_URL}
              lmsEndpointUrl={getConfig().LMS_BASE_URL}
              onClose={onXBlockCancel}
              returnFunction={/* istanbul ignore next */ () => onXBlockSave}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
};

AddComponent.propTypes = {
  isSplitTestType: PropTypes.bool.isRequired,
  isUnitVerticalType: PropTypes.bool.isRequired,
  parentLocator: PropTypes.string.isRequired,
  handleCreateNewCourseXBlock: PropTypes.func.isRequired,
  addComponentTemplateData: {
    blockId: PropTypes.string.isRequired,
    model: PropTypes.shape({
      displayName: PropTypes.string.isRequired,
      category: PropTypes.string,
      type: PropTypes.string.isRequired,
      templates: PropTypes.arrayOf(
        PropTypes.shape({
          boilerplateName: PropTypes.string,
          category: PropTypes.string,
          displayName: PropTypes.string.isRequired,
          supportLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
        }),
      ),
      supportLegend: PropTypes.shape({
        allowUnsupportedXblocks: PropTypes.bool,
        documentationLabel: PropTypes.string,
        showLegend: PropTypes.bool,
      }),
    }),
  },
};

export default AddComponent;
