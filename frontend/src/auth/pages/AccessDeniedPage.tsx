import { Link } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';

export function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-error-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="text-error-400" size={40} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-text-tertiary mb-8">
          You don't have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors font-medium"
          >
            <Home size={20} />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-base text-text-secondary rounded-lg hover:bg-surface-elevated transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
