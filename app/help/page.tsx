import Link from 'next/link';
import { ArrowLeft, Zap, Heart, Star, Users, Shield, Target, Clock, MapPin, Flame, TrendingUp, Swords, Flag, Skull, Trophy, AlertTriangle, ChevronRight } from 'lucide-react';

export default function HelpPage() {
  return (
    <div
      className="min-h-screen bg-gray-950 game-backdrop"
      style={{
        backgroundImage: `url('/images/downtown.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Header */}
      <header className="bg-gray-950/90 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Link href="/game" className="flex items-center gap-2 text-white/70 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back to Game
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">How to Play Story Forge</h1>

        <p className="text-white/60">
          Story Forge is a strategic text-based RPG where you fight for control of a city divided between powerful factions.
          Your choices shape the balance of power and determine the fate of every district.
        </p>

        {/* Table of Contents */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Quick Navigation</h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <a href="#core" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Core Gameplay
            </a>
            <a href="#districts" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Districts
            </a>
            <a href="#conflicts" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Conflict System
            </a>
            <a href="#leverage" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Leverage
            </a>
            <a href="#heat" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Heat
            </a>
            <a href="#goals" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Goals
            </a>
            <a href="#rivals" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Rivals
            </a>
            <a href="#followups" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Follow-Ups
            </a>
            <a href="#victory" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ChevronRight className="w-3 h-3" /> Victory
            </a>
          </div>
        </div>

        {/* Core Gameplay */}
        <div id="core" className="panel-solid rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Core Gameplay
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Play as a powered individual fighting to shape the city&apos;s future. Choose a faction,
              take actions, resolve encounters, and shift the balance of power across five districts.
            </p>
            <ol className="space-y-2 text-white/70">
              <li>
                <strong className="text-white/90">1. Choose Your District:</strong> Move between the 5 city
                districts. Each has different factions vying for control.
              </li>
              <li>
                <strong className="text-white/90">2. Select an Action:</strong> Pick from available actions
                like patrolling, training, or faction operations.
              </li>
              <li>
                <strong className="text-white/90">3. Resolve Encounters:</strong> Many actions trigger encounters
                with tactical conflict mini-games where you use leverage to gain advantages.
              </li>
              <li>
                <strong className="text-white/90">4. Choose Follow-Ups:</strong> After encounters, follow-up
                actions let you continue your momentum or change direction.
              </li>
              <li>
                <strong className="text-white/90">5. Shift District Control:</strong> Your actions affect which
                faction controls each district and the overall balance of power.
              </li>
            </ol>
          </div>
        </div>

        {/* Districts */}
        <div id="districts" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-400" />
              Districts &amp; Territory Control
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              The city is divided into 5 districts, each contested by competing factions.
            </p>
            <div className="grid gap-2 text-sm">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">Downtown</strong>
                <span className="text-white/50 ml-2">— The corporate heart of the city</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">Riverside</strong>
                <span className="text-white/50 ml-2">— Industrial docks and warehouses</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">The Narrows</strong>
                <span className="text-white/50 ml-2">— Dense residential neighborhoods</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">Northside</strong>
                <span className="text-white/50 ml-2">— Wealthy suburban enclave</span>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white">The Hollows</strong>
                <span className="text-white/50 ml-2">— Abandoned industrial zone</span>
              </div>
            </div>
            <p className="text-sm text-white/50">
              Each district shows faction control percentages. Your actions can shift these percentages,
              helping your faction gain or lose ground.
            </p>
          </div>
        </div>

        {/* Factions */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Factions
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Four major factions compete for control of the city. You can join one to shape its destiny.
            </p>
            <div className="grid gap-2 text-sm">
              <div className="p-3 bg-blue-500/15 rounded-lg border border-blue-500/20">
                <strong className="text-blue-400">The Guardians</strong>
                <p className="text-blue-200/70 text-xs mt-1">
                  Lawful heroes working within the system. Protect civilians and maintain order through justice.
                </p>
              </div>
              <div className="p-3 bg-purple-500/15 rounded-lg border border-purple-500/20">
                <strong className="text-purple-400">The Vigilantes</strong>
                <p className="text-purple-200/70 text-xs mt-1">
                  Street-level justice, by any means necessary. Work outside the law to protect the vulnerable.
                </p>
              </div>
              <div className="p-3 bg-red-500/15 rounded-lg border border-red-500/20">
                <strong className="text-red-400">The Syndicate</strong>
                <p className="text-red-200/70 text-xs mt-1">
                  Organized crime seeking power and profit. Control through fear, influence, and violence.
                </p>
              </div>
              <div className="p-3 bg-orange-500/15 rounded-lg border border-orange-500/20">
                <strong className="text-orange-400">The Nihilists</strong>
                <p className="text-orange-200/70 text-xs mt-1">
                  Anarchists who want to tear down the system. Embrace chaos to build something new.
                </p>
              </div>
            </div>
            <p className="text-sm text-white/50">
              Your actions affect your reputation with all factions. Helping one often hurts their rivals.
            </p>
          </div>
        </div>

        {/* Conflict System */}
        <div id="conflicts" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-amber-400" />
              Conflict System (Resource Fracture)
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              When encounters involve conflict, you enter a tactical mini-game called Resource Fracture.
              This system determines how well you succeed based on your approach.
            </p>
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-white/90">How It Works</h4>
              <ol className="space-y-1 text-sm text-white/70">
                <li><strong className="text-white/80">1.</strong> A resource pool appears (e.g., 12 points available)</li>
                <li><strong className="text-white/80">2.</strong> Choose your approach for the conflict</li>
                <li><strong className="text-white/80">3.</strong> Use leverage to boost your effectiveness</li>
                <li><strong className="text-white/80">4.</strong> See how much of the resource pool you capture</li>
              </ol>
            </div>
            <p className="text-sm text-white/50">
              Better approaches and more leverage mean capturing more of the resource pool, leading to
              better outcomes and rewards.
            </p>
          </div>
        </div>

        {/* Leverage System */}
        <div id="leverage" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Leverage System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Leverage represents advantages you can spend during conflicts to improve outcomes.
              There are three types:
            </p>
            <div className="grid gap-2 text-sm">
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <strong className="text-blue-400">Control</strong>
                    <p className="text-blue-200/70 text-xs">
                      Authority, resources, and institutional power. Good for direct confrontations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <strong className="text-green-400">Stability</strong>
                    <p className="text-green-200/70 text-xs">
                      Community trust and social connections. Good for de-escalation and diplomacy.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <strong className="text-purple-400">Position</strong>
                    <p className="text-purple-200/70 text-xs">
                      Information, secrets, and tactical advantage. Good for manipulation and strategy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-white/50">
              Leverage is gained through actions, encounters, and faction activities. Spend it wisely
              during conflicts to maximize your success.
            </p>
          </div>
        </div>

        {/* Heat System */}
        <div id="heat" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-400" />
              Heat System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Heat represents how much attention you&apos;ve attracted from authorities and rival factions.
              High heat makes the city more dangerous for you.
            </p>
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-red-500/10 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">0-3</div>
                <div className="text-xs text-white/50">Low</div>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full" />
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">8-10</div>
                <div className="text-xs text-white/50">Critical</div>
              </div>
            </div>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>High heat increases difficulty of actions and encounters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Criminal and violent actions generate more heat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Heat decays slowly over time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Lay low or do community actions to reduce heat faster</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Goals */}
        <div id="goals" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-yellow-400" />
              Goals System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Goals are objectives generated based on your character, faction, and current situation.
              Completing goals provides rewards and advances your story.
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Goals appear in your character panel and as action suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Some goals are time-sensitive or linked to current events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Completing goals can unlock new actions and story paths</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Faction goals help your team gain territory</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rivals */}
        <div id="rivals" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Skull className="h-5 w-5 text-rose-400" />
              Rival System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              As you make enemies, certain characters become your rivals—recurring nemeses who
              complicate your story and create personal stakes.
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Rivals appear in encounters with increased frequency</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>They remember your past interactions and adapt</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Defeating a rival provides major rewards</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 mt-1">•</span>
                <span>Some rivals can become allies if handled carefully</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Follow-Ups */}
        <div id="followups" className="panel-glass rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-400" />
              Follow-Up Actions
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              After resolving an encounter, you&apos;re offered follow-up actions based on what just happened.
              These let you continue your momentum or pivot to something new.
            </p>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Follow-ups cost less energy than starting fresh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>They&apos;re contextual—related to your recent encounter</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>Chaining follow-ups can create powerful story arcs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-1">•</span>
                <span>You can always choose a regular action instead</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Energy System */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Energy System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Energy is your primary resource for taking actions.
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Maximum energy is 100 points</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Each action costs energy (shown on action cards)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Energy fully restores once per day (24 hours since last reset)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>The &quot;Rest &amp; Recover&quot; action restores energy immediately</span>
              </li>
            </ul>
          </div>
        </div>

        {/* HP and Wounded State */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-400" />
              HP &amp; Wounded State
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              HP represents your physical condition. When it drops to zero, consequences follow.
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Starting HP is 100, increases by 10 each level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>Failed encounter outcomes can cause HP loss</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>HP regenerates slowly over time</span>
              </li>
            </ul>
            <div className="p-3 bg-red-500/15 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <strong className="text-red-300">Wounded State (0 HP)</strong>
              </div>
              <p className="text-sm text-red-200/70">
                When HP reaches 0, your character becomes wounded. You&apos;ll need time to recover
                before taking dangerous actions again. Severe consequences may include story setbacks
                or losing progress in your current arc.
              </p>
            </div>
          </div>
        </div>

        {/* XP and Leveling */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-green-400" />
              Experience &amp; Leveling
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Gain XP to level up and become more powerful.
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>XP is earned from actions and encounters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>XP to level up = Current Level × 100</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Leveling up increases max HP by 10</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>Higher levels unlock more powerful actions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Victory Conditions */}
        <div id="victory" className="panel-solid rounded-2xl overflow-hidden scroll-mt-20">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Victory Conditions
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              The game tracks which faction dominates the city. Victory is achieved when one
              faction gains overwhelming control.
            </p>
            <div className="p-3 bg-amber-500/15 rounded-lg border border-amber-500/30">
              <h4 className="font-semibold text-amber-300 mb-2">Victory Condition</h4>
              <p className="text-sm text-amber-200/70">
                A faction wins when they control <strong>all 5 districts</strong> with at least
                <strong> 70% share</strong> in each district for <strong>2 consecutive turns</strong>.
              </p>
            </div>
            <ul className="space-y-1 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>The escalation meter shows how close any faction is to winning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Your actions directly influence district control percentages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>After victory, you can continue playing in the new status quo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Types */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Action Types
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            <div className="grid gap-3">
              <div className="p-3 bg-blue-500/15 rounded-lg border border-blue-500/20">
                <h4 className="font-semibold text-blue-300">Heroic Actions</h4>
                <p className="text-sm text-blue-200/70">
                  Patrol streets, respond to emergencies, work with police.
                  Increases reputation with law-abiding factions.
                </p>
              </div>
              <div className="p-3 bg-red-500/15 rounded-lg border border-red-500/20">
                <h4 className="font-semibold text-red-300">Criminal Actions</h4>
                <p className="text-sm text-red-200/70">
                  Rob banks, extort businesses, work with the Syndicate.
                  Increases notoriety and criminal connections.
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <h4 className="font-semibold text-white/80">Neutral Actions</h4>
                <p className="text-sm text-white/60">
                  Investigate mysteries, explore, trade on black market.
                  Flexible options without strong moral alignment.
                </p>
              </div>
              <div className="p-3 bg-green-500/15 rounded-lg border border-green-500/20">
                <h4 className="font-semibold text-green-300">Training Actions</h4>
                <p className="text-sm text-green-200/70">
                  Train powers, physical training, study tactics, meditate.
                  Focus on improving your abilities.
                </p>
              </div>
              <div className="p-3 bg-purple-500/15 rounded-lg border border-purple-500/20">
                <h4 className="font-semibold text-purple-300">Social Actions</h4>
                <p className="text-sm text-purple-200/70">
                  Recruit allies, network with contacts.
                  Build relationships and gather information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cooldowns */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cooldowns
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Some powerful actions have cooldowns to prevent overuse.
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="text-white/50 mt-1">•</span>
                <span>Cooldowns are shown on action cards (e.g., &quot;6h&quot;)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/50 mt-1">•</span>
                <span>You cannot use an action while it&apos;s on cooldown</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/50 mt-1">•</span>
                <span>Cooldowns reset based on real time</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tips */}
        <div className="panel-solid rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">Tips for New Players</h3>
          </div>
          <div className="px-4 sm:px-6 pb-5">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  1
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Join a faction early:</strong> Faction membership
                  unlocks special actions and gives your story direction.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  2
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Build leverage:</strong> Accumulate Control, Stability,
                  and Position to use in conflicts for better outcomes.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  3
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Watch your heat:</strong> High heat makes everything
                  harder. Balance aggressive actions with laying low.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  4
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Use follow-ups:</strong> They&apos;re cheaper and
                  contextual—great for chaining powerful story moments.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  5
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Focus your district:</strong> Concentrate efforts in
                  one district to make a real impact on control percentages.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  6
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Read conflicts carefully:</strong> Different
                  approaches work better in different situations. Match your leverage to the conflict type.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
