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
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500" />
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
            Strategic Superhero RPG
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Fight for Control.
            <br />
            <span className="bg-linear-to-r from-sky-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Shape the City.
            </span>
          </h2>

          <p className="text-xl text-slate-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join a faction, battle for territory, and outmaneuver your rivals in this
            strategic text RPG. Every action shifts the balance of power in a city
            where{" "}
            <span className="text-slate-50 font-semibold">
              four factions fight for dominance
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
          <div className="mt-12 flex items-center justify-center gap-8 text-slate-300 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Free to Play
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-fuchsia-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              5 Districts to Control
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              4 Rival Factions
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-sky-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-sky-500/20 to-sky-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-sky-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">Territory Control</h3>
            <p className="text-slate-200 leading-relaxed">
              Fight for 5 unique districts. Your actions shift faction control,
              create ripple effects, and trigger counter-moves from rivals.
            </p>
          </div>

          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-emerald-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">Tactical Conflicts</h3>
            <p className="text-slate-200 leading-relaxed">
              Master the Resource Fracture mini-game. Manage Control, Stability, and
              Position to outmaneuver opponents in turn-based showdowns.
            </p>
          </div>

          <div className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-fuchsia-400/35 transition-all duration-300 hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1">
            <div className="w-14 h-14 bg-linear-to-br from-fuchsia-500/20 to-fuchsia-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-fuchsia-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-50">Rival Nemesis</h3>
            <p className="text-slate-200 leading-relaxed">
              Face a personal rival who counters your powers. They watch, send agents,
              and eventually confront you directly as intensity escalates.
            </p>
          </div>
        </div>

        {/* Faction Selection Preview */}
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-20">
          <h3 className="text-2xl font-bold mb-2 text-center text-slate-50">Choose Your Faction</h3>
          <p className="text-slate-200 text-center mb-8">Four factions battle for control of the city</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group text-center p-5 rounded-xl bg-blue-500/5 hover:bg-blue-500/15 transition-all duration-300 border border-blue-500/20 hover:border-blue-400/40">
              <div className="w-16 h-16 bg-linear-to-br from-blue-500/30 to-blue-600/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🛡️</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-300 mb-1">Guardians</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                Government heroes. Law and order through accountability.
              </p>
            </div>

            <div className="group text-center p-5 rounded-xl bg-purple-500/5 hover:bg-purple-500/15 transition-all duration-300 border border-purple-500/20 hover:border-purple-400/40">
              <div className="w-16 h-16 bg-linear-to-br from-purple-500/30 to-purple-600/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🦇</span>
              </div>
              <h4 className="text-lg font-semibold text-purple-300 mb-1">Vigilantes</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                Street heroes. Direct action outside the system.
              </p>
            </div>

            <div className="group text-center p-5 rounded-xl bg-red-500/5 hover:bg-red-500/15 transition-all duration-300 border border-red-500/20 hover:border-red-400/40">
              <div className="w-16 h-16 bg-linear-to-br from-red-500/30 to-red-600/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="text-3xl">🎭</span>
              </div>
              <h4 className="text-lg font-semibold text-red-300 mb-1">Syndicate</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                Organized crime. Power through fear and profit.
              </p>
            </div>

            <div className="group text-center p-5 rounded-xl bg-orange-500/5 hover:bg-orange-500/15 transition-all duration-300 border border-orange-500/20 hover:border-orange-400/40">
              <div className="w-16 h-16 bg-linear-to-br from-orange-500/30 to-orange-600/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <span className="text-3xl">💀</span>
              </div>
              <h4 className="text-lg font-semibold text-orange-300 mb-1">Nihilists</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                Agents of chaos. Burn it all down.
              </p>
            </div>
          </div>
        </div>

        {/* Strategic Systems */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold mb-8 text-center text-slate-50">Deep Strategic Systems</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-50">Leverage</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Build tactical currency through prep and focus. Spend it mid-conflict
                to boost resources, drain opponents, or bypass requirements.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-50">Heat</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Actions generate heat. High heat makes enemies stronger and
                encounters harder. Rest to cool down or face the consequences.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-50">Goals</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Personal objectives based on your origin. Complete goals to earn
                bonus XP and shape your character&apos;s journey.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-50">Follow-Ups</h4>
              </div>
              <p className="text-slate-300 text-sm">
                Dynamic actions unlock after encounters. Press advantages, recover
                from setbacks, or pursue emerging opportunities.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold mb-8 text-center text-slate-50">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Create Your Hero", desc: "Choose origin, powers, and join a faction" },
              { step: "2", title: "Take Actions", desc: "Patrol, train, scheme, or fight for territory" },
              { step: "3", title: "Face Conflicts", desc: "Outmaneuver opponents in tactical showdowns" },
              { step: "4", title: "Claim Victory", desc: "Lead your faction to control the city" },
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

        {/* Victory Condition */}
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/20 mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3h14l-2.5 9.5L19 16H5l2.5-3.5L5 3z" />
            </svg>
            <h3 className="text-2xl font-bold text-slate-50">Victory Awaits</h3>
          </div>
          <p className="text-slate-200 text-center max-w-2xl mx-auto">
            Lead your faction to control all 5 districts with over 70% share each.
            Maintain dominance for 2 turns and claim victory over the city.
            But beware&mdash;rival factions will fight back with counter-moves and escalating intensity.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center bg-linear-to-r from-sky-500/10 via-fuchsia-500/10 to-pink-500/10 rounded-2xl p-12 border border-white/10">
          <h3 className="text-3xl font-bold mb-4 text-slate-50">Ready to Take Control?</h3>
          <p className="text-slate-200 mb-8 max-w-xl mx-auto leading-relaxed">
            The city is divided. Factions clash for territory. Your rival is watching.
            Choose your side and fight for what you believe in.
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
              <span className="text-slate-300 text-sm">Strategic Superhero RPG</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-300">
              <Link href="/help" className="hover:text-white transition-colors">How to Play</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Get Started</Link>
            </div>
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">
            Fight for territory. Outmaneuver rivals. Claim the city.
          </p>
        </div>
      </footer>
    </div>
  );
}
