import React from 'react';
import MigrationPlaceholder from '@/lib/MigrationPlaceholder';

export default function Leaderboard() {
  return (
    <MigrationPlaceholder
      title="Leaderboard"
      notes={[
        'This page referenced base44.entities.Leaderboard which no longer exists after migration.',
        'Next step: create a leaderboard table/view or materialized view in Supabase, then implement list/query with supabase.from().' 
      ]}
    />
  );
}
