import { createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";
import { toggleAddNewAdminPopup } from "./popUpSlice";

/**
 * userSlice - Quản lý trạng thái Người dùng
 * Bao gồm:
 * - Lấy danh sách người dùng
 * - Thêm Admin mới
 * - Xóa / Khôi phục / Khóa người dùng
 */
const userSlice = createSlice({
  name: "user",
  initialState: {
    users: [],       // Danh sách Users
    loading: false,  // Trạng thái Loading
  },
  reducers: {
    // --- LẤY DANH SÁCH USER ---
    fetchAllUsersRequest(state) {
      state.loading = true;
    },
    fetchAllUsersSuccess(state, action) {
      state.loading = false;
      state.users = action.payload;
    },
    fetchAllUsersFailed(state) {
      state.loading = false;
    },

    // --- THÊM ADMIN MỚI ---
    addNewAdminRequest(state) {
      state.loading = true;
    },
    addNewAdminSuccess(state) {
      state.loading = false;
    },
    addNewAdminFailed(state) {
      state.loading = false;
    },
  },
});

// ==========================================
// THUNK ACTIONS
// ==========================================

/**
 * ✅ Fetch users (CHỈ user đã verify)
 * @param {"active"|"deleted"} status
 *  - "active": User đang hoạt động
 *  - "deleted": User đã bị xóa (Soft Delete)
 */
export const fetchAllUsers = (status = "active") => async (dispatch) => {
  dispatch(userSlice.actions.fetchAllUsersRequest());

  try {
    const safeStatus = encodeURIComponent(status);

    const { data } = await axiosClient.get(`/user/all?status=${safeStatus}`);

    dispatch(userSlice.actions.fetchAllUsersSuccess(data.users));
  } catch (err) {
    dispatch(userSlice.actions.fetchAllUsersFailed());
    toast.error(
      err?.response?.data?.message || "Không thể tải danh sách người dùng."
    );
  }
};

/**
 * ✅ Add new admin
 * @param {FormData} data - Form data của Admin mới (avatar, name, email...)
 * @param {"active"|"deleted"} refreshStatus - Tab hiện tại để refresh list sau khi thêm
 */
export const addNewAdmin =
  (data, refreshStatus = "active") =>
    async (dispatch) => {
      dispatch(userSlice.actions.addNewAdminRequest());

      try {
        const res = await axiosClient.post("/user/add/new-admin", data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        dispatch(userSlice.actions.addNewAdminSuccess());
        toast.success(res.data.message);
        dispatch(toggleAddNewAdminPopup());

        // 👉 Refresh lại danh sách user theo tab hiện tại
        dispatch(fetchAllUsers(refreshStatus));
      } catch (err) {
        dispatch(userSlice.actions.addNewAdminFailed());
        toast.error(err?.response?.data?.message || "Thêm admin thất bại.");
      }
    };

export default userSlice.reducer;