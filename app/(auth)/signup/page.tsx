'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    // Warn about trailing/leading whitespace in password (common mobile issue)
    if (password !== password.trim()) {
      const hasLeading = password.startsWith(' ') || password.startsWith('\t');
      const hasTrailing = password.endsWith(' ') || password.endsWith('\t');
      if (hasLeading || hasTrailing) {
        // Don't block, but warn - this might be accidental from autofill
        console.warn('[Signup] Password has edge whitespace - may be autofill issue');
      }
    }

    setIsLoading(true);

    try {
      // Create user
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail.toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setError('Too many attempts. Please wait a minute and try again.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Map server errors to user-friendly messages
        if (data.error?.includes('already exists')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (data.error?.includes('valid email')) {
          setError('Please enter a valid email address.');
        } else {
          setError(data.error || 'Couldn\'t create account. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Sign in after successful signup
      const result = await signIn('credentials', {
        email: trimmedEmail.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created! Please sign in to continue.');
        setIsLoading(false);
        return;
      }

      router.push('/character-creation');
      router.refresh();
    } catch (err) {
      // Network or unexpected error
      console.error('Signup error:', err);
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Your Account
          </CardTitle>
          <CardDescription className="text-center">
            Begin your journey as a powered individual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Create Account
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-500 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
