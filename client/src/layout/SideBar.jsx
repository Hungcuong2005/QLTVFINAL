import React, { useEffect } from "react";
import logo_with_title from "../assets/logo.png";
import logoutIcon from "../assets/logout.png";
import closeIcon from "../assets/white-close-icon.png";
import dashboardIcon from "../assets/element.png";
import bookIcon from "../assets/book.png";
import catalogIcon from "../assets/catalog.png";
import settingIcon from "../assets/setting-white.png";
import usersIcon from "../assets/people.png";
import { RiAdminFill } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";
import { logout, resetAuthSlice } from "../store/slices/authSlice";
import { toast } from "react-toastify";
import {
  toggleAddNewAdminPopup,
  toggleSettingPopup,
} from "../store/slices/popUpSlice";
import AddNewAdmin from "../popups/AddNewAdmin";
import SettingPopup from "../popups/SettingPopup";

const SideBar = ({ isSideBarOpen, setIsSideBarOpen, setSelectedComponent }) => {
  const dispatch = useDispatch();
  const { addNewAdminPopup, settingPopup } = useSelector((state) => state.popup);
  const { loading, error, message, user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleLogout = () => {
    dispatch(logout());
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }

    if (message) {
      toast.success(message);
      dispatch(resetAuthSlice());
    }
  }, [dispatch, isAuthenticated, error, loading, message]);

  const navBtnClass =
    "w-full py-2 font-medium bg-transparent rounded-md hover:cursor-pointer flex items-center space-x-2 px-2 hover:bg-white/10 transition";

  return (
    <>
      <aside
        className={`${
          isSideBarOpen ? "left-0" : "-left-full"
        } z-10 transition-all duration-700 md:relative md:left-0 flex w-64 bg-[#C41526] text-white flex-col h-full`}
        style={{ position: "fixed" }}
      >
        <div className="px-6 py-4 my-8">
          <img src={logo_with_title} alt="logo" />
        </div>

        <nav className="flex-1 px-6 space-y-2">
          <button
            className={navBtnClass}
            onClick={() => setSelectedComponent("Dashboard")}
          >
            <img src={dashboardIcon} alt="icon" />
            <span>Bảng điều khiển</span>
          </button>

          <button
            className={navBtnClass}
            onClick={() => setSelectedComponent("Books")}
          >
            <img src={bookIcon} alt="icon" />
            <span>Sách</span>
          </button>

          {isAuthenticated && user?.role === "Admin" && (
            <>
              <button
                className={navBtnClass}
                onClick={() => setSelectedComponent("Catalog")}
              >
                <img src={catalogIcon} alt="icon" />
                <span>Mượn/Trả</span>
              </button>

              <button
                className={navBtnClass}
                onClick={() => setSelectedComponent("Users")}
              >
                <img src={usersIcon} alt="icon" />
                <span>Người dùng</span>
              </button>

              <button
                className={navBtnClass}
                onClick={() => dispatch(toggleAddNewAdminPopup())}
              >
                <RiAdminFill className="w-6 h-6" />
                <span>Thêm quản trị viên</span>
              </button>
            </>
          )}

          {isAuthenticated && user?.role === "User" && (
            <button
              className={navBtnClass}
              onClick={() => setSelectedComponent("My Borrowed Books")}
            >
              <img src={catalogIcon} alt="icon" />
              <span>Sách tôi đã mượn</span>
            </button>
          )}

          <button
            className={`md:hidden ${navBtnClass}`}
            onClick={() => dispatch(toggleSettingPopup())}
          >
            <img src={settingIcon} alt="icon" />
            <span>Cập nhật thông tin tài khoản</span>
          </button>
        </nav>

        <div className="px-6 py-4 border-t border-white/20">
          <button
            className="py-2 font-medium text-center bg-transparent rounded-md hover:cursor-pointer flex items-center justify-center space-x-3 mx-auto w-full hover:bg-white/10 transition"
            onClick={handleLogout}
          >
            <img src={logoutIcon} alt="icon" />
            <span>Đăng xuất</span>
          </button>
        </div>

        <img
          src={closeIcon}
          alt="icon"
          onClick={() => setIsSideBarOpen(!isSideBarOpen)}
          className="h-fit w-fit absolute top-0 right-4 mt-4 block md:hidden"
        />
      </aside>

      {addNewAdminPopup && <AddNewAdmin />}
      {settingPopup && <SettingPopup />}
    </>
  );
};

export default SideBar;
