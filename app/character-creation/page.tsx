'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { origins, deities, type Origin, type Deity, type DeityId } from '@/app/data/new-origins';
import { getPowerById, getStarterPowers, type Power } from '@/app/data/powers';
import { archetypes, type CharacterArchetype } from '@/app/data/archetypes';
import { ChevronLeft, ChevronRight, Check, Sun, Shield, Flame, Eye } from 'lucide-react';

type Step = 'origin' | 'deity' | 'power' | 'archetype' | 'name';

// Deity visual configurations
const DEITY_ICONS: Record<DeityId, typeof Sun> = {
  aurelion: Sun,
  thal_vara: Shield,
  typhos: Flame,
  nyx_mora: Eye,
};

const DEITY_COLORS: Record<DeityId, { ring: string; bg: string; text: string }> = {
  aurelion: { ring: 'ring-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600' },
  thal_vara: { ring: 'ring-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  typhos: { ring: 'ring-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  nyx_mora: { ring: 'ring-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
};

export default function CharacterCreationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('origin');
  const [selectedOrigin, setSelectedOrigin] = useState<Origin | null>(null);
  const [selectedDeity, setSelectedDeity] = useState<Deity | null>(null);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<CharacterArchetype | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if selected origin requires deity selection
  const requiresDeity = selectedOrigin?.requiresDeitySelection ?? false;
  const availableDeities = selectedOrigin?.deityOptions?.map(id => deities.find(d => d.id === id)).filter(Boolean) as Deity[] ?? [];

  // Get available starter powers (excluding those already granted by origin)
  const availablePowers = getStarterPowers().filter(
    (power) => !selectedOrigin?.startingPowers.includes(power.id)
  );

  const handleOriginSelect = (origin: Origin) => {
    setSelectedOrigin(origin);
    // Reset deity and power selection if origin changes
    setSelectedDeity(null);
    if (selectedPower && origin.startingPowers.includes(selectedPower.id)) {
      setSelectedPower(null);
    }
    setError('');
  };

  const handleDeitySelect = (deity: Deity) => {
    setSelectedDeity(deity);
    setError('');
  };

  const handlePowerSelect = (power: Power) => {
    setSelectedPower(power);
    setError('');
  };

  const handleArchetypeSelect = (archetype: CharacterArchetype) => {
    setSelectedArchetype(archetype);
    setError('');
  };

  const handleNext = () => {
    if (step === 'origin') {
      if (!selectedOrigin) {
        setError('Please select an origin');
        return;
      }
      // If origin requires deity selection, go to deity step
      if (selectedOrigin.requiresDeitySelection) {
        setStep('deity');
      } else {
        setStep('power');
      }
    } else if (step === 'deity') {
      if (!selectedDeity) {
        setError('Please select a patron deity');
        return;
      }
      setStep('power');
    } else if (step === 'power') {
      if (!selectedPower) {
        setError('Please select an extra power');
        return;
      }
      setStep('archetype');
    } else if (step === 'archetype') {
      if (!selectedArchetype) {
        setError('Please select a character archetype');
        return;
      }
      setStep('name');
    }
    setError('');
  };

  const handleBack = () => {
    if (step === 'deity') setStep('origin');
    else if (step === 'power') {
      // If origin requires deity, go back to deity, otherwise origin
      if (selectedOrigin?.requiresDeitySelection) {
        setStep('deity');
      } else {
        setStep('origin');
      }
    }
    else if (step === 'archetype') setStep('power');
    else if (step === 'name') setStep('archetype');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedOrigin || !selectedPower || !selectedArchetype) {
      setError('Please complete all selections');
      return;
    }

    // Validate deity if required
    if (selectedOrigin.requiresDeitySelection && !selectedDeity) {
      setError('Please select a patron deity');
      return;
    }

    if (!characterName || characterName.length < 3 || characterName.length > 30) {
      setError('Name must be between 3 and 30 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName,
          originId: selectedOrigin.id,
          extraPowerId: selectedPower.id,
          archetypeId: selectedArchetype.id,
          deityId: selectedDeity?.id ?? null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create character');
        setIsLoading(false);
        return;
      }

      router.push('/game');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Dynamic step labels based on whether deity is required
  const stepLabels = requiresDeity
    ? ['Origin', 'Patron', 'Power', 'Archetype', 'Name']
    : ['Origin', 'Power', 'Archetype', 'Name'];

  const stepNumber = requiresDeity
    ? (step === 'origin' ? 1 : step === 'deity' ? 2 : step === 'power' ? 3 : step === 'archetype' ? 4 : 5)
    : (step === 'origin' ? 1 : step === 'power' ? 2 : step === 'archetype' ? 3 : 4);

  const totalSteps = stepLabels.length;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {stepLabels.map((label, index) => (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 < stepNumber
                    ? 'bg-green-500 text-white'
                    : index + 1 === stepNumber
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1 < stepNumber ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${
                index + 1 === stepNumber ? 'font-medium text-gray-900' : 'text-gray-500'
              }`}>
                {label}
              </span>
              {index < totalSteps - 1 && (
                <div className={`w-8 sm:w-12 h-0.5 mx-2 ${
                  index + 1 < stepNumber ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Origin Selection */}
        {step === 'origin' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Origin</h1>
              <p className="text-gray-600">Every powered individual has a story. What&apos;s yours?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {origins.map((origin) => (
                <Card
                  key={origin.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedOrigin?.id === origin.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleOriginSelect(origin)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{origin.name}</CardTitle>
                    <CardDescription className="text-sm">{origin.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {origin.startingPowers.map((powerId) => {
                          const power = getPowerById(powerId);
                          return (
                            <Badge key={powerId} variant="default" className="text-xs">
                              {power?.name || powerId}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">{origin.uniqueTrait.name}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedOrigin && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>{selectedOrigin.name}</CardTitle>
                  <CardDescription>Your Origin Story</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 whitespace-pre-line">{selectedOrigin.backstory}</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">{selectedOrigin.uniqueTrait.name}</h4>
                    <p className="text-sm text-gray-600">{selectedOrigin.uniqueTrait.description}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 2: Deity Selection (conditional) */}
        {step === 'deity' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Patron</h1>
              <p className="text-gray-600">Your {selectedOrigin?.name} requires a divine covenant. Which power do you serve?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {availableDeities.map((deity) => {
                const Icon = DEITY_ICONS[deity.id];
                const colors = DEITY_COLORS[deity.id];
                return (
                  <Card
                    key={deity.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedDeity?.id === deity.id
                        ? `ring-2 ${colors.ring} ${colors.bg}`
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleDeitySelect(deity)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-6 w-6 ${colors.text}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{deity.name}</CardTitle>
                          <CardDescription className="text-sm italic">{deity.title}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">{deity.description}</p>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-green-700">Favors: </span>
                          <span className="text-xs text-gray-500">{deity.values.slice(0, 3).join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-red-700">Forbids: </span>
                          <span className="text-xs text-gray-500">{deity.forbiddenActions.slice(0, 3).join(', ')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedDeity && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = DEITY_ICONS[selectedDeity.id];
                      const colors = DEITY_COLORS[selectedDeity.id];
                      return <Icon className={`h-5 w-5 ${colors.text}`} />;
                    })()}
                    {selectedDeity.name} — {selectedDeity.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{selectedDeity.description}</p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">The Covenant</h4>
                    <p className="text-sm text-yellow-700">
                      Acting in accordance with {selectedDeity.name}&apos;s values will strengthen your connection,
                      granting power and favor. But betray their principles, and your abilities will falter.
                      At low alignment, advanced powers may fail entirely.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 3: Extra Power Selection */}
        {step === 'power' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose an Extra Power</h1>
              <p className="text-gray-600">Your origin grants you {selectedOrigin?.startingPowers.length} power(s). Select one more to start with.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {availablePowers.map((power) => (
                <Card
                  key={power.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedPower?.id === power.id
                      ? 'ring-2 ring-purple-500 bg-purple-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handlePowerSelect(power)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {power.name}
                      <Badge variant="outline" className="text-xs capitalize">
                        {power.category}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm">{power.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-gray-500">
                      <p className="font-medium text-gray-700 mb-1">Strengths:</p>
                      <p>{power.narrativeStrengths.slice(0, 3).join(', ')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedPower && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {selectedPower.name}
                    <Badge variant="default" className="capitalize">{selectedPower.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{selectedPower.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-green-700 mb-1">Strengths</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedPower.narrativeStrengths.map((s) => (
                          <li key={s}>+ {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-700 mb-1">Weaknesses</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedPower.narrativeWeaknesses.map((w) => (
                          <li key={w}>- {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 3: Archetype Selection */}
        {step === 'archetype' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Archetype</h1>
              <p className="text-gray-600">How do you approach challenges? Your archetype provides attribute bonuses.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {archetypes.map((archetype) => (
                <Card
                  key={archetype.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedArchetype?.id === archetype.id
                      ? 'ring-2 ring-amber-500 bg-amber-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleArchetypeSelect(archetype)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{archetype.name}</CardTitle>
                    <CardDescription className="text-sm">{archetype.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(archetype.attributeBonuses).map(([attr, bonus]) => (
                        <Badge key={attr} variant="success" className="capitalize">
                          {attr} +{bonus}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedArchetype && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>{selectedArchetype.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">{selectedArchetype.description}</p>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Attribute Bonuses</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedArchetype.attributeBonuses).map(([attr, bonus]) => (
                        <Badge key={attr} variant="success" className="capitalize text-sm">
                          {attr} +{bonus}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Step 4: Name Entry */}
        {step === 'name' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Name Your Hero</h1>
              <p className="text-gray-600">What will the world call you?</p>
            </div>

            <Card className="max-w-lg mx-auto mb-8">
              <CardHeader>
                <CardTitle>Character Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid gap-4 text-sm ${selectedDeity ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <span className="text-gray-500">Origin:</span>
                    <p className="font-medium">{selectedOrigin?.name}</p>
                  </div>
                  {selectedDeity && (
                    <div>
                      <span className="text-gray-500">Patron:</span>
                      <p className="font-medium flex items-center gap-1">
                        {(() => {
                          const Icon = DEITY_ICONS[selectedDeity.id];
                          const colors = DEITY_COLORS[selectedDeity.id];
                          return <Icon className={`h-4 w-4 ${colors.text}`} />;
                        })()}
                        {selectedDeity.name}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Archetype:</span>
                    <p className="font-medium">{selectedArchetype?.name}</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Powers:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedOrigin?.startingPowers.map((powerId) => {
                      const power = getPowerById(powerId);
                      return (
                        <Badge key={powerId} variant="default" className="text-xs">
                          {power?.name || powerId}
                        </Badge>
                      );
                    })}
                    {selectedPower && (
                      <Badge variant="secondary" className="text-xs">
                        + {selectedPower.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 text-sm">Attribute Bonuses:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedArchetype && Object.entries(selectedArchetype.attributeBonuses).map(([attr, bonus]) => (
                      <Badge key={attr} variant="success" className="text-xs capitalize">
                        {attr} +{bonus}
                      </Badge>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="characterName" className="text-lg">Character Name</Label>
                    <Input
                      id="characterName"
                      type="text"
                      placeholder="Enter your name"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      className="text-lg"
                      maxLength={30}
                      minLength={3}
                      required
                    />
                    <p className="text-xs text-gray-500">3-30 characters</p>
                  </div>

                  <Button
                    type="submit"
                    size="xl"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    Begin Your Journey
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* Navigation Buttons */}
        {step !== 'name' && (
          <div className="flex justify-between max-w-lg mx-auto">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'origin'}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleNext} className="gap-1">
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 'name' && (
          <div className="flex justify-start max-w-lg mx-auto">
            <Button variant="outline" onClick={handleBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
