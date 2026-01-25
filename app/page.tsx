import Link from "next/link";
import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/db";

export default async function Home() {
  const session = await auth();

  // If logged in, check for character and redirect
  if (session?.user?.id) {
    const character = await prisma.character.findUnique({
      where: { userId: session.user.id },
    });

    if (character) redirect("/game");
    redirect("/character-creation");
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      {/* Background elements (slightly toned down for clarity) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        {/* subtle vignette to improve legibility */}
        <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-transparent via-transparent to-black/40" />
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-white/10 backdrop-blur-sm bg-slate-950/70 top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-linear-to-r from-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
            Story Forge
          </h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-slate-200 hover:text-white transition-all duration-300 hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2 bg-linear-to-r from-sky-500 to-fuchsia-600 hover:from-sky-400 hover:to-fuchsia-500 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-sky-500/20 font-semibold text-white"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-400/25 rounded-full text-sky-200 text-sm mb-8">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            AI-Powered Dynamic Storytelling
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Your Powers. Your Choices.
            <br />
            <span className="bg-linear-to-r from-sky-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Your Story.
            </span>
          </h2>

          <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Become a powered individual in a world of heroes and villains. Every
            decision shapes your destiny in this AI-powered text RPG where{" "}
            <span className="text-slate-50 font-semibold">
              no two playthroughs are the same
            </span>
            .
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="group px-8 py-4 bg-linear-to-r from-sky-500 to-fuchsia-600 hover:from-sky-400 hover:to-fuchsia-500 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/20 flex items-center gap-2 text-white"
            >
              Start Your Story
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            <Link
              href="/login"
              className="px-8 py-4 border border-white/15 hover:border-white/25 rounded-xl text-lg font-medium transition-all duration-300 hover:bg-white/5 text-slate-100"
            >
              Continue Adventure
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-300 text-sm">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Free to Play
            </div>

            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-fuchsia-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              AI-Generated Encounters
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Play Anytime
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-sky-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-sky-500/20 to-sky-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">10 Unique Origins</h3>
            <p className="text-slate-200 leading-relaxed">
              Choose from genetic experiments, cosmic entities, tech geniuses, and more.
              Each origin unlocks unique powers and story paths.
            </p>
          </div>

          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">Meaningful Choices</h3>
            <p className="text-slate-200 leading-relaxed">
              Every action ripples through 12 factions. Build alliances, make enemies,
              and watch the city transform based on your decisions.
            </p>
          </div>

          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-fuchsia-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-fuchsia-500/20 to-fuchsia-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">AI-Powered Encounters</h3>
            <p className="text-slate-200 leading-relaxed">
              Face unique scenarios generated just for you. AI creates personalized
              encounters based on your powers, reputation, and history.
            </p>
          </div>
        </div>

        {/* Path Selection Preview */}
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-20">
          <h3 className="text-2xl font-bold mb-2 text-center text-slate-50">Choose Your Path</h3>
          <p className="text-slate-200 text-center mb-8">Your moral compass shapes your journey</p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="group text-center p-6 rounded-xl hover:bg-sky-500/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-sky-400/20">
              <div className="w-20 h-20 bg-linear-to-br from-sky-500/20 to-sky-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-sky-500/10">
                <span className="text-4xl">🦸</span>
              </div>
              <h4 className="text-xl font-semibold text-sky-300 mb-2">Hero</h4>
              <p className="text-slate-200 text-sm leading-relaxed">
                Protect the innocent, fight crime, and become a symbol of hope for the city.
              </p>
            </div>

            <div className="group text-center p-6 rounded-xl hover:bg-white/5 transition-all duration-300 cursor-pointer border border-transparent hover:border-white/10">
              <div className="w-20 h-20 bg-linear-to-br from-slate-500/20 to-slate-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-white/5">
                <span className="text-4xl">🕶️</span>
              </div>
              <h4 className="text-xl font-semibold text-slate-100 mb-2">Anti-Hero</h4>
              <p className="text-slate-200 text-sm leading-relaxed">
                Walk the line between light and dark. Sometimes the ends justify the means.
              </p>
            </div>

            <div className="group text-center p-6 rounded-xl hover:bg-rose-500/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-rose-400/20">
              <div className="w-20 h-20 bg-linear-to-br from-rose-500/20 to-rose-600/30 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-rose-500/10">
                <span className="text-4xl">🦹</span>
              </div>
              <h4 className="text-xl font-semibold text-rose-300 mb-2">Villain</h4>
              <p className="text-slate-200 text-sm leading-relaxed">
                Take what you want. Power belongs to those strong enough to claim it.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold mb-8 text-center text-slate-50">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Create Your Hero", desc: "Choose an origin and customize your character" },
              { step: "2", title: "Take Actions", desc: "Patrol, train, investigate, or cause chaos" },
              { step: "3", title: "Face Encounters", desc: "AI generates unique scenarios for you" },
              { step: "4", title: "Shape Your Story", desc: "Every choice builds your legend" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-linear-to-br from-sky-500 to-fuchsia-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white shadow-sm shadow-black/30">
                  {item.step}
                </div>
                <h4 className="font-semibold mb-2 text-slate-50">{item.title}</h4>
                <p className="text-sm text-slate-200 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-linear-to-r from-sky-500/10 via-fuchsia-500/10 to-pink-500/10 rounded-2xl p-12 border border-white/10">
          <h3 className="text-3xl font-bold mb-4 text-slate-50">Ready to Begin?</h3>
          <p className="text-slate-200 mb-8 max-w-xl mx-auto leading-relaxed">
            Your powers are awakening. The city awaits. What kind of legend will you become?
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-sky-500 to-fuchsia-600 hover:from-sky-400 hover:to-fuchsia-500 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-sky-500/20 text-white"
          >
            Create Your Character
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold bg-linear-to-r from-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
                Story Forge
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 text-sm">AI-Powered Text RPG</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-300">
              <Link href="/help" className="hover:text-white transition-colors">How to Play</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">
            Built with AI-powered storytelling. Every playthrough is unique.
          </p>
        </div>
      </footer>
    </div>
  );
}
