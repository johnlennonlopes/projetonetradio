// /supabase/functions/create-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, profileData } = await req.json();
    if (!email || !password || !profileData) {
      throw new Error("Email, senha e dados do perfil são obrigatórios.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: isAdmin, error: isAdminError } = await supabaseClient.rpc('is_admin');
    if (isAdminError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) { throw new Error(`Erro no Auth: ${authError.message}`); }
    if (!authData.user) { throw new Error('Não foi possível criar o usuário no Auth.'); }

    const finalProfileData = { id: authData.user.id, ...profileData };

    const { error: profileError } = await supabaseAdmin.from('profiles').insert(finalProfileData);
    
    if (profileError) { throw new Error(`Erro no Perfil: ${profileError.message}`); }

    return new Response(JSON.stringify({ message: 'Usuário criado com sucesso!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }
});