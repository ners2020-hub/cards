import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Construction } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MigrationPlaceholder({ title, notes = [] }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="bg-slate-900/70 border border-purple-600/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Construction className="w-5 h-5 text-amber-300" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <p>
              This page is still being migrated from Base44 to the new Supabase services.
            </p>
            {Array.isArray(notes) && notes.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-sm text-slate-400">
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
