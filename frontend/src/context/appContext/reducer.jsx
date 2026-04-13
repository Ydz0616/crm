import * as actionTypes from './types';

export const initialState = {
  isNavMenuClose: false,
  currentApp: 'default',
  isOlaPanelOpen: false,
  isHistoryModalOpen: false,
  activeSessionId: null,
  sessionList: [],
};

export function contextReducer(state, action) {
  switch (action.type) {
    case actionTypes.OPEN_NAV_MENU:
      return {
        ...state,
        isNavMenuClose: false,
      };
    case actionTypes.CLOSE_NAV_MENU:
      return {
        ...state,
        isNavMenuClose: true,
      };
    case actionTypes.COLLAPSE_NAV_MENU:
      return {
        ...state,
        isNavMenuClose: !state.isNavMenuClose,
      };
    case actionTypes.CHANGE_APP:
      return {
        ...state,
        currentApp: action.playload,
      };
    case actionTypes.DEFAULT_APP:
      return {
        ...state,
        currentApp: 'default',
      };
    case actionTypes.OPEN_OLA_PANEL:
      return {
        ...state,
        isOlaPanelOpen: true,
      };
    case actionTypes.CLOSE_OLA_PANEL:
      return {
        ...state,
        isOlaPanelOpen: false,
      };
    case actionTypes.OPEN_HISTORY_MODAL:
      return {
        ...state,
        isHistoryModalOpen: true,
      };
    case actionTypes.CLOSE_HISTORY_MODAL:
      return {
        ...state,
        isHistoryModalOpen: false,
      };
    case actionTypes.SET_ACTIVE_SESSION:
      return {
        ...state,
        activeSessionId: action.payload,
      };
    case actionTypes.SET_SESSION_LIST:
      return {
        ...state,
        sessionList: action.payload,
      };

    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}
