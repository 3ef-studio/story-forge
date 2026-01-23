import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ArrowLeft, Zap, Heart, Star, Users, Shield, Target, Clock } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Link href="/game" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            Back to Game
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">How to Play Story Forge</h1>

        {/* Core Gameplay */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Core Gameplay
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p>
              Story Forge is a text-based RPG where you play as a powered individual
              in a city full of heroes, villains, and everyone in between. Your
              choices shape your story and determine what kind of person you become.
            </p>
            <ol className="space-y-2">
              <li>
                <strong>Choose an Action:</strong> Select from available actions like
                patrolling, training, or engaging with factions.
              </li>
              <li>
                <strong>Experience Encounters:</strong> Some actions trigger
                encounters - dramatic situations where you must make choices.
              </li>
              <li>
                <strong>Make Choices:</strong> Each encounter presents multiple
                options. Some require specific powers or attributes.
              </li>
              <li>
                <strong>See Results:</strong> Your choices lead to outcomes that
                affect your stats, reputation, and story.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Energy System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Energy System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Energy is your primary resource for taking actions.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>Maximum energy is 100 points</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>Each action costs energy (shown on action cards)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>Energy fully restores once per day (24 hours since last reset)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                <span>The &quot;Rest &amp; Recover&quot; action restores energy immediately</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* HP and Combat */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              HP (Health Points)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              HP represents your physical condition.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Starting HP is 100, increases by 10 each level</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Failed encounter outcomes can cause HP loss</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>HP regenerates slowly over time</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* XP and Leveling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-green-500" />
              Experience &amp; Leveling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Gain XP to level up and become more powerful.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>XP is earned from actions and encounters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>XP to level up = Current Level × 100</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Leveling up increases max HP by 10</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span>Higher levels unlock more powerful actions</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Factions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Faction System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Your reputation with various factions affects encounters and opportunities.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <strong className="text-red-700">Hostile</strong>
                <p className="text-red-600 text-xs">-100 to -30</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                <strong className="text-yellow-700">Suspicious</strong>
                <p className="text-yellow-600 text-xs">-30 to 0</p>
              </div>
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                <strong className="text-gray-700">Neutral</strong>
                <p className="text-gray-600 text-xs">0 to 30</p>
              </div>
              <div className="p-2 bg-green-50 rounded border border-green-200">
                <strong className="text-green-700">Friendly</strong>
                <p className="text-green-600 text-xs">30 to 60</p>
              </div>
              <div className="p-2 bg-blue-50 rounded border border-blue-200 col-span-2">
                <strong className="text-blue-700">Allied</strong>
                <p className="text-blue-600 text-xs">60+</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Actions that help one faction may hurt their rivals or enemies.
              Choose your allegiances carefully!
            </p>
          </CardContent>
        </Card>

        {/* Action Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Action Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-700">Heroic Actions</h4>
                <p className="text-sm text-blue-600">
                  Patrol streets, respond to emergencies, work with police.
                  Increases reputation with law-abiding factions.
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-700">Criminal Actions</h4>
                <p className="text-sm text-red-600">
                  Rob banks, extort businesses, work with the Syndicate.
                  Increases notoriety and criminal connections.
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-700">Neutral Actions</h4>
                <p className="text-sm text-gray-600">
                  Investigate mysteries, explore, trade on black market.
                  Flexible options without strong moral alignment.
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-700">Training Actions</h4>
                <p className="text-sm text-green-600">
                  Train powers, physical training, study tactics, meditate.
                  Focus on improving your abilities.
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-700">Social Actions</h4>
                <p className="text-sm text-purple-600">
                  Recruit allies, network with contacts.
                  Build relationships and gather information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cooldowns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cooldowns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              Some powerful actions have cooldowns to prevent overuse.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Cooldowns are shown on action cards (e.g., &quot;6h&quot;)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>You cannot use an action while it&apos;s on cooldown</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-500 mt-1">•</span>
                <span>Cooldowns reset based on real time</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Tips for New Players</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  1
                </span>
                <span>
                  <strong>Start with training:</strong> Build up your attributes
                  and power levels before taking on dangerous encounters.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  2
                </span>
                <span>
                  <strong>Watch your energy:</strong> Don&apos;t burn all your energy
                  at once. Keep some in reserve for opportunities.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  3
                </span>
                <span>
                  <strong>Read encounter choices carefully:</strong> Some options
                  require specific powers or attributes to succeed.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  4
                </span>
                <span>
                  <strong>Consider faction consequences:</strong> Helping one
                  group often hurts their rivals. Plan your allegiances.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  5
                </span>
                <span>
                  <strong>Use Rest &amp; Recover:</strong> This action restores
                  energy, letting you take more actions per day.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
