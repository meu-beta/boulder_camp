import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { computeRanking } from './ranking';

// Central real-time data hook: loads athletes, boulders, scores and
// the queue for a given category, keeps them fresh via Supabase
// Realtime, and exposes the computed ranking.
export function useLiveEvent(categoryName = 'Boulder') {
  const [category, setCategory] = useState(null);
  const [boulders, setBoulders] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [scores, setScores] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadAll = useCallback(async (categoryId) => {
    const [{ data: b }, { data: a }, { data: s }, { data: q }] = await Promise.all([
      supabase.from('boulders').select('*').eq('category_id', categoryId).order('number'),
      supabase.from('athletes').select('*').eq('category_id', categoryId).order('bib_number'),
      supabase
        .from('scores')
        .select('*, boulder:boulders!inner(category_id)')
        .eq('boulder.category_id', categoryId),
      supabase
        .from('queue_entries')
        .select('*, athlete:athletes(*)')
        .eq('category_id', categoryId)
        .order('position'),
    ]);
    setBoulders(b ?? []);
    setAthletes(a ?? []);
    setScores(s ?? []);
    setQueue(q ?? []);
  }, []);

  useEffect(() => {
    let channel;
    (async () => {
      const { data: cat } = await supabase
        .from('categories')
        .select('*')
        .eq('name', categoryName)
        .single();
      if (!cat) {
        setLoading(false);
        return;
      }
      setCategory(cat);
      await reloadAll(cat.id);
      setLoading(false);

      channel = supabase
        .channel(`event-${cat.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () =>
          reloadAll(cat.id)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes' }, () =>
          reloadAll(cat.id)
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () =>
          reloadAll(cat.id)
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [categoryName, reloadAll]);

  const ranking = computeRanking(athletes, boulders, scores);

  return { category, boulders, athletes, scores, queue, ranking, loading, refresh: reloadAll };
}
