import { createSlice } from '@reduxjs/toolkit';
import { RequestStatus } from '../../../data/constants';

const initialState = {
  slideIds: [],
  loadingStatus: RequestStatus.IN_PROGRESS,
  pageSettings: {},
  editingStatus: {
    add: RequestStatus.SUCCESSFUL,
    delete: RequestStatus.SUCCESSFUL,
    download: RequestStatus.SUCCESSFUL,
    thumbnail: RequestStatus.SUCCESSFUL,
    usageMetrics: RequestStatus.SUCCESSFUL,
  },
  errors: {
    add: [],
    delete: [],
    download: [],
    thumbnail: [],
    usageMetrics: [],
  },
};

const slideSlice = createSlice({
  name: 'slides',
  initialState,
  reducers: {
    setSlideIds: (state, action) => {
      state.slideIds = action.payload.slideIds;
    },
    setPageSettings: (state, action) => {
      state.pageSettings = action.payload;
    },
    updateLoadingStatus: (state, action) => {
      state.loadingStatus = action.payload.status;
    },
    updateEditStatus: (state, action) => {
      const { editType, status } = action.payload;
      state.editingStatus[editType] = status;
    },
    deleteSlideSuccess: (state, action) => {
      const { slideId } = action.payload;
      state.slideIds = state.slideIds.filter(id => id !== slideId);
    },
    updateErrors: (state, action) => {
      const { error, message } = action.payload;
      if (!state.errors[error]) {
        state.errors[error] = [];
      }
      state.errors[error].push(message);
    },
    clearErrors: (state, action) => {
      const { error } = action.payload;
      if (state.errors[error]) {
        state.errors[error] = [];
      }
    },
    failAddSlide: (state, action) => {
      const { fileName } = action.payload;
      if (!state.errors.add) {
        state.errors.add = [];
      }
      state.errors.add.push(`Failed to upload ${fileName}.`);
    },
  },
});

export const {
  setSlideIds,
  setPageSettings,
  updateLoadingStatus,
  updateEditStatus,
  deleteSlideSuccess,
  updateErrors,
  clearErrors,
  failAddSlide,
} = slideSlice.actions;

export const {
  reducer,
} = slideSlice;
