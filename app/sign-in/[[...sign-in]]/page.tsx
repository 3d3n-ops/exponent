import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1633] via-[#10192b] to-black text-white font-sans relative overflow-hidden flex items-center justify-center">
      {/* Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-800 opacity-30 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500 opacity-20 rounded-full blur-2xl z-0" />

      {/* Logo */}
      <div className="absolute left-8 top-8 z-10 select-none flex items-center">
        <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-300 to-cyan-400 bg-clip-text text-transparent">
          exponent
        </span>
      </div>

      {/* Sign In Form */}
      <div className="z-10">
        <SignIn 
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: '#06b6d4',
              colorBackground: 'rgba(255, 255, 255, 0.05)',
              colorInputBackground: 'rgba(255, 255, 255, 0.1)',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: 'rgba(255, 255, 255, 0.7)',
              borderRadius: '0.75rem',
            },
            elements: {
              card: 'backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl',
              headerTitle: 'text-white',
              headerSubtitle: 'text-white/70',
              socialButtonsBlockButton: 'border border-white/10 bg-white/10 hover:bg-white/20 text-white',
              dividerLine: 'bg-white/20',
              dividerText: 'text-white/60',
              formButtonPrimary: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg',
              footerActionLink: 'text-cyan-400 hover:text-cyan-300',
            }
          }}
        />
      </div>
    </div>
  );
} 