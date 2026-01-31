import { createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";
import { toggleRecordBookPopup } from "./popUpSlice";
import { toast } from "react-toastify";

/**
 * borrowSlice - Quản lý trạng thái mượn/trả sách
 * Bao gồm:
 * - Lấy danh sách sách đang mượn của User
 * - Lấy toàn bộ danh sách mượn (cho Admin)
 * - Ghi nhận mượn sách (Admin action)
 * - Trả sách
 * - Gia hạn sách
 */
const borrowSlice = createSlice({
  name: "borrow",
  initialState: {
    loading: false,             // Trạng thái loading
    error: null,                // Lưu lỗi
    userBorrowedBooks: [],      // Danh sách mượn của User hiện tại
    allBorrowedBooks: [],       // Danh sách tất cả lượt mượn (Admin dùng)
    message: null,              // Thông báo thành công
  },
  reducers: {
    // --- LẤY DANH SÁCH MƯỢN CỦA USER ---
    fetchUserBorrowedBooksRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchUserBorrowedBooksSuccess(state, action) {
      state.loading = false;
      state.userBorrowedBooks = action.payload;
    },
    fetchUserBorrowedBooksFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- GHI NHẬN MƯỢN SÁCH (RECORD BORROW) ---
    recordBookRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    recordBookSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
    recordBookFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- LẤY TẤT CẢ DANH SÁCH MƯỢN (ADMIN) ---
    fetchAllBorrowedBooksRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchAllBorrowedBooksSuccess(state, action) {
      state.loading = false;
      state.allBorrowedBooks = action.payload;
    },
    fetchAllBorrowedBooksFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- TRẢ SÁCH ---
    returnBookRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    returnBookSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
    returnBookFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- GIA HẠN SÁCH ---
    renewBookRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    renewBookSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
    },
    renewBookFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- RESET CLEAN STATE ---
    resetBorrowSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
    },
  },
});

// ==========================================
// THUNK ACTIONS
// ==========================================

// Lấy danh sách sách đang mượn của User đăng nhập
export const fetchUserBorrowedBooks = () => async (dispatch) => {
  dispatch(borrowSlice.actions.fetchUserBorrowedBooksRequest());

  await axiosClient
    .get("/borrow/my-borrowed-books")
    .then((res) => {
      dispatch(
        borrowSlice.actions.fetchUserBorrowedBooksSuccess(
          res.data.borrowedBooks
        )
      );
    })
    .catch((err) => {
      dispatch(
        borrowSlice.actions.fetchUserBorrowedBooksFailed(
          err.response.data.message
        )
      );
    });
};

// Admin: Lấy tất cả danh sách mượn
export const fetchAllBorrowedBooks = () => async (dispatch) => {
  dispatch(borrowSlice.actions.fetchAllBorrowedBooksRequest());

  await axiosClient
    .get(
      "/borrow/borrowed-books-by-users"
    )
    .then((res) => {
      dispatch(
        borrowSlice.actions.fetchAllBorrowedBooksSuccess(
          res.data.borrowedBooks
        )
      );
    })
    .catch((err) => {
      dispatch(
        borrowSlice.actions.fetchAllBorrowedBooksFailed(
          err.response.data.message
        )
      );
    });
};

// Admin: Ghi nhận 1 lượt mượn mới
// Gửi kèm copyId để xác định chính xác cuốn sách nào được mượn
export const recordBorrowBook = (email, bookId, copyId) => async (dispatch) => {
  dispatch(borrowSlice.actions.recordBookRequest());

  await axiosClient
    .post(
      `/borrow/record-borrow-book/${bookId}`,
      { email, copyId } // ✅ Cần cả email người mượn và ID cuốn sách copy
    )
    .then((res) => {
      dispatch(borrowSlice.actions.recordBookSuccess(res.data.message));

      // ✅ Hiển thị Toast thông báo mã cuốn sách vừa mượn
      const copyCode = res.data.bookCopyCode || "N/A";
      toast.success(
        `${res.data.message || "Ghi nhận mượn sách thành công!"}\nMã cuốn: ${copyCode}`,
        { toastId: `record-borrow-${bookId}-${copyId}` }
      );

      // Đóng popup sau khi thành công
      dispatch(toggleRecordBookPopup());
    })
    .catch((err) => {
      const msg = err?.response?.data?.message || "Ghi nhận mượn sách thất bại!";
      dispatch(borrowSlice.actions.recordBookFailed(msg));

      // Thông báo lỗi
      toast.error(msg, { toastId: `record-borrow-error-${bookId}` });
    });
};

// Admin: Xác nhận trả sách
export const returnBook = (email, id) => async (dispatch) => {
  dispatch(borrowSlice.actions.returnBookRequest());

  await axiosClient
    .put(
      `/borrow/return-borrowed-book/${id}`,
      { email }
    )
    .then((res) => {
      dispatch(
        borrowSlice.actions.returnBookSuccess(res.data.message)
      );
    })
    .catch((err) => {
      dispatch(
        borrowSlice.actions.returnBookFailed(
          err.response.data.message
        )
      );
    });
};

// User: Gia hạn sách
export const renewBorrowedBook = (borrowId) => async (dispatch) => {
  dispatch(borrowSlice.actions.renewBookRequest());

  await axiosClient
    .post(`/borrow/renew/${borrowId}`, {})
    .then((res) => {
      dispatch(borrowSlice.actions.renewBookSuccess(res.data.message));
    })
    .catch((err) => {
      dispatch(
        borrowSlice.actions.renewBookFailed(
          err.response?.data?.message || err.message
        )
      );
    });
};

// Reset state
export const resetBorrowSlice = () => (dispatch) => {
  dispatch(borrowSlice.actions.resetBorrowSlice());
};

export default borrowSlice.reducer;