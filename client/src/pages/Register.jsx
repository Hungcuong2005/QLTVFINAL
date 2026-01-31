import React, { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import logo_with_title from "../assets/logo.png";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { register, resetAuthSlice } from "../store/slices/authSlice";
import { toast } from "react-toastify";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigateTo = useNavigate();

  const { loading, error, message, user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const handleRegister = (e) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
    };

    dispatch(register(payload));
  };

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(resetAuthSlice());
      navigateTo(`/otp-verification/${email}`);
    }

    if (error) {
      toast.error(error);
      dispatch(resetAuthSlice());
    }
  }, [dispatch, error, message, email, navigateTo]);

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <>
      <div className="flex flex-col justify-center md:flex-row h-screen">
        {/* LEFT SIDE */}
        <div className="hidden w-full md:w-1/2 bg-[#C41526] text-white md:flex flex-col items-center justify-center p-8 rounded-tr-[80px] rounded-br-[80px] overflow-hidden">
          <div className="text-center w-full max-w-sm">
            <div className="flex justify-center mb-6">
              <img
                src={logo_with_title}
                alt="logo"
                className="mb-12 h-44 w-auto"
              />
            </div>

            <p className="text-white/90 mb-7 text-lg md:text-xl leading-relaxed">
              Đã có tài khoản?
              <br />
              <span className="font-bold text-2xl md:text-3xl text-white drop-shadow-sm">
                Đăng nhập ngay!
              </span>
            </p>


            <Link
              to="/login"
              className="inline-flex items-center justify-center border-2 border-white px-10 py-2 rounded-lg font-semibold hover:bg-white hover:text-[#C41526] transition"
            >
              ĐĂNG NHẬP
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-white relative p-8 overflow-hidden">
          <div className="w-full flex items-center justify-center">
            <div className="max-w-sm w-full">
              <h1 className="text-3xl md:text-3xl font-bold text-center mb-5 text-[#C41526]">
                Tạo tài khoản
              </h1>

              <p className="text-gray-700 text-center mb-8">
                Vui lòng nhập thông tin để đăng ký
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên"
                  className="w-full px-4 py-3 border border-[#C41526] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C41526]/30"
                />

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

                {/* Link chỉ hiện ở mobile giống bạn đang làm */}
                <div className="block md:hidden font-semibold pt-1">
                  <p>
                    Đã có tài khoản?{" "}
                    <Link
                      to="/login"
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Đăng nhập
                    </Link>
                  </p>
                </div>

                <button
                  type="submit"
                  className="border-2 border-[#C41526] w-full font-semibold bg-[#C41526] text-white py-3 rounded-lg hover:bg-white hover:text-[#C41526] transition"
                >
                  ĐĂNG KÝ
                </button>
              </form>
            </div>
          </div>
        </div>
      </div >
    </>
  );
};

export default Register;
