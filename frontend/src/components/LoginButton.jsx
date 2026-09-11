import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthDataContext } from '../context/AuthDataContext.jsx';
import { LogOut, User } from 'lucide-react';

const LoginButton = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((state) => state.user.userData);
  const { serverUrl } = useContext(AuthDataContext);

  const handleLogout = async () => {
    try {
      await axios.post(`${serverUrl}/api/auth/logout`, {}, { withCredentials: true });
      dispatch(setUserData(null));
      navigate("/login");
    } catch (error) {
      console.error("Logout Failed", error);
    }
  }

  return (
    <div className="flex items-center">
      {userData ? (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-white text-xs font-bold uppercase tracking-widest">{userData.name || 'User'}</span>
            <span className="text-[#16A34A] text-[10px] items-center flex gap-1 font-bold"><div className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" /> Secure</span>
          </div>
          <button 
            onClick={handleLogout} 
            className="group flex items-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-bold px-5 py-2 rounded-xl transition-all shadow-lg hover:shadow-red-500/20"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      ) : (
        <button 
          onClick={() => navigate("/login")} 
          className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:scale-105 text-white text-sm font-bold px-7 py-2.5 rounded-xl transition-all shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)] active:scale-95"
        >
          Login / Signup
        </button>
      )}
    </div>
  )
}

export default LoginButton