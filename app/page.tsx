import Link from 'next/link';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/db';

export default async function Home() {
  const session = await auth();

  // If logged in, check for character and redirect
  if (session?.user?.id) {
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (character) {
      redirect('/game');
    } else {
      redirect('/character-creation');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50 top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Story Forge
          </h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-300 hover:text-white transition-all duration-300 hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            AI-Powered Dynamic Storytelling
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Your Powers. Your Choices.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your Story.
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Become a powered individual in a world of heroes and villains.
            Every decision shapes your destiny in this AI-powered text RPG where
            <span className="text-white font-medium"> no two playthroughs are the same</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="group px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 flex items-center gap-2"
            >
              Start Your Story
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border border-gray-600 hover:border-gray-500 rounded-xl text-lg font-medium transition-all duration-300 hover:bg-gray-800/50"
            >
              Continue Adventure
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Free to Play
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI-Generated Encounters
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Play Anytime
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">10 Unique Origins</h3>
            <p className="text-gray-400 leading-relaxed">
              Choose from genetic experiments, cosmic entities, tech geniuses, and more.
              Each origin unlocks unique powers and story paths.
            </p>
          </div>

          <div className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Meaningful Choices</h3>
            <p className="text-gray-400 leading-relaxed">
              Every action ripples through 12 factions. Build alliances, make enemies,
              and watch the city transform based on your decisions.
            </p>
          </div>

          <div className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered Encounters</h3>
            <p className="text-gray-400 leading-relaxed">
              Face unique scenarios generated just for you. AI creates personalized
              encounters based on your powers, reputation, and history.
            </p>
          </div>
        </div>

        {/* Path Selection Preview */}
        <div className="bg-linear-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 mb-20">
          <h3 className="text-2xl font-bold mb-2 text-center">Choose Your Path</h3>
          <p className="text-gray-400 text-center mb-8">Your moral compass shapes your journey</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="group text-center p-6 rounded-xl hover:bg-blue-500/10 transition-all duration-300 cursor-pointer">
              <div className="w-20 h-20 bg-linear-to-br from-blue-500/20 to-blue-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
                <span className="text-4xl">🦸</span>
              </div>
              <h4 className="text-xl font-semibold text-blue-400 mb-2">Hero</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Protect the innocent, fight crime, and become a symbol of hope for the city.
              </p>
            </div>
            <div className="group text-center p-6 rounded-xl hover:bg-gray-500/10 transition-all duration-300 cursor-pointer">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-500/20 to-gray-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-gray-500/10">
                <span className="text-4xl">🕶️</span>
              </div>
              <h4 className="text-xl font-semibold text-gray-300 mb-2">Anti-Hero</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Walk the line between light and dark. Sometimes the ends justify the means.
              </p>
            </div>
            <div className="group text-center p-6 rounded-xl hover:bg-red-500/10 transition-all duration-300 cursor-pointer">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/10">
                <span className="text-4xl">🦹</span>
              </div>
              <h4 className="text-xl font-semibold text-red-400 mb-2">Villain</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Take what you want. Power belongs to those strong enough to claim it.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold mb-8 text-center">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create Your Hero', desc: 'Choose an origin and customize your character' },
              { step: '2', title: 'Take Actions', desc: 'Patrol, train, investigate, or cause chaos' },
              { step: '3', title: 'Face Encounters', desc: 'AI generates unique scenarios for you' },
              { step: '4', title: 'Shape Your Story', desc: 'Every choice builds your legend' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-12 border border-gray-700/50">
          <h3 className="text-3xl font-bold mb-4">Ready to Begin?</h3>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Your powers are awakening. The city awaits. What kind of legend will you become?
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
          >
            Create Your Character
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-gray-700/50 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Story Forge
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 text-sm">AI-Powered Text RPG</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/help" className="hover:text-white transition-colors">How to Play</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm mt-8">
            Built with AI-powered storytelling. Every playthrough is unique.
          </p>
        </div>
      </footer>
    </div>
  );
}
