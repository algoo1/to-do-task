import { supabase, isSupabaseConfigured } from './supabase';

const SESSION_KEY = 'taskflow_session_user';

export const checkSession = async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        // Cache user info locally for synchronous UI checks if needed, but primarily rely on Supabase
        localStorage.setItem(SESSION_KEY, data.session.user.user_metadata.username || data.session.user.email || 'User');
        return true;
    }
    localStorage.removeItem(SESSION_KEY);
    return false;
};

// Helper to ensure profile exists
const createProfile = async (user: any, username: string, email: string) => {
    const { error } = await supabase.from('profiles').insert([
        { id: user.id, username, email }
    ]);
    if (error) {
        // Ignore duplicate key errors if profile was somehow created by trigger or previous attempt
        if (!error.message.includes('duplicate key')) {
            console.error("Profile creation failed:", error);
        }
    }
};

export const register = async (email: string, username: string, password: string): Promise<{ success: boolean; message?: string; autoLogin?: boolean }> => {
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
            data: { username }
        }
    });

    if (error) {
        return { success: false, message: error.message };
    }

    // 3. Handle Immediate Access
    // Case A: Supabase returns a session immediately (Confirm Email is disabled)
    if (data.session) {
        await createProfile(data.user, username, email);
        localStorage.setItem(SESSION_KEY, username);
        return { success: true, autoLogin: true };
    }

    // Case B: Supabase created user but no session (Confirm Email might be enabled)
    // We attempt to FORCE a login immediately.
    if (data.user && !data.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInData.session) {
            // It worked! (Maybe auto-confirm timing was just tight)
            await createProfile(data.user, username, email);
            localStorage.setItem(SESSION_KEY, username);
            return { success: true, autoLogin: true };
        } else {
            // If sign-in fails here, it's almost certainly because "Confirm Email" is ON in Supabase Dashboard.
            // We return a failure message instructing the developer/user to fix the config.
            return { 
                success: false, 
                message: 'To allow immediate access, please disable "Confirm Email" in your Supabase Dashboard > Authentication > Providers.' 
            };
        }
    }

    return { success: false, message: 'Registration failed unexpectedly.' };
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
            // Username not found
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
        if (error.message.includes("Email not confirmed")) {
             return { success: false, message: 'Please disable "Confirm Email" in Supabase Dashboard to login.' };
        }
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