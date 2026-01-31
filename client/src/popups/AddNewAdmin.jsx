import React, { useState } from "react";
import placeHolder from "../assets/placeholder.jpg";
import closeIcon from "../assets/close-square.png";
import keyIcon from "../assets/key.png";
import { useDispatch, useSelector } from "react-redux";
import { addNewAdmin } from "../store/slices/userSlice";
import { toggleAddNewAdminPopup } from "../store/slices/popUpSlice";

const AddNewAdmin = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
      setAvatar(file);
    }
  };

const handleAddNewAdmin = (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("avatar", avatar);

  // ✅ THÊM: Log để debug
  console.log("📤 Creating admin with avatar:", {
    name,
    email,
    avatarFile: avatar?.name,
    avatarType: avatar?.type,
    avatarSize: avatar?.size
  });

  dispatch(addNewAdmin(formData));
};

  return (
    <>
      <div className="fixed inset-0 bg-black/50 p-5 flex items-center justify-center z-50">
        <div className="w-full bg-white rounded-lg shadow-lg md:w-1/3 border-t-4 border-[#C41526]">
          <div className="p-6">
            <header className="flex justify-between items-center mb-7 pb-5 border-b border-[#FDE8EA]">
              <div className="flex items-center gap-3">
                <img
                  src={keyIcon}
                  alt="key-icon"
                  className="bg-[#FDE8EA] p-5 rounded-lg"
                />
                <h3 className="text-xl font-bold text-[#C41526]">
                  Thêm quản trị viên mới
                </h3>
              </div>

              <button
                type="button"
                onClick={() => dispatch(toggleAddNewAdminPopup())}
                className="p-1 rounded hover:bg-[#FDE8EA] transition"
                title="Đóng"
              >
                <img src={closeIcon} alt="close-icon" />
              </button>
            </header>

            <form onSubmit={handleAddNewAdmin}>
              {/* Chọn ảnh đại diện */}
              <div className="flex flex-col items-center mb-6">
                <label htmlFor="avatarInput" className="cursor-pointer">
                  <img
                    src={avatarPreview ? avatarPreview : placeHolder}
                    alt="avatar"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-[#FDE8EA]"
                  />

                  <input
                    type="file"
                    id="avatarInput"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="text-sm text-gray-600 mt-2">
                  Nhấn vào ảnh để chọn ảnh đại diện
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-medium">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên quản trị viên"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email quản trị viên"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 font-medium">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => dispatch(toggleAddNewAdminPopup())}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#C41526] text-white rounded-md hover:bg-[#A81220] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang thêm..." : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddNewAdmin;