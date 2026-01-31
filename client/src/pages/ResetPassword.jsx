import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import logo from "../assets/logo.png";
import logo_with_title from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { resetPassword, resetAuthSlice } from "../store/slices/authSlice";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { token } = useParams();
  const dispatch = useDispatch();

  const { loading, error, message, user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleResetPassword = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);

    dispatch(resetPassword(formData, token));
  };

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(resetAuthSlice());
    }

    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
  }, [dispatch, message, error]);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <div className="flex flex-col justify-center md:flex-row h-screen">
        {/* LEFT SECTION */}
        <div className="hidden w-full md:w-1/2 bg-[#C41526] text-white md:flex flex-col items-center justify-center p-8 rounded-tr-[80px] rounded-br-[80px]">
          <div className="text-center h-[450px]">
            <div className="flex justify-center mb-12">
              <img
                src={logo_with_title}
                alt="logo"
                className="mb-12 h-44 w-auto"
              />
            </div>

            <h3 className="text-gray-200 mb-12 max-w-[320px] mx-auto text-3xl font-medium leading-10">
              Thư viện số hiện đại
            </h3>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-white p-8 relative">
          <Link
            to="/password/forgot"
            className="border-2 border-[#C41526] text-[#C41526] rounded-3xl font-bold w-52 py-2 px-4 fixed top-10 -left-28 hover:bg-[#C41526] hover:text-white transition duration-300 text-end"
          >
            Quay lại
          </Link>

          <div className="w-full max-w-sm">
     

            <h1 className="text-3xl font-bold text-center mb-5 text-[#C41526] overflow-hidden">
              Đặt lại mật khẩu
            </h1>

            <p className="text-gray-700 text-center mb-12">
              Vui lòng nhập mật khẩu mới của bạn
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu mới"
                  className="w-full px-4 py-3 border border-[#C41526] rounded-md focus:outline-none"
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận mật khẩu"
                  className="w-full px-4 py-3 border border-[#C41526] rounded-md focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="border-2 mt-5 border-[#C41526] w-full font-semibold bg-[#C41526] text-white py-2 rounded-lg hover:bg-white hover:text-[#C41526] transition disabled:opacity-60"
              >
                ĐẶT LẠI MẬT KHẨU
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
