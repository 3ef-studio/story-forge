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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Story Forge</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Your Powers. Your Choices.
            <br />
            <span className="text-blue-400">Your Story.</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Become a powered individual in a world of heroes and villains.
            Every decision shapes your destiny in this AI-powered text RPG.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-blue-500 hover:bg-blue-600 rounded-lg text-lg font-semibold transition-colors"
          >
            Start Your Story
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-400"
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
            <h3 className="text-xl font-semibold mb-2">Unique Origins</h3>
            <p className="text-gray-400">
              Choose from 10 distinct origins, each with unique powers,
              backstories, and paths to power.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-400"
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
            <h3 className="text-xl font-semibold mb-2">Meaningful Choices</h3>
            <p className="text-gray-400">
              Every action has consequences. Build alliances, make enemies,
              and shape the city&apos;s future.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-400"
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
            <h3 className="text-xl font-semibold mb-2">Dynamic Encounters</h3>
            <p className="text-gray-400">
              Face unique scenarios generated based on your powers, reputation,
              and past decisions.
            </p>
          </div>
        </div>

        {/* Path Selection Preview */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h3 className="text-2xl font-bold mb-6 text-center">Choose Your Path</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🦸</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-400 mb-2">Hero</h4>
              <p className="text-gray-400 text-sm">
                Protect the innocent, fight crime, and become a symbol of hope.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🕶️</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-400 mb-2">Anti-Hero</h4>
              <p className="text-gray-400 text-sm">
                Walk the line between light and dark. The ends justify the means.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🦹</span>
              </div>
              <h4 className="text-lg font-semibold text-red-400 mb-2">Villain</h4>
              <p className="text-gray-400 text-sm">
                Take what you want. Power belongs to those strong enough to claim it.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400">
          <p>Story Forge - A text-based RPG experience</p>
        </div>
      </footer>
    </div>
  );
}
