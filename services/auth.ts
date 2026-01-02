import { supabase, isSupabaseConfigured } from './supabase';

const SESSION_KEY = 'taskflow_session_user';
const OFFLINE_MODE_KEY = 'taskflow_offline_mode';

export const checkSession = async (): Promise<boolean> => {
    // 1. Check for real Supabase session
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        localStorage.setItem(SESSION_KEY, data.session.user.user_metadata.username || data.session.user.email || 'User');
        localStorage.removeItem(OFFLINE_MODE_KEY); // Ensure we are not in offline mode
        return true;
    }

    // 2. Check for Local/Offline session
    // If we have a user stored but no Supabase session, we might be in offline mode (unverified email)
    const localUser = localStorage.getItem(SESSION_KEY);
    if (localUser) {
        return true;
    }

    return false;
};

// Helper to ensure profile exists (only works if online)
const createProfile = async (user: any, username: string, email: string) => {
    const { error } = await supabase.from('profiles').insert([
        { id: user.id, username, email }
    ]);
    if (error && !error.message.includes('duplicate key')) {
        console.error("Profile creation failed:", error);
    }
};

const enableOfflineMode = (username: string) => {
    localStorage.setItem(SESSION_KEY, username);
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
};

export const register = async (email: string, username: string, password: string): Promise<{ success: boolean; message?: string; autoLogin?: boolean }> => {
    if (!isSupabaseConfigured) {
        // Fallback for completely unconfigured environment
        enableOfflineMode(username);
        return { success: true, autoLogin: true };
    }

    // 1. Check if username exists (only if online)
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
        options: { data: { username } }
    });

    if (error) {
        // If it's a network error or specific Supabase error, we can optionally fall back to offline
        return { success: false, message: error.message };
    }

    // 3. Handle Login
    // Scenario A: Auto-confirmed or Confirm Email disabled (Ideal)
    if (data.session) {
        await createProfile(data.user, username, email);
        localStorage.setItem(SESSION_KEY, username);
        localStorage.removeItem(OFFLINE_MODE_KEY);
        return { success: true, autoLogin: true };
    }

    // Scenario B: Email confirmation required (User wants to skip this)
    // We enable Offline Mode to let them in immediately.
    if (data.user && !data.session) {
        enableOfflineMode(username);
        return { success: true, autoLogin: true };
    }

    return { success: false, message: 'Registration failed unexpectedly.' };
};

export const login = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Local fallback if no API key
    if (!isSupabaseConfigured) {
        enableOfflineMode(identifier);
        return { success: true };
    }

    let email = identifier;

    // Resolve username to email if needed
    if (!identifier.includes('@')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        
        // If we can't find the user online, check if we want to allow an "offline login" simulation
        // For now, we only allow offline mode if they just registered or failed login specifically due to verification
        if (profile) {
            email = profile.email;
        } else {
             // If username not found online, try local login simulation? 
             // For security, we usually don't, but for this "Free MVP":
             const localUser = localStorage.getItem(SESSION_KEY);
             if (localUser === identifier && localStorage.getItem(OFFLINE_MODE_KEY) === 'true') {
                 return { success: true };
             }
        }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Error:", error);
        // CRITICAL: If login fails because email is not confirmed, we allow Offline Mode access.
        if (error.message.includes("Email not confirmed")) {
             // We need a username to display
             const displayUser = identifier.includes('@') ? identifier.split('@')[0] : identifier;
             enableOfflineMode(displayUser);
             return { success: true }; // Treat as success for the UI
        }
        return { success: false, message: error.message };
    }

    if (data.session) {
        const user = data.user;
        const username = user.user_metadata.username || user.email;
        localStorage.setItem(SESSION_KEY, username);
        localStorage.removeItem(OFFLINE_MODE_KEY);
        return { success: true };
    }

    return { success: false, message: 'Session could not be established.' };
};

export const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(OFFLINE_MODE_KEY);
};

export const getCurrentUser = (): string | null => {
    return localStorage.getItem(SESSION_KEY);
};

export const isOfflineMode = (): boolean => {
    return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
}