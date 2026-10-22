import { supabase } from './supabaseClient';

const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function loadCogniWallet() {
  return unwrap(await supabase.rpc('get_cogni_wallet'));
}

export async function loadCogniRewards() {
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [subscriptionResult, workshopResult] = await Promise.all([
    supabase.from('cogni_rewards').select('id,reward_key,reward_type,title,description,points_cost,duration_days').eq('enabled', true).order('points_cost'),
    supabase.from('sessions').select('id,title,description,session_date,start_time,end_time,attendees,max_attendees,reward_points,mentor_id').eq('is_cogni_workshop', true).not('reward_points', 'is', null).gte('session_date', localToday).order('session_date'),
  ]);
  const subscriptions = unwrap(subscriptionResult).map((reward) => ({ ...reward, category: 'subscription' }));
  const workshopRows = unwrap(workshopResult);
  const mentorIds = [...new Set(workshopRows.map((session) => session.mentor_id).filter(Boolean))];
  const mentors = mentorIds.length
    ? unwrap(await supabase.from('profiles').select('id,display_name').in('id', mentorIds))
    : [];
  const mentorNames = new Map(mentors.map((mentor) => [mentor.id, mentor.display_name]));
  const workshops = workshopRows.map((session) => ({
    id: session.id,
    title: session.title,
    description: session.description,
    points_cost: session.reward_points,
    date: session.session_date,
    start_time: session.start_time,
    instructor: mentorNames.get(session.mentor_id) || null,
    seats_left: session.max_attendees == null ? null : Math.max(0, session.max_attendees - session.attendees),
    category: 'workshop',
  }));
  return { subscriptions, workshops };
}

export async function redeemCogniReward(rewardId, requestId) {
  return unwrap(await supabase.rpc('redeem_cogni_reward', {
    p_reward_id: rewardId,
    p_request_id: requestId,
  }));
}
