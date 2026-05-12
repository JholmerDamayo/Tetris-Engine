import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, Calendar, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    age: '',
    gender: '',
    rememberMe: false
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users: User[] = JSON.parse(localStorage.getItem('registered-users') || '[]');

    const emailNormalized = formData.email.trim().toLowerCase();

    if (isLogin) {
      if (!emailNormalized || !formData.password) {
        setError('Please fill in all fields');
        return;
      }
      const user = users.find(u => u.email.toLowerCase() === emailNormalized && u.password === formData.password);
      if (user) {
        onAuthSuccess(user);
        if (formData.rememberMe) {
          localStorage.setItem('logged-in-user', JSON.stringify(user));
        }
        onClose();
      } else {
        setError('Invalid email or password');
      }
    } else {
      // Validate
      if (!formData.fullname.trim() || !formData.age || !formData.gender || !emailNormalized || !formData.password) {
        setError('All fields are required');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailNormalized)) {
        setError('Please enter a valid email address');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setError('Please enter a valid age');
        return;
      }

      if (users.find(u => u.email.toLowerCase() === emailNormalized)) {
        setError('Identity with this email already exists');
        return;
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        fullname: formData.fullname.trim(),
        email: emailNormalized,
        password: formData.password,
        age: formData.age,
        gender: formData.gender,
        createdAt: Date.now()
      };

      users.push(newUser);
      localStorage.setItem('registered-users', JSON.stringify(users));
      onAuthSuccess(newUser);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* 3D-ish Header Decoration */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />
            
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">
                    {isLogin ? 'Authorization' : 'Create Identity'}
                  </h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-1">
                    {isLogin ? 'Access your tactical data' : 'Establish unique operator record'}
                  </p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="grid gap-4">
                  {!isLogin && (
                    <>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                        <input
                          required
                          name="fullname"
                          placeholder="FULL NAME"
                          value={formData.fullname}
                          onChange={handleInputChange}
                          className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500 shadow-inner group-hover:translate-z-2 translate-z-0"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                          <input
                            required
                            type="number"
                            name="age"
                            placeholder="AGE"
                            value={formData.age}
                            onChange={handleInputChange}
                            className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold uppercase tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500"
                          />
                        </div>
                        <div className="relative group">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                          <select
                            required
                            name="gender"
                            value={formData.gender}
                            onChange={handleInputChange}
                            className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold uppercase tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500 appearance-none"
                          >
                            <option value="" disabled className="bg-[#0a0a0a]">GENDER</option>
                            <option value="male" className="bg-[#0a0a0a]">MALE</option>
                            <option value="female" className="bg-[#0a0a0a]">FEMALE</option>
                            <option value="other" className="bg-[#0a0a0a]">OTHER</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="EMAIL ADDRESS"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500"
                    />
                  </div>

                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                    <input
                      required
                      type="password"
                      name="password"
                      placeholder="PASSWORD"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500"
                    />
                  </div>

                  {!isLogin && (
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-cyan-400 transition-colors" size={16} />
                      <input
                        required
                        type="password"
                        name="confirmPassword"
                        placeholder="CONFIRM PASSWORD"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="w-full bg-neutral-900/50 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono font-bold tracking-widest text-white outline-none transition-all hover:bg-neutral-900 border-b-2 hover:border-b-cyan-500/50 focus:border-b-cyan-500"
                      />
                    </div>
                  )}

                  {isLogin && (
                    <div className="flex items-center gap-3 py-1">
                      <input
                        type="checkbox"
                        id="rememberMe"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-white/10 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 appearance-none border checked:bg-cyan-500 transition-all cursor-pointer"
                      />
                      <label htmlFor="rememberMe" className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest cursor-pointer select-none">
                        Remember Identity
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <button
                    type="submit"
                    className="group relative w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_20px_rgba(255,255,255,0.05)] transition-all hover:translate-y-[-2px] active:translate-y-0 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isLogin ? 'Authenticate' : 'Register Operator'}
                      <ArrowRight size={14} />
                    </span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest hover:text-cyan-400 transition-colors text-center"
                  >
                    {isLogin ? "Don't have an Account yet? Create now!" : "Already have an Account? Login now"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
