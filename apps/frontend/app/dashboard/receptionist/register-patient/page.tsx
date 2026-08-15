'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient, ApiError } from '@/lib/api-client';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPatientPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setSuccessName(null);
    try {
      await apiClient.post('/auth/register', values);
      setSuccessName(values.firstName);
      reset();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="max-w-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Register New Patient</h1>
      <p className="mt-1 text-sm text-zinc-500">Creates a new patient login and profile.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
        )}
        {successName && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {successName} was registered successfully.
          </p>
        )}

        <div className="space-y-1">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="lastName">Last Name (optional)</Label>
          <Input id="lastName" {...register('lastName')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="password">Temporary Password</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
          {errors.dateOfBirth && <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register Patient'}
        </Button>
      </form>
    </div>
  );
}