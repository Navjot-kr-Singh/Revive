import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo */}
        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            REVIVE
          </h1>
          <p className="text-lg font-medium" style={{ color: 'var(--accent-green)' }}>
            Revenue Intelligence & Verification Engine
          </p>
        </div>

        {/* Tagline */}
        <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
          Recover revenue, not just payments.
        </p>

        {/* Description */}
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Autonomous revenue recovery control plane. Detects revenue at risk, 
          investigates with AI, simulates interventions, executes bounded recovery 
          through policy gates, and proves actual money recovered.
        </p>

        {/* CTA */}
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--accent-green)', color: 'var(--bg-primary)' }}
          >
            Enter Control Room →
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-3 rounded-lg font-semibold text-sm border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            Sign In
          </Link>
        </div>

        {/* Tech badges */}
        <div className="flex gap-3 justify-center flex-wrap pt-6">
          {['Next.js', 'PostgreSQL', 'Clerk', 'AI Agent', 'Policy Engine', 'Razorpay'].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
