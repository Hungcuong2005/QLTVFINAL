import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import UserDashboard from "../components/UserDashboard";
import AdminDashboard from "../components/AdminDashboard";
import BookManagement from "../components/BookManagement";
import Catalog from "../components/Catalog";
import MyBorrowedBooks from "../components/MyBorrowedBooks";
import Users from "../components/Users";
import SideBar from "../layout/SideBar";

const Home = () => {
  const [isSideBarOpen, setIsSideBarOpen] = useState(false);

  // ✅ cho phép lưu cả key + filter
  const [selectedComponent, setSelectedComponent] = useState({ key: "Dashboard" });

  const { user, isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // ✅ hỗ trợ cả trường hợp setSelectedComponent("Books") cũ
  const key = typeof selectedComponent === "string"
    ? selectedComponent
    : selectedComponent?.key;

  return (
    <>
      <div className="relative md:pl-64 flex min-h-screen bg-gray-100">
        <div className="md:hidden z-10 absolute right-6 top-4 sm:top-6 flex justify-center items-center bg-black rounded-md h-9 w-9 text-white">
          <GiHamburgerMenu
            className="text-2xl"
            onClick={() => setIsSideBarOpen(!isSideBarOpen)}
          />
        </div>

        <SideBar
          isSideBarOpen={isSideBarOpen}
          setIsSideBarOpen={setIsSideBarOpen}
          setSelectedComponent={setSelectedComponent}
        />

        {(() => {
          switch (key) {
            case "Dashboard":
              return user.role === "User" ? (
                <UserDashboard setSelectedComponent={setSelectedComponent} />
              ) : (
                <AdminDashboard />
              );

            case "Books":
              return <BookManagement />;

            case "Catalog":
              if (user.role === "Admin") return <Catalog />;
              return null;

            case "Users":
              if (user.role === "Admin") return <Users />;
              return null;

            case "My Borrowed Books":
              return (
                <MyBorrowedBooks
                  // ✅ filter mặc định khi bấm từ Dashboard
                  defaultFilter={
                    typeof selectedComponent === "object"
                      ? selectedComponent?.filter
                      : undefined
                  }
                />
              );

            default:
              return user?.role === "User" ? (
                <UserDashboard setSelectedComponent={setSelectedComponent} />
              ) : (
                <AdminDashboard />
              );
          }
        })()}
      </div>
    </>
  );
};

export default Home;
