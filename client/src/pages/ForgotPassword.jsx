import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import logo_with_title from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { forgotPassword, resetAuthSlice } from "../store/slices/authSlice";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");

  const dispatch = useDispatch();

  const { loading, error, message, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleForgotPassword = (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
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
            to="/login"
            className="border-2 border-[#C41526] text-[#C41526] rounded-3xl font-bold w-52 py-2 px-4 fixed top-10 -left-28 hover:bg-[#C41526] hover:text-white transition duration-300 text-end"
          >
            Quay lại
          </Link>

          <div className="w-full max-w-sm">
           

            <h1 className="text-3xl font-bold text-center mb-5 text-[#C41526] overflow-hidden">
              Quên mật khẩu
            </h1>

            <p className="text-gray-700 text-center mb-12">
              Vui lòng nhập email để đặt lại mật khẩu
            </p>

            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
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

export default ForgotPassword;
