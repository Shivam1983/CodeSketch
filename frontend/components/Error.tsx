"use client"
import React, { useEffect, useState } from 'react';
import { LockKeyhole, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ErrorPage() {
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(100);
  const router = useRouter()


  useEffect(() => {
    const timer = setInterval(() => {
        setCountdown((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                return 0;
            }
            return prev - 1;
        });

        setProgress((prev) => (prev > 0 ? prev - (100 / 5) : 0));
    }, 1000);

    return () => clearInterval(timer);
}, []);

useEffect(() => {
    if (countdown === 0) {
        router.push('/signin');
    }
}, [countdown, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-purple-500/10 animate-pulse" />
        
        <div className="relative">
          <div className="flex justify-center">
            <div className="bg-red-100 p-3 rounded-full">
              <LockKeyhole className="h-12 w-12 text-red-600 animate-bounce" />
            </div>
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Access Denied
          </h2>
          
          <div className="mt-4 text-center">
            <p className="text-gray-300">
              Please sign in to access this page
            </p>
          </div>

          <div className="mt-8">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div className="text-sm text-gray-300">
                  Redirecting in {countdown} seconds
                </div>
                <div className="text-sm text-gray-300 flex items-center">
                  to signin <ArrowRight className="ml-2 h-4 w-4 animate-pulse" />
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-700">
                <div
                  style={{ width: `${progress}%` }}
                  className="transition-all duration-1000 ease-linear shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-red-500 to-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button onClick={() => router.push('/signin')} className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300">
              Sign in now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}