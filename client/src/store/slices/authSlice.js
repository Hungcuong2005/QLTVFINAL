import { createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";

/**
 * authSlice - Quản lý trạng thái xác thực người dùng
 * Bao gồm:
 * - Đăng ký, Đăng nhập, Đăng xuất
 * - Xác thực OTP
 * - Quên mật khẩu, Đặt lại mật khẩu, Đổi mật khẩu
 * - Lấy thông tin người dùng hiện tại (me)
 */
const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,         // Trạng thái đang xử lý API
    error: null,            // Lưu lỗi nếu có
    message: null,          // Lưu thông báo thành công
    user: null,             // Lưu thông tin user đăng nhập
    isAuthenticated: false, // Trạng thái đã đăng nhập hay chưa
  },
  reducers: {
    // --- ĐĂNG KÝ ---
    registerRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    registerSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    registerFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- XÁC THỰC OTP ---
    otpVerificationRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    otpVerificationSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    },
    otpVerificationFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- ĐĂNG NHẬP ---
    loginRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
    },
    loginFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- ĐĂNG XUẤT ---
    logoutRequest(state) {
      state.loading = true;
      state.message = null;
      state.error = null;
    },
    logoutSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
      state.isAuthenticated = false;
      state.user = null;
    },
    logoutFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- LẤY THÔNG TIN USER (ME) ---
    getUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUserSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    getUserFailed(state) {
      state.loading = false;
      state.user = null;
      state.isAuthenticated = false;
    },

    // --- QUÊN MẬT KHẨU ---
    forgotPasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    forgotPasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    forgotPasswordFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- ĐẶT LẠI MẬT KHẨU (SAU KHI QUÊN) ---
    resetPasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    resetPasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },
    resetPasswordFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- ĐỔI MẬT KHẨU (KHI ĐANG ĐĂNG NHẬP) ---
    updatePasswordRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updatePasswordSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
    updatePasswordFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- RESET SLICE (XÓA STATE TẠM) ---
    resetAuthSlice(state) {
      state.error = null;
      state.loading = false;
      state.message = null;
      // Không reset user/isAuthenticated để tránh bị logout oan
      state.user = state.user;
      state.isAuthenticated = state.isAuthenticated;
    },
  },
});

// Action reset state thủ công
export const resetAuthSlice = () => (dispatch) => {
  dispatch(authSlice.actions.resetAuthSlice());
};

// ==========================================
// CÁC HÀM GỌI API (THUNK ACTIONS)
// ==========================================

// Đăng ký tài khoản mới
export const register = (data) => async (dispatch) => {
  dispatch(authSlice.actions.registerRequest());

  try {
    const res = await axiosClient.post("/auth/register", data, {
      headers: { "Content-Type": "application/json" },
    });

    dispatch(authSlice.actions.registerSuccess(res.data));
  } catch (error) {
    dispatch(
      authSlice.actions.registerFailed(
        error?.response?.data?.message || "Register failed"
      )
    );
  }
};

// Xác thực OTP để kích hoạt tài khoản
export const otpVerification = (email, otp) => async (dispatch) => {
  dispatch(authSlice.actions.otpVerificationRequest());

  await axiosClient
    .post("/auth/verify-otp", { email, otp })
    .then((res) => {
      dispatch(authSlice.actions.otpVerificationSuccess(res.data));
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.otpVerificationFailed(
          error.response.data.message
        )
      );
    });
};

// Đăng nhập
export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());

  await axiosClient
    .post("/auth/login", data)
    .then((res) => {

      // ✅ LƯU TOKEN
      localStorage.setItem("token", res.data.token);

      dispatch(authSlice.actions.loginSuccess(res.data));
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.loginFailed(
          error.response.data.message
        )
      );
    });
};


// Đăng xuất
export const logout = () => async (dispatch) => {
  dispatch(authSlice.actions.logoutRequest());

  await axiosClient
    .get("/auth/logout")
    .then((res) => {

      // ✅ XÓA TOKEN
      localStorage.removeItem("token");

      dispatch(authSlice.actions.logoutSuccess(res.data.message));
      dispatch(authSlice.actions.resetAuthSlice());
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.logoutFailed(
          error.response.data.message
        )
      );
    });
};


// Lấy thông tin user hiện tại (Load User)
export const getUser = () => async (dispatch) => {
  dispatch(authSlice.actions.getUserRequest());

  await axiosClient
    .get("/auth/me")
    .then((res) => {
      dispatch(authSlice.actions.getUserSuccess(res.data));
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.getUserFailed(
          error.response.data.message
        )
      );
    });
};

// Yêu cầu quên mật khẩu (Gửi OTP về mail)
export const forgotPassword = (email) => async (dispatch) => {
  dispatch(authSlice.actions.forgotPasswordRequest());

  await axiosClient
    .post(
      "/auth/password/forgot",
      { email }
    )
    .then((res) => {
      dispatch(
        authSlice.actions.forgotPasswordSuccess(res.data)
      );
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.forgotPasswordFailed(
          error.response.data.message
        )
      );
    });
};

// Đặt lại mật khẩu mới (kèm token)
export const resetPassword = (data, token) => async (dispatch) => {
  dispatch(authSlice.actions.resetPasswordRequest());

  await axiosClient
    .put(
      `/auth/password/reset/${token}`,
      data
    )
    .then((res) => {
      dispatch(
        authSlice.actions.resetPasswordSuccess(res.data)
      );
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.resetPasswordFailed(
          error.response.data.message
        )
      );
    });
};

// Đổi mật khẩu (User đang đăng nhập)
export const updatePassword = (data) => async (dispatch) => {
  dispatch(authSlice.actions.updatePasswordRequest());

  await axiosClient
    .put(
      "/auth/password/update",
      data
    )
    .then((res) => {
      dispatch(
        authSlice.actions.updatePasswordSuccess(res.data.message)
      );
    })
    .catch((error) => {
      dispatch(
        authSlice.actions.updatePasswordFailed(
          error.response.data.message
        )
      );
    });
};

export default authSlice.reducer;