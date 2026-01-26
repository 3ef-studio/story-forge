'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { origins, type Origin } from '@/app/data/origins';
import { getPowerById, getStarterPowers, type Power } from '@/app/data/powers';
import { archetypes, type CharacterArchetype } from '@/app/data/archetypes';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

type Step = 'origin' | 'power' | 'archetype' | 'name';

export default function CharacterCreationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('origin');
  const [selectedOrigin, setSelectedOrigin] = useState<Origin | null>(null);
  const [selectedPower, setSelectedPower] = useState<Power | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<CharacterArchetype | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get available starter powers (excluding those already granted by origin)
  const availablePowers = getStarterPowers().filter(
    (power) => !selectedOrigin?.startingPowers.includes(power.id)
  );

  const handleOriginSelect = (origin: Origin) => {
    setSelectedOrigin(origin);
    // Reset power selection if origin changes
    if (selectedPower && origin.startingPowers.includes(selectedPower.id)) {
      setSelectedPower(null);
    }
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
    if (step === 'power') setStep('origin');
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

  const stepNumber = step === 'origin' ? 1 : step === 'power' ? 2 : step === 'archetype' ? 3 : 4;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {['Origin', 'Power', 'Archetype', 'Name'].map((label, index) => (
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
              {index < 3 && (
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

        {/* Step 2: Extra Power Selection */}
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Origin:</span>
                    <p className="font-medium">{selectedOrigin?.name}</p>
                  </div>
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
