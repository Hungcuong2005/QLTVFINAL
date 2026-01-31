import { createSlice } from "@reduxjs/toolkit";

const popupSlice = createSlice({
  name: "popup",
  initialState: {
    settingPopup: false,
    addBookPopup: false,

    // ✅ category list popup
    categoryListPopup: false,

    // ✅ add category popup
    addCategoryPopup: false,

    readBookPopup: false,
    recordBookPopup: false,
    returnBookPopup: false,
    addNewAdminPopup: false,
  },
  reducers: {
    toggleSettingPopup(state) {
      state.settingPopup = !state.settingPopup;
    },
    toggleAddBookPopup(state) {
      state.addBookPopup = !state.addBookPopup;
    },

    // ✅ category list
    toggleCategoryListPopup(state) {
      state.categoryListPopup = !state.categoryListPopup;
    },

    // ✅ add category
    toggleAddCategoryPopup(state) {
      state.addCategoryPopup = !state.addCategoryPopup;
    },

    toggleReadBookPopup(state) {
      state.readBookPopup = !state.readBookPopup;
    },
    toggleRecordBookPopup(state) {
      state.recordBookPopup = !state.recordBookPopup;
    },
    toggleAddNewAdminPopup(state) {
      state.addNewAdminPopup = !state.addNewAdminPopup;
    },
    toggleReturnBookPopup(state) {
      state.returnBookPopup = !state.returnBookPopup;
    },
    closeAllPopup(state) {
      state.addBookPopup = false;
      state.categoryListPopup = false;
      state.addCategoryPopup = false;

      state.addNewAdminPopup = false;
      state.readBookPopup = false;
      state.recordBookPopup = false;
      state.returnBookPopup = false;
      state.settingPopup = false;
    },
  },
});

export const {
  closeAllPopup,
  toggleAddBookPopup,
  toggleCategoryListPopup,
  toggleAddCategoryPopup,
  toggleAddNewAdminPopup,
  toggleReadBookPopup,
  toggleRecordBookPopup,
  toggleReturnBookPopup,
  toggleSettingPopup,
} = popupSlice.actions;

export default popupSlice.reducer;