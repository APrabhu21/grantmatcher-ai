import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <span className="text-primary-foreground font-serif font-bold text-sm">G</span>
              </div>
              <span className="text-lg font-serif font-bold text-primary uppercase tracking-tight">GrantMatcher Archive</span>
            </div>
            <p className="text-secondary text-sm mb-6 leading-relaxed">
              A comprehensive digital resource for institutional funding research. Leveraging advanced indexing to connect missions with opportunities.
            </p>
            <div className="flex space-x-6 text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Archive Access</a>
            </div>
          </div>

          <div className="text-right md:self-end">
            <p className="text-slate-400 text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
              © 2026 Institutional Index. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}