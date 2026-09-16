import React from 'react';
import MigrationPlaceholder from '@/lib/MigrationPlaceholder';

export default function Tutorial() {
  return (
    <MigrationPlaceholder
      title="Initiation"
      notes={[
        'This page referenced base44.auth + base44.entities.TutorialProgress, causing runtime crashes.',
        'Next step: create tutorialProgressService (Supabase) or store progress in playerprogress, then port the UI logic.'
      ]}
    />
  );
}
