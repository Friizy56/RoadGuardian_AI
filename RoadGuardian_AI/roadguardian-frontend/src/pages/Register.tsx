import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(['citizen', 'authority']),
});

export const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'citizen',
    }
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setAuth(
        { id: '2', fullName: data.fullName, email: data.email, role: data.role as any, points: 0, badges: [] },
        'mock-jwt-token'
      );
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <p className="text-sm text-muted-foreground">Join RoadGuardian AI to make roads safer</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="john@example.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Type</label>
              <select 
                {...register('role')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="citizen">Citizen Reporter</option>
                <option value="authority">Authority / Admin</option>
              </select>
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
