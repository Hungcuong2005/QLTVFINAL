import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import logo_with_title from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { login, resetAuthSlice } from "../store/slices/authSlice";
import { toast } from "react-toastify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();

  const { loading, error, message, user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleLogin = (e) => {
    e.preventDefault();

    

    const data = {
      email: email,
      password: password
    };

    dispatch(login(data));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
  }, [dispatch, isAuthenticated, error, loading]);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <div className="flex flex-col justify-center md:flex-row h-screen overflow-hidden">
        {/* LEFT SIDE */}
        <div className="w-full md:w-1/2 bg-white relative flex items-center justify-center p-8 overflow-hidden">
          <div className="w-full flex items-center justify-center">
            <div className="max-w-sm w-full">
              <h1 className="text-3xl md:text-3xl font-bold text-center mb-5 text-[#C41526]">
                Chào mừng quay trở lại!
              </h1>

              <p className="text-gray-700 text-center mb-8">
                Vui lòng nhập thông tin để đăng nhập
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-4 py-3 border border-[#C41526] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526]/30"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full px-4 py-3 border border-[#C41526] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526]/30"
                />

                <div className="flex items-center justify-between">
                  <Link
                    to="/password/forgot"
                    className="font-semibold text-[#C41526] hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>

                  <div className="block md:hidden font-semibold">
                    <span>Chưa có tài khoản? </span>
                    <Link to="/register" className="text-[#C41526] hover:underline">
                      Đăng ký
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  className="border-2 border-[#C41526] w-full font-semibold bg-[#C41526] text-white py-3 rounded-lg hover:bg-white hover:text-[#C41526] transition"
                >
                  ĐĂNG NHẬP
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden w-full md:w-1/2 bg-[#C41526] text-white md:flex flex-col items-center justify-center p-8 rounded-tl-[80px] rounded-bl-[80px] overflow-hidden">
          <div className="text-center">
            <div className="flex justify-center mb-12">
              <img src={logo_with_title} alt="logo" className="h-44 w-auto" />
            </div>

            <p className="text-white/90 mb-7 text-lg md:text-xl leading-relaxed">
              Bạn chưa có tài khoản?
              <br />
              <span className="font-bold text-2xl md:text-3xl text-white drop-shadow-sm">
                Đăng ký ngay để bắt đầu!
              </span>
            </p>

            <Link
              to="/register"
              className="border-2 border-white px-8 font-semibold bg-[#C41526] text-white py-2 rounded-lg hover:bg-white hover:text-[#C41526] transition inline-flex items-center justify-center"
            >
              ĐĂNG KÝ
            </Link>
          </div>
        </div>
      </div>
    </>
  );

};

export default Login;
