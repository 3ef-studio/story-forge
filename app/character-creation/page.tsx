'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { origins, type Origin } from '@/app/data/origins';
import { getPowerById } from '@/app/data/powers';

export default function CharacterCreationPage() {
  const router = useRouter();
  const [selectedOrigin, setSelectedOrigin] = useState<Origin | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOriginSelect = (origin: Origin) => {
    setSelectedOrigin(origin);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedOrigin) {
      setError('Please select an origin');
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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Origin
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Every powered individual has a story. What&apos;s yours? Select your origin to begin your journey.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Origin Grid */}
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
                <CardDescription className="text-sm">
                  {origin.description}
                </CardDescription>
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
                  <p className="text-xs text-gray-500">
                    {origin.uniqueTrait.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Origin Details */}
        {selectedOrigin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{selectedOrigin.name}</CardTitle>
              <CardDescription>Your Origin Story</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg text-gray-700 whitespace-pre-line">
                {selectedOrigin.backstory}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Starting Powers</h4>
                  <div className="space-y-2">
                    {selectedOrigin.startingPowers.map((powerId) => {
                      const power = getPowerById(powerId);
                      return (
                        <div key={powerId} className="flex items-start gap-2">
                          <Badge variant="default">{power?.name || powerId}</Badge>
                          <span className="text-sm text-gray-600">
                            {power?.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Attribute Bonuses</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedOrigin.startingAttributes).map(([attr, bonus]) => (
                      <div key={attr} className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600">{attr}</span>
                        <span className="font-medium text-green-600">+{bonus}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {selectedOrigin.uniqueTrait.name}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedOrigin.uniqueTrait.description}
                </p>
                <p className="text-xs text-gray-500 italic">
                  {selectedOrigin.uniqueTrait.mechanicalEffect}
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-1">Your Goal</h4>
                <p className="text-sm text-gray-700">{selectedOrigin.personalGoal}</p>
              </div>

              {/* Character Name Input */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="characterName" className="text-lg">
                    What is your name?
                  </Label>
                  <Input
                    id="characterName"
                    type="text"
                    placeholder="Enter your character's name"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="text-lg"
                    maxLength={30}
                    minLength={3}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    3-30 characters
                  </p>
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
        )}
      </div>
    </div>
  );
}
