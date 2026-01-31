import React, { useEffect, useState } from "react";
import logo_with_title from "../assets/logo-with-title-black.png";
import returnIcon from "../assets/redo.png";
import browseIcon from "../assets/pointing.png";
import bookIcon from "../assets/book-square.png";
import { Pie } from "react-chartjs-2";
import { useSelector } from "react-redux";
import Header from "../layout/Header";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from "chart.js";
import logo from "../assets/logo2.png";

// Đăng ký các thành phần cho ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
);

/**
 * Component UserDashboard (Trang chủ người dùng)
 * - Hiển thị biểu đồ thống kê sách đang mượn/đã trả.
 * - Các nút chức năng nhanh (Danh sách mượn, trả, khám phá).
 * - Hiển thị câu quote ngẫu nhiên.
 */
const UserDashboard = ({ setSelectedComponent }) => {
  // Lấy dữ liệu mượn sách từ Redux store
  const { userBorrowedBooks } = useSelector((state) => state.borrow);

  const [totalBorrowedBooks, setTotalBorrowedBooks] = useState(0);
  const [totalReturnedBooks, setTotalReturnedBooks] = useState(0);

  // Effect: Tính toán số lượng sách đang mượn và đã trả
  useEffect(() => {
    const borrowing = userBorrowedBooks.filter((b) => b.returned === false);
    const returned = userBorrowedBooks.filter((b) => b.returned === true);

    setTotalBorrowedBooks(borrowing.length);
    setTotalReturnedBooks(returned.length);
  }, [userBorrowedBooks]);

  const [quote, setQuote] = useState("");

  // Danh sách các câu trích dẫn hay (Random Quote)
  const QUOTES = [
    "Sách là ngọn đèn sáng bất diệt của trí tuệ con người.",
    "Đọc sách không những để mở mang trí tuệ mà còn để nuôi dưỡng tâm hồn.",
    "Một cuốn sách hay là một người bạn tốt.",
    "Thư viện là kho tàng chứa tất cả của cải tinh thần của loài người.",
    "Sách mở ra trước mắt tôi những chân trời mới.",
    "Không có người bạn nào trung thành như một cuốn sách.",
    "Để cho con một hòm vàng không bằng dạy cho con một quyển sách hay.",
    "Sách hay, cũng như bạn tốt, ít và được lựa chọn.",
    "Đọc muôn quyển sách, đi muôn dặm đường.",
    "Hành trình đọc sách nuôi dưỡng sự trưởng thành, mở ra con đường hướng tới sự xuất sắc và hoàn thiện bản thân.",
  ];

  // Chọn ngẫu nhiên 1 câu quote khi component mount
  useEffect(() => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  // Cấu hình dữ liệu cho biểu đồ tròn (Pie Chart)
  // Màu chủ đạo: #C41526 (đỏ) vs #7A0E18 (đỏ đậm)
  const data = {
    labels: ["Sách đang mượn", "Sách đã trả"],
    datasets: [
      {
        data: [totalBorrowedBooks, totalReturnedBooks],
        backgroundColor: ["#C41526", "#7A0E18"],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <>
      <main className="relative flex-1 p-6 pt-28">
        <Header />

        <div className="flex flex-col-reverse xl:flex-row">
          {/* BÊN TRÁI: BIỂU ĐỒ (Giống AdminDashboard) */}
          <div className="flex-[2] flex-col gap-7 lg:flex-row flex lg:items-center xl:flex-col justify-between xl:gap-20 py-5">
            <div className="xl:flex-[4] flex items-end w-full content-center">
              <Pie
                data={data}
                options={{ cutout: 0 }}
                className="mx-auto lg:mx-0 w-full h-auto"
              />
            </div>

            {/* CHÚ THÍCH (LEGEND) & LOGO */}
            <div className="flex items-center p-8 w-full sm:w-[400px] xl:w-fit mr-5 xl:p-3 2xl:p-6 gap-5 h-fit xl:min-h-[150px] bg-white xl:flex-1 rounded-lg border-l-4 border-[#C41526]">
              <img
                src={logo}
                alt="logo"
                className="w-auto xl:flex-1 rounded-lg"
              />

              <span className="w-[2px] bg-[#C41526] h-full"></span>

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-3">
                  <p className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#C41526]"></span>
                    <span>Sách đang mượn</span>
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#7A0E18]"></span>
                    <span>Sách đã trả</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BÊN PHẢI: CÁC NÚT CHỨC NĂNG & QUOTE */}
          <div className="flex flex-[4] flex-col gap-7 lg:gap-16 lg:px-7 lg:py-5 justify-between xl:min-h-[85.5vh]">
            <div className="flex flex-col-reverse lg:flex-row gap-7 flex-[4]">
              <div className="flex flex-col gap-7 flex-1">

                {/* GRID 2 CỘT CHO CÁC CARD */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

                  {/* Nút: Sách đang mượn */}
                  <button
                    type="button"
                    onClick={() => setSelectedComponent({ key: "My Borrowed Books", filter: "nonReturned" })}
                    className="h-[120px] w-full flex items-center gap-3 bg-white p-5 rounded-lg transition hover:shadow-inner duration-300 border-l-4 border-[#C41526] text-left"
                  >
                    <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                      <img src={bookIcon} alt="book-icon" className="w-8 h-8" />
                    </span>
                    <span className="w-[2px] bg-[#C41526] h-20"></span>
                    <p className="text-lg xl:text-xl font-semibold text-[#C41526]">
                      Danh sách sách đang mượn
                    </p>
                  </button>

                  {/* Nút: Sách đã trả */}
                  <button
                    type="button"
                    onClick={() => setSelectedComponent({ key: "My Borrowed Books", filter: "returned" })}
                    className="h-[120px] w-full flex items-center gap-3 bg-white p-5 rounded-lg transition hover:shadow-inner duration-300 border-l-4 border-[#C41526] text-left"
                  >
                    <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                      <img src={returnIcon} alt="return-icon" className="w-8 h-8" />
                    </span>
                    <span className="w-[2px] bg-[#C41526] h-20"></span>
                    <p className="text-lg xl:text-xl font-semibold text-[#C41526]">
                      Danh sách sách đã trả
                    </p>
                  </button>

                  {/* Nút: Khám phá kho sách */}
                  <button
                    type="button"
                    onClick={() => setSelectedComponent("Books")}
                    className="h-[120px] w-full flex items-center gap-3 bg-white p-5 rounded-lg transition hover:shadow-inner duration-300 border-l-4 border-[#C41526] text-left"
                  >
                    <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                      <img src={browseIcon} alt="browse-icon" className="w-8 h-8" />
                    </span>
                    <span className="w-[2px] bg-[#C41526] h-20"></span>
                    <p className="text-lg xl:text-xl font-semibold text-[#C41526]">
                      Khám phá kho sách thư viện
                    </p>
                  </button>

                  {/* Div ẩn để căn bố cục Grid */}
                  <div className="hidden lg:block" />
                </div>
              </div>
            </div>

            {/* PHẦN HIỂN THỊ QUOTE */}
            <div className="hidden xl:flex bg-white p-7 text-lg sm:text-xl xl:text-3xl 2xl:text-4xl min-h-52 font-semibold relative flex-[3] justify-center items-center rounded-2xl border border-[#FDE8EA] text-center">
              <h4 className="overflow-y-hidden text-[#C41526] italic px-4">
                "{quote}"
              </h4>
              <p className="text-gray-700 text-sm sm:text-lg absolute right-[35px] sm:right-[78px] bottom-[10px]">
                PHC - 20235286
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default UserDashboard;