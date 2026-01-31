import { createSlice } from "@reduxjs/toolkit";
import axiosClient from "../../api/axiosClient";
import { toggleAddBookPopup } from "./popUpSlice";
import { toast } from "react-toastify";

/**
 * bookSlice - Quản lý trạng thái Sách
 * Bao gồm:
 * - Lấy danh sách sách (Phân trang, Lọc)
 * - Thêm sách mới
 */
const bookSlice = createSlice({
  name: "book",
  initialState: {
    loading: false,     // Đang loading
    error: null,        // Lỗi
    message: null,      // Thông báo thành công
    books: [],          // Danh sách sách
    totalBooks: 0,      // Tổng số sách (cho pagination)
    page: 1,            // Trang hiện tại
    limit: 0,           // Số lượng item/trang
    totalPages: 1,      // Tổng số trang
  },
  reducers: {
    // --- LẤY DANH SÁCH SÁCH ---
    fetchBooksRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchBooksSuccess(state, action) {
      state.loading = false;
      state.books = action.payload.books;
      state.totalBooks = action.payload.totalBooks;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
      state.totalPages = action.payload.totalPages;
      state.message = null;
    },
    fetchBooksFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    // --- THÊM SÁCH ---
    addBookRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    addBookSuccess(state, action) {
      state.loading = false;
      state.message = action.payload?.message || null;

      const newBook = action.payload?.book;
      if (!newBook) return;

      // Nếu sách đã tồn tại (chỉ là update thêm số lượng) -> Update trong list
      const existingIndex = state.books.findIndex((book) => book._id === newBook._id);
      if (existingIndex >= 0) {
        state.books[existingIndex] = {
          ...state.books[existingIndex],
          ...newBook,
        };
        return;
      }

      // Nếu sách mới hoàn toàn -> Thêm vào đầu danh sách
      state.books = [newBook, ...state.books];
      state.totalBooks = (state.totalBooks || 0) + 1;
      if (state.limit) {
        state.totalPages = Math.max(Math.ceil(state.totalBooks / state.limit), 1);
      }
    },
    addBookFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // --- RESET SLICE ---
    resetBookSlice(state) {
      state.error = null;
      state.message = null;
      state.loading = false;
    },
  },
});

// ==========================================
// THUNK ACTIONS
// ==========================================

// Lấy danh sách sách có filter & pagination
export const fetchAllBooks = (params = {}) => async (dispatch) => {
  dispatch(bookSlice.actions.fetchBooksRequest());
  try {
    const res = await axiosClient.get("/book/all", {
      params,
    });

    dispatch(
      bookSlice.actions.fetchBooksSuccess({
        books: res.data.books,
        totalBooks: res.data.totalBooks,
        page: res.data.page,
        limit: res.data.limit,
        totalPages: res.data.totalPages,
      })
    );
  } catch (err) {
    dispatch(
      bookSlice.actions.fetchBooksFailed(
        err?.response?.data?.message || "Lỗi tải danh sách sách."
      )
    );
  }
};

// Thêm sách mới
export const addBook = (data) => async (dispatch, getState) => {
  dispatch(bookSlice.actions.addBookRequest());

  try {
    const res = await axiosClient.post("/book/admin/add", data);

    dispatch(
      bookSlice.actions.addBookSuccess({
        message: res.data.message,
        book: res.data.book,
      })
    );

    // ✅ PHÂN BIỆT TOAST: thêm đầu sách vs thêm bản sao (BookCopy)
    // Nếu chỉ có ISBN và Quantity mà không có Title/Author thì là thêm Copy
    const isAddCopiesOnly =
      data &&
      typeof data === "object" &&
      "isbn" in data &&
      "quantity" in data &&
      !("title" in data) &&
      !("author" in data) &&
      !("price" in data) &&
      !("description" in data);

    const toastMsg = isAddCopiesOnly
      ? "ISBN đã tồn tại → đã thêm bản sao (BookCopy) và cập nhật số lượng."
      : "Đã thêm đầu sách và tạo bản sao (BookCopy) thành công.";

    // ✅ CHỐNG TRÙNG TOAST bằng toastId
    const toastKey = isAddCopiesOnly
      ? `add-copies-${data?.isbn || "unknown"}`
      : `add-title-${data?.isbn || "unknown"}`;

    toast.success(toastMsg, { toastId: toastKey });

    // Đóng popup thêm sách nếu đang mở
    const { popup } = getState();
    if (popup?.addBookPopup) {
      dispatch(toggleAddBookPopup());
    }
  } catch (err) {
    const msg = err?.response?.data?.message || "Thêm sách thất bại.";
    dispatch(bookSlice.actions.addBookFailed(msg));
    toast.error(msg, { toastId: `add-book-error-${data?.isbn || "unknown"}` });
  }
};

// Reset state
export const resetBookSlice = () => (dispatch) => {
  dispatch(bookSlice.actions.resetBookSlice());
};

export default bookSlice.reducer;