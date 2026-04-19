import * as actionTypes from './types';

const contextActions = (dispatch) => {
  return {
    navMenu: {
      open: () => {
        dispatch({ type: actionTypes.OPEN_NAV_MENU });
      },
      close: () => {
        dispatch({ type: actionTypes.CLOSE_NAV_MENU });
      },
      collapse: () => {
        dispatch({ type: actionTypes.COLLAPSE_NAV_MENU });
      },
    },
    app: {
      open: (appName) => {
        dispatch({ type: actionTypes.CHANGE_APP, playload: appName });
      },
      default: () => {
        dispatch({ type: actionTypes.DEFAULT_APP });
      },
    },
    olaPanel: {
      open: () => {
        dispatch({ type: actionTypes.OPEN_OLA_PANEL });
      },
      close: () => {
        dispatch({ type: actionTypes.CLOSE_OLA_PANEL });
      },
    },
    historyModal: {
      open: () => {
        dispatch({ type: actionTypes.OPEN_HISTORY_MODAL });
      },
      close: () => {
        dispatch({ type: actionTypes.CLOSE_HISTORY_MODAL });
      },
    },
    chatSession: {
      setActive: (sessionId) => {
        dispatch({ type: actionTypes.SET_ACTIVE_SESSION, payload: sessionId });
      },
      setList: (sessions) => {
        dispatch({ type: actionTypes.SET_SESSION_LIST, payload: sessions });
      },
    },
  };
};

export default contextActions;
