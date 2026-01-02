import { supabase, isSupabaseConfigured } from './supabase';

const SESSION_KEY = 'taskflow_session_user';

export const checkSession = async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        // Cache user info locally for synchronous UI checks if needed, but primarily rely on Supabase
        localStorage.setItem(SESSION_KEY, data.session.user.user_metadata.username || data.session.user.email);
        return true;
    }
    localStorage.removeItem(SESSION_KEY);
    return false;
};

export const register = async (email: string, username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    if (!isSupabaseConfigured) {
        return { success: false, message: 'Configuration Error: VITE_SUPABASE_KEY is missing.' };
    }

    // 1. Check if username exists in profiles
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

    if (existingUser) {
        return { success: false, message: 'Username already taken.' };
    }

    // 2. Sign up
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username } // Store metadata
        }
    });

    if (error) {
        return { success: false, message: error.message };
    }

    if (data.user) {
        // 3. Create Profile Entry
        const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, username, email }
        ]);
        
        if (profileError) {
             console.error("Profile creation failed:", profileError);
             return { success: true, message: 'Account created, but profile sync failed.' };
        }
        return { success: true };
    }

    return { success: false, message: 'Registration failed.' };
};

export const login = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    if (!isSupabaseConfigured) {
        return { success: false, message: 'Configuration Error: VITE_SUPABASE_KEY is missing.' };
    }

    let email = identifier;

    // 1. If identifier is not an email, look it up in profiles
    if (!identifier.includes('@')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        
        if (profile) {
            email = profile.email;
        } else {
            // Username not found, but we proceed to let Supabase fail auth to avoid enumeration attacks 
            // or just return invalid creds.
            return { success: false, message: 'Invalid credentials.' };
        }
    }

    // 2. Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Error:", error);
        return { success: false, message: error.message };
    }

    if (!data.session) {
        return { success: false, message: 'Session could not be established.' };
    }

    // Store username for UI
    const user = data.user;
    const username = user.user_metadata.username || user.email;
    localStorage.setItem(SESSION_KEY, username);

    return { success: true };
};

export const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): string | null => {
    return localStorage.getItem(SESSION_KEY);
};