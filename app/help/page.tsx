import Link from 'next/link';
import { ArrowLeft, Zap, Heart, Star, Users, Shield, Target, Clock } from 'lucide-react';

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

        {/* Core Gameplay */}
        <div className="panel-solid rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Core Gameplay
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Story Forge is a text-based RPG where you play as a powered individual
              in a city full of heroes, villains, and everyone in between. Your
              choices shape your story and determine what kind of person you become.
            </p>
            <ol className="space-y-2 text-white/70">
              <li>
                <strong className="text-white/90">1. Choose an Action:</strong> Select from available actions like
                patrolling, training, or engaging with factions.
              </li>
              <li>
                <strong className="text-white/90">2. Experience Encounters:</strong> Some actions trigger
                encounters - dramatic situations where you must make choices.
              </li>
              <li>
                <strong className="text-white/90">3. Make Choices:</strong> Each encounter presents multiple
                options. Some require specific powers or attributes.
              </li>
              <li>
                <strong className="text-white/90">4. See Results:</strong> Your choices lead to outcomes that
                affect your stats, reputation, and story.
              </li>
            </ol>
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

        {/* HP and Combat */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-400" />
              HP (Health Points)
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              HP represents your physical condition.
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
                <span>XP to level up = Current Level x 100</span>
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

        {/* Factions */}
        <div className="panel-glass rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Faction System
            </h3>
          </div>
          <div className="px-4 sm:px-6 pb-5 space-y-3">
            <p className="text-white/70">
              Your reputation with various factions affects encounters and opportunities.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-red-500/15 rounded-lg border border-red-500/20">
                <strong className="text-red-400">Hostile</strong>
                <p className="text-red-300/70 text-xs">-100 to -30</p>
              </div>
              <div className="p-2 bg-yellow-500/15 rounded-lg border border-yellow-500/20">
                <strong className="text-yellow-400">Suspicious</strong>
                <p className="text-yellow-300/70 text-xs">-30 to 0</p>
              </div>
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <strong className="text-white/70">Neutral</strong>
                <p className="text-white/50 text-xs">0 to 30</p>
              </div>
              <div className="p-2 bg-green-500/15 rounded-lg border border-green-500/20">
                <strong className="text-green-400">Friendly</strong>
                <p className="text-green-300/70 text-xs">30 to 60</p>
              </div>
              <div className="p-2 bg-blue-500/15 rounded-lg border border-blue-500/20 col-span-2">
                <strong className="text-blue-400">Allied</strong>
                <p className="text-blue-300/70 text-xs">60+</p>
              </div>
            </div>
            <p className="text-sm text-white/50">
              Actions that help one faction may hurt their rivals or enemies.
              Choose your allegiances carefully!
            </p>
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
                  <strong className="text-white/90">Start with training:</strong> Build up your attributes
                  and power levels before taking on dangerous encounters.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  2
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Watch your energy:</strong> Don&apos;t burn all your energy
                  at once. Keep some in reserve for opportunities.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  3
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Read encounter choices carefully:</strong> Some options
                  require specific powers or attributes to succeed.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  4
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Consider faction consequences:</strong> Helping one
                  group often hurts their rivals. Plan your allegiances.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                  5
                </span>
                <span className="text-white/70">
                  <strong className="text-white/90">Use Rest &amp; Recover:</strong> This action restores
                  energy, letting you take more actions per day.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
