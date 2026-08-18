'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { ROLE_DASHBOARD_ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';

const DEPARTMENTS = [
  { name: 'Cardiology', blurb: 'Heart & cardiovascular care' },
  { name: 'Neurology', blurb: 'Brain & nervous system care' },
  { name: 'Pediatrics', blurb: "Children's healthcare" },
  { name: 'Orthopedics', blurb: 'Bones & joints' },
  { name: 'Dermatology', blurb: 'Skin & hair care' },
  { name: 'General Medicine', blurb: 'Primary healthcare' },
];

const SERVICES = [
  { name: 'Emergency Care', blurb: '24/7 emergency assistance' },
  { name: 'OPD Consultation', blurb: 'Schedule doctor consultations' },
  { name: 'Laboratory', blurb: 'Medical tests and diagnostics' },
  { name: 'Pharmacy', blurb: 'Prescription and medicine services' },
  { name: 'Radiology', blurb: 'Imaging and diagnostic services' },
  { name: 'Health Checkups', blurb: 'Preventive healthcare packages' },
];

const STEPS = [
  { step: '01', title: 'Create Account', blurb: 'Register as a patient' },
  { step: '02', title: 'Find Doctor', blurb: 'Choose your department' },
  { step: '03', title: 'Book Appointment', blurb: 'Select date and time' },
  { step: '04', title: 'Visit', blurb: 'Meet your doctor and receive care' },
];

export default function LandingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Logged-in users skip the marketing page entirely and land on their dashboard.
  useEffect(() => {
    if (isHydrated && user) {
      router.replace(ROLE_DASHBOARD_ROUTES[user.role]);
    }
  }, [isHydrated, user, router]);

  if (!isHydrated || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold text-foreground">MedCore</span>
          <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#departments" className="hover:text-foreground">Departments</a>
            <a href="#services" className="hover:text-foreground">Services</a>
            <a href="#how-it-works" className="hover:text-foreground">How It Works</a>
            <a href="#contact" className="hover:text-foreground">Contact</a>
          </nav>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Book Appointment</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Quality Healthcare, Made Simple
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Modern healthcare management for patients, doctors, and hospitals.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Book an Appointment</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Find a Doctor</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500 align-middle" />
          Hospital Open &middot; 24/7 Emergency Care Available
        </p>
      </section>

      {/* Quick Actions */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Find a Doctor', blurb: 'Find specialists by department', cta: 'View Doctors', href: '/login' },
            { title: 'Book Appointment', blurb: 'Schedule a visit with a doctor', cta: 'Book Now', href: '/register' },
            { title: 'Departments', blurb: 'Explore medical departments', cta: 'Explore', href: '#departments' },
            { title: 'Patient Portal', blurb: 'Access your healthcare', cta: 'Login', href: '/login' },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
            >
              <div className="font-medium text-foreground">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.blurb}</p>
              <div className="mt-4 text-sm font-medium text-foreground">{item.cta} &rarr;</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-foreground">Our Departments</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.name} className="rounded-lg border border-border bg-card p-5">
              <div className="font-medium text-foreground">{dept.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{dept.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-foreground">Our Services</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((svc) => (
            <div key={svc.name} className="rounded-lg border border-border bg-card p-5">
              <div className="font-medium text-foreground">{svc.name}</div>
              <p className="mt-1 text-sm text-muted-foreground">{svc.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-foreground">How MedCore Works</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="text-sm font-semibold text-muted-foreground">{s.step}</div>
              <div className="mt-1 font-medium text-foreground">{s.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Patient Portal CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Your Healthcare, In One Place</h2>
        <p className="mt-2 text-muted-foreground">Manage your healthcare from your account.</p>
        <ul className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {['Appointments', 'Medical Records', 'Prescriptions', 'Bills', 'Lab Reports'].map((item) => (
            <li key={item}>&#10003; {item}</li>
          ))}
        </ul>
        <Button className="mt-6" size="lg" asChild>
          <Link href="/register">Go to Patient Portal</Link>
        </Button>
      </section>

      {/* Emergency CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-foreground">Need Emergency Care?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Emergency services available 24/7</p>
          <p className="mt-4 font-medium text-foreground">Emergency: XXXXX XXXXX</p>
          <Button className="mt-4" variant="destructive" asChild>
            <a href="tel:XXXXXXXXXX">Contact Emergency</a>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold text-foreground">Contact Us</h2>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-foreground">Address</div>
            <p className="mt-1 text-sm text-muted-foreground">MedCore Hospital<br />Jodhpur, Rajasthan</p>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Phone</div>
            <p className="mt-1 text-sm text-muted-foreground">+91 XXXXX XXXXX</p>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Email</div>
            <p className="mt-1 text-sm text-muted-foreground">support@medcore.com</p>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Working Hours</div>
            <p className="mt-1 text-sm text-muted-foreground">Mon - Sun<br />24/7 Emergency Services</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <div className="font-semibold text-foreground">MedCore</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Modern healthcare management for better patient care.
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Quick Links</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li><a href="#departments" className="hover:text-foreground">Departments</a></li>
                <li><a href="#services" className="hover:text-foreground">Services</a></li>
                <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Patient</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground">Book Appointment</Link></li>
                <li><Link href="/login" className="hover:text-foreground">Patient Portal</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Hospital</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li><a href="#contact" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">&copy; 2026 MedCore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}