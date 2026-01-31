import React from "react";
import { useDispatch } from "react-redux";
import { toggleReadBookPopup } from "../store/slices/popUpSlice";

const ReadBookPopup = ({ book }) => {
  const dispatch = useDispatch();

  return (
    <div className="fixed inset-0 bg-black/50 p-4 sm:p-5 flex items-center justify-center z-50">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl overflow-hidden border border-[#FDE8EA]">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-[#C41526] text-white px-5 py-4">
          <h2 className="text-base sm:text-lg font-bold">Xem thông tin sách</h2>

          <button
            type="button"
            onClick={() => dispatch(toggleReadBookPopup())}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-white/15 transition"
            aria-label="Đóng"
            title="Đóng"
          >
            {/* X icon (không bị lệch như &times;) */}
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Tên sách
            </label>
            <div className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
              {book?.title || "—"}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Tác giả
            </label>
            <div className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
              {book?.author || "—"}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Mô tả
            </label>
            <div className="border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 min-h-[44px]">
              {book?.description || "—"}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-5 py-4 bg-white border-t border-[#FDE8EA] flex justify-end">
          <button
            type="button"
            className="px-5 py-2 bg-[#C41526] text-white rounded-lg hover:bg-[#A81220] transition"
            onClick={() => dispatch(toggleReadBookPopup())}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadBookPopup;