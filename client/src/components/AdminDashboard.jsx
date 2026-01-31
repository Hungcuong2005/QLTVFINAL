import React, { useEffect, useState } from "react";
import adminIcon from "../assets/pointing.png";
import usersIcon from "../assets/people-black.png";
import bookIcon from "../assets/book-square.png";
import { Pie } from "react-chartjs-2";
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
import { useSelector } from "react-redux";
import Header from "../layout/Header";


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

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { users } = useSelector((state) => state.user);
  const { books, totalBooks: totalBooksFromStore } = useSelector((state) => state.book);
  const { allBorrowedBooks } = useSelector((state) => state.borrow);
  const { settingPopup } = useSelector((state) => state.popup);

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalAdmin, setTotalAdmin] = useState(0);
  const [totalBooks, setTotalBooks] = useState(
    totalBooksFromStore || (books && books.length) || 0
  );
  const [totalBorrowedBooks, setTotalBorrowedBooks] = useState(0);
  const [totalReturnedBooks, setTotalReturnedBooks] = useState(0);
  const [quote, setQuote] = useState("");

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

  useEffect(() => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => {
    let numberOfUsers = users.filter((user) => user.role === "User");
    let numberOfAdmins = users.filter((user) => user.role === "Admin");
    setTotalUsers(numberOfUsers.length);
    setTotalAdmin(numberOfAdmins.length);
    setTotalBooks(totalBooksFromStore || (books && books.length) || 0);

    let numberOfTotalBorrowedBooks = allBorrowedBooks.filter(
      (book) => book.returnDate === null
    );

    let numberOfTotalReturnedBooks = allBorrowedBooks.filter(
      (book) => book.returnDate !== null
    );

    setTotalBorrowedBooks(numberOfTotalBorrowedBooks.length);
    setTotalReturnedBooks(numberOfTotalReturnedBooks.length);
  }, [users, allBorrowedBooks, books, totalBooksFromStore]);

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
          {/* BÊN TRÁI: BIỂU ĐỒ & LOGO */}
          <div className="flex-[2] flex-col gap-7 lg:flex-row flex lg:items-center xl:flex-col justify-between xl:gap-20 py-5">
            <div className="xl:flex-[4] flex items-end w-full content-center">
              <Pie
                data={data}
                options={{ cutout: 0 }}
                className="mx-auto lg:mx-0 w-full h-auto"
              />
            </div>

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

          {/* BÊN PHẢI: THỐNG KÊ CHI TIẾT */}
          <div className="flex flex-[4] flex-col gap-7 lg:gap-16 lg:px-7 lg:py-5 justify-between xl:min-h-[85.5vh]">
            <div className="flex flex-col-reverse lg:flex-row gap-7 flex-[4]">
              <div className="flex flex-col gap-7 flex-1">

                {/* Thống kê Tổng người dùng */}
                <div className="flex items-center gap-3 bg-white p-5 max-h-[120px] overflow-y-hidden rounded-lg transition hover:shadow-inner duration-300 w-full lg:max-w-[360px] border-l-4 border-[#C41526]">
                  <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                    <img src={usersIcon} alt="users-icon" className="w-8 h-8" />
                  </span>

                  <span className="w-[2px] bg-[#C41526] h-20 lg:h-full"></span>

                  <div className="flex flex-col items-center gap-2">
                    <h4 className="font-black text-3xl text-[#C41526]">
                      {totalUsers}
                    </h4>
                    <p className="font-light text-gray-700 text-sm">
                      Tổng số người dùng
                    </p>
                  </div>
                </div>

                {/* Thống kê Tổng sách */}
                <div className="flex items-center gap-3 bg-white p-5 max-h-[120px] overflow-y-hidden rounded-lg transition hover:shadow-inner duration-300 w-full lg:max-w-[360px] border-l-4 border-[#C41526]">
                  <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                    <img src={bookIcon} alt="book-icon" className="w-8 h-8" />
                  </span>

                  <span className="w-[2px] bg-[#C41526] h-20 lg:h-full"></span>

                  <div className="flex flex-col items-center gap-2">
                    <h4 className="font-black text-3xl text-[#C41526]">
                      {totalBooks}
                    </h4>
                    <p className="font-light text-gray-700 text-sm">
                      Tổng số lượng sách
                    </p>
                  </div>
                </div>

                {/* Thống kê Tổng Admin */}
                <div className="flex items-center gap-3 bg-white p-5 max-h-[120px] overflow-y-hidden rounded-lg transition hover:shadow-inner duration-300 w-full lg:max-w-[360px] border-l-4 border-[#C41526]">
                  <span className="bg-[#FDE8EA] h-20 min-w-20 flex justify-center items-center rounded-lg">
                    <img src={adminIcon} alt="admin-icon" className="w-8 h-8" />
                  </span>

                  <span className="w-[2px] bg-[#C41526] h-20 lg:h-full"></span>

                  <div className="flex flex-col items-center gap-2">
                    <h4 className="font-black text-3xl text-[#C41526]">
                      {totalAdmin}
                    </h4>
                    <p className="font-light text-gray-700 text-sm">
                      Tổng số quản trị viên
                    </p>
                  </div>
                </div>
              </div>

              {/* Thông tin Admin đang đăng nhập */}
              <div className="flex flex-col lg:flex-row flex-1">
                <div className="flex flex-col lg:flex-row flex-1 items-center justify-center">
                  <div className="bg-white p-5 rounded-lg shadow-lg h-full flex flex-col justify-center items-center gap-4 border-t-4 border-[#C41526]">
                    <img
                      src={user && user.avatar?.url}
                      alt="avatar"
                      className="rounded-full w-32 h-32 object-cover ring-4 ring-[#FDE8EA]"
                    />

                    <h2 className="text-xl 2xl:text-2xl font-semibold text-center text-[#C41526]">
                      {user && user.name}
                    </h2>

                    <p className="text-gray-600 text-sm 2xl:text-base text-center">
                      Chào mừng bạn đến với trang quản trị. Tại đây bạn có thể quản lý
                      hệ thống và theo dõi các thống kê tổng quan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* QUOTE SECTION */}
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

export default AdminDashboard;