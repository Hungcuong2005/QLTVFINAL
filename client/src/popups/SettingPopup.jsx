import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updatePassword } from "../store/slices/authSlice";
import settingIcon from "../assets/setting.png";
import { toggleSettingPopup } from "../store/slices/popUpSlice";

const SettingPopup = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const handleUpdatePassword = () => {
    const cp = currentPassword.trim();
    const np = newPassword.trim();
    const cnp = confirmNewPassword.trim();

    if (!cp || !np || !cnp) return;

    if (np.length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    if (np !== cnp) {
      alert("Xác nhận mật khẩu mới không khớp!");
      return;
    }


    dispatch(
      updatePassword({
        currentPassword: cp,
        newPassword: np,
        confirmNewPassword: cnp,
      })
    );

  };

  return (
    <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
      <div className="w-full bg-white rounded-xl shadow-xl sm:w-auto lg:w-1/2 2xl:w-1/3 overflow-hidden border border-[#FDE8EA]">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 bg-[#C41526] text-white">
          <div className="flex items-center gap-3">
            <span className="bg-white/15 p-3 rounded-lg">
              <img src={settingIcon} alt="setting-icon" className="w-6 h-6" />
            </span>
            <h3 className="text-lg sm:text-xl font-bold">Đổi mật khẩu</h3>
          </div>

          <button
            type="button"
            onClick={() => dispatch(toggleSettingPopup())}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full
             hover:bg-white/20 active:bg-white/30 transition"
            aria-label="Đóng"
            title="Đóng"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white"
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
        <div className="p-6">
          {/* ❌ Không dùng form nữa */}
          <div className="mb-4 sm:flex gap-4 items-center">
            <label className="block text-gray-900 font-medium w-full">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526] focus:border-[#C41526]"
              required
            />
          </div>

          <div className="mb-4 sm:flex gap-4 items-center">
            <label className="block text-gray-900 font-medium w-full">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526] focus:border-[#C41526]"
              required
            />
          </div>

          <div className="mb-4 sm:flex gap-4 items-center">
            <label className="block text-gray-900 font-medium w-full">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526] focus:border-[#C41526]"
              required
            />
          </div>

          {/* FOOTER BUTTONS */}
          <div className="flex gap-3 mt-8 justify-end">
            <button
              type="button"
              onClick={() => dispatch(toggleSettingPopup())}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleUpdatePassword}
              disabled={loading}
              className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Đang lưu..." : "Xác nhận"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingPopup;
