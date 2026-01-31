import React, { useEffect, useState } from "react";
import settingIcon from "../assets/setting.png";
import userIcon from "../assets/user.png";
import { useDispatch, useSelector } from "react-redux";
import { toggleSettingPopup } from "../store/slices/popUpSlice";

const Header = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      // Giờ theo định dạng 24h (VN) HH:mm:ss
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);

      // Ngày theo định dạng VN: dd/MM/yyyy
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setCurrentDate(`${day}/${month}/${year}`);
    };

    updateDateTime();
    const intervalId = setInterval(updateDateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const roleText =
    user?.role === "Admin" ? "Quản trị viên" : user?.role === "User" ? "Người dùng" : user?.role;

  return (
    <>
      <header className="absolute top-0 bg-white w-full py-4 px-6 left-0 shadow-md flex justify-between items-center border-b-2 border-[#FDE8EA]">
        {/* BÊN TRÁI */}
        <div className="flex items-center gap-2">
          <img src={userIcon} alt="userIcon" className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-sm font-medium sm:text-lg lg:text-xl sm:font-semibold text-[#C41526]">
              {user?.name}
            </span>
            <span className="text-sm font-medium sm:text-lg sm:font-medium text-gray-700">
              {roleText}
            </span>
          </div>
        </div>

        {/* BÊN PHẢI */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col text-sm lg:text-base items-end font-semibold">
            <span className="text-[#C41526]">{currentTime}</span>
            <span className="text-gray-700">{currentDate}</span>
          </div>

          <span className="bg-[#C41526] h-14 w-[2px]" />

          <button
            type="button"
            className="p-2 rounded hover:bg-[#FDE8EA] transition"
            onClick={() => dispatch(toggleSettingPopup())}
            title="Cài đặt"
          >
            <img
              src={settingIcon}
              alt="settingIcon"
              className="w-8 h-8 cursor-pointer"
            />
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;
