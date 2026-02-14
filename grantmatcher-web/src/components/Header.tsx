'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-serif font-bold text-lg">G</span>
            </div>
            <div>
              <span className="text-xl font-serif font-bold text-primary block leading-none">GrantMatcher</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-secondary font-sans font-semibold">Digital Archive</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {status === 'authenticated' ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-secondary hover:text-primary font-sans text-sm font-semibold uppercase tracking-wider transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/grants"
                  className="text-secondary hover:text-primary font-sans text-sm font-semibold uppercase tracking-wider transition-colors"
                >
                  Catalog
                </Link>
                <Link
                  href="/applications"
                  className="text-secondary hover:text-primary font-sans text-sm font-semibold uppercase tracking-wider transition-colors"
                >
                  Applications
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-primary font-sans text-sm font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                  >
                    <span>{session.user?.name || session.user?.email}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Profile Settings
                      </Link>
                      <button
                        onClick={() => {
                          signOut({ callbackUrl: '/' });
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-6">
                <Link
                  href="/login"
                  className="text-secondary hover:text-primary font-sans text-sm font-semibold uppercase tracking-wider transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="bg-primary text-primary-foreground px-6 py-2.5 rounded-sm hover:opacity-90 transition-opacity font-sans text-sm font-bold uppercase tracking-widest"
                >
                  Access Archive
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {status === 'authenticated' ? (
              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/grants"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Browse Grants
                </Link>
                <Link
                  href="/applications"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Applications
                </Link>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {session.user?.name || session.user?.email}
                  </div>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="block px-3 py-2 bg-blue-600 text-white rounded-lg text-center font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}